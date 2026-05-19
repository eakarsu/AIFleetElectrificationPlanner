const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

// Ensure ai_analyses table exists
const ensureTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_analyses (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      analysis_type VARCHAR(100),
      content TEXT,
      model VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

// POST /api/routes/:id/ev-feasibility — route EV feasibility analysis
router.post('/:id/ev-feasibility', auth, async (req, res) => {
  const pool = req.app.locals.pool;
  const routeId = parseInt(req.params.id);

  try {
    await ensureTable(pool);

    // Fetch route record
    const routeResult = await pool.query('SELECT * FROM route_plans WHERE id = $1', [routeId]);
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    const route = routeResult.rows[0];

    // Fetch all charging stations for context
    const stationsResult = await pool.query('SELECT name, location, charger_type, power_kw, num_ports, status FROM charging_stations ORDER BY created_at DESC');
    const chargingStations = stationsResult.rows;

    const systemPrompt = `You are an EV fleet route planning expert. Analyze routes for electric vehicle feasibility considering distance, charging infrastructure, and operational requirements.`;

    const prompt = `Analyze this route for EV feasibility:

Route Details:
- Name: ${route.name}
- Origin: ${route.origin}
- Destination: ${route.destination}
- Distance: ${route.distance_miles || 'Unknown'} miles
- Estimated Duration: ${route.estimated_duration || 'Unknown'}
- Stops: ${route.stops ? JSON.stringify(route.stops) : 'None defined'}
- Status: ${route.status}

Charging Infrastructure in Database (${chargingStations.length} stations):
${chargingStations.length > 0 ? JSON.stringify(chargingStations, null, 2) : 'No charging stations recorded in system'}

Provide a comprehensive EV feasibility analysis including:
1. Suitable EV models for this route (range requirements, payload if applicable)
2. Charging stops needed (estimated locations, charging time)
3. Feasibility Score (1-10, where 10 = fully feasible with current infrastructure)
4. Infrastructure gaps that need to be addressed
5. Estimated energy consumption and cost per trip
6. Recommendations for making the route fully EV-compatible`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const content = response.choices?.[0]?.message?.content || 'No response generated';
    const model = response.model || 'unknown';

    // Persist to ai_analyses
    const saved = await pool.query(
      'INSERT INTO ai_analyses (entity_type, entity_id, analysis_type, content, model) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['route', routeId, 'ev_feasibility_analysis', content, model]
    );

    res.json({
      success: true,
      route: { id: route.id, name: route.name, origin: route.origin, destination: route.destination, distance_miles: route.distance_miles },
      chargingStationsConsidered: chargingStations.length,
      feasibilityAnalysis: content,
      analysisId: saved.rows[0].id,
      model
    });
  } catch (err) {
    console.error('Route EV Feasibility Error:', err);
    res.status(500).json({ error: 'Failed to analyze route feasibility', details: err.message });
  }
});

module.exports = router;
