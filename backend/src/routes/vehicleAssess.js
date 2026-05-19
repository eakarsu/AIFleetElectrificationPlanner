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

// POST /api/vehicles/:id/assess — per-vehicle AI assessment
router.post('/:id/assess', auth, async (req, res) => {
  const pool = req.app.locals.pool;
  const vehicleId = parseInt(req.params.id);

  try {
    await ensureTable(pool);

    // Fetch vehicle record
    const vehicleResult = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const vehicle = vehicleResult.rows[0];

    // Attempt to fetch maintenance history if table exists
    let maintenanceHistory = [];
    try {
      const maintResult = await pool.query(
        'SELECT * FROM maintenance_records WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 10',
        [vehicleId]
      );
      maintenanceHistory = maintResult.rows;
    } catch (_) {
      // maintenance_records table may not exist — proceed without it
    }

    const systemPrompt = `You are an EV fleet transition expert specializing in vehicle lifecycle analysis and total cost of ownership calculations.
    Provide structured, data-driven assessments for fleet electrification decisions.`;

    const prompt = `Assess this ICE vehicle for EV fleet transition:

Vehicle Details:
- Make/Model: ${vehicle.make} ${vehicle.model} (${vehicle.year})
- Type: ${vehicle.type}
- Current Mileage: ${vehicle.current_mileage || 'Unknown'} miles
- Status: ${vehicle.status}
- Fuel Type: ${vehicle.fuel_type || 'ICE/Gasoline'}
- License Plate: ${vehicle.license_plate || 'N/A'}

Maintenance History (last 10 records):
${maintenanceHistory.length > 0 ? JSON.stringify(maintenanceHistory, null, 2) : 'No maintenance history available'}

Provide a comprehensive assessment including:
1. Replacement Priority Score (1-100, where 100 = replace immediately)
2. Recommended EV equivalent model(s) with specs
3. Total Cost of Ownership (TCO) comparison (ICE vs EV over 5 years)
4. Optimal replacement timeline with justification
5. Key risk factors for delaying replacement`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const content = response.choices?.[0]?.message?.content || 'No response generated';
    const model = response.model || 'unknown';

    // Persist to ai_analyses
    const saved = await pool.query(
      'INSERT INTO ai_analyses (entity_type, entity_id, analysis_type, content, model) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['vehicle', vehicleId, 'ev_transition_assessment', content, model]
    );

    res.json({
      success: true,
      vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year },
      assessment: content,
      analysisId: saved.rows[0].id,
      model
    });
  } catch (err) {
    console.error('Vehicle AI Assessment Error:', err);
    res.status(500).json({ error: 'Failed to assess vehicle', details: err.message });
  }
});

module.exports = router;
