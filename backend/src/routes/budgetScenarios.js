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

// POST /api/budget-planning/ai-scenarios — budget scenario modeler
router.post('/ai-scenarios', auth, async (req, res) => {
  const pool = req.app.locals.pool;
  const { budget_range_min, budget_range_max, timeline_years, fleet_size } = req.body;

  if (!budget_range_min || !budget_range_max || !timeline_years || !fleet_size) {
    return res.status(400).json({ error: 'budget_range_min, budget_range_max, timeline_years, and fleet_size are required' });
  }

  try {
    await ensureTable(pool);

    // Fetch current fleet (vehicles)
    const vehiclesResult = await pool.query('SELECT make, model, year, type, current_mileage, status FROM vehicles ORDER BY created_at DESC');
    const vehicles = vehiclesResult.rows;

    // Fetch budget planning records if table exists
    let budgetRecords = [];
    try {
      const budgetResult = await pool.query('SELECT * FROM budget_plans ORDER BY created_at DESC LIMIT 10');
      budgetRecords = budgetResult.rows;
    } catch (_) {
      // budget_plans table may not exist — proceed without it
    }

    const systemPrompt = `You are an expert fleet electrification financial analyst specializing in TCO modeling, carbon reduction strategies, and phased fleet transition planning.
    Generate detailed, realistic electrification scenarios with quantitative projections.`;

    const prompt = `Generate 3 fleet electrification budget scenarios for the following parameters:

Fleet Overview:
- Total Fleet Size (target): ${fleet_size} vehicles
- Current Fleet (${vehicles.length} vehicles on record):
${vehicles.length > 0 ? JSON.stringify(vehicles, null, 2) : 'No vehicles recorded yet'}

Budget Parameters:
- Budget Range: $${budget_range_min} - $${budget_range_max}
- Timeline: ${timeline_years} years

Existing Budget Planning Data:
${budgetRecords.length > 0 ? JSON.stringify(budgetRecords, null, 2) : 'No existing budget plans'}

Generate exactly 3 scenarios:

**SCENARIO 1: CONSERVATIVE**
- Phasing: Minimum risk, replace oldest/highest-mileage vehicles first
- Budget allocation per year
- Total vehicles electrified per year
- 5-year TCO comparison (ICE vs EV)
- Carbon reduction (tons CO2/year)
- Risk profile (low/medium/high) with key risks

**SCENARIO 2: MODERATE**
- Phasing: Balanced approach, mix of vehicle types
- Budget allocation per year
- Total vehicles electrified per year
- 5-year TCO comparison
- Carbon reduction
- Risk profile with key risks

**SCENARIO 3: AGGRESSIVE**
- Phasing: Maximum electrification speed, all-in approach
- Budget allocation per year
- Total vehicles electrified per year
- 5-year TCO comparison
- Carbon reduction
- Risk profile with key risks

For each scenario include: recommended EV models, charging infrastructure investment, break-even timeline, and ROI at end of ${timeline_years}-year period.`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const content = response.choices?.[0]?.message?.content || 'No response generated';
    const model = response.model || 'unknown';

    // Persist to ai_analyses (entity_id null as this is a fleet-level analysis)
    const saved = await pool.query(
      'INSERT INTO ai_analyses (entity_type, entity_id, analysis_type, content, model) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['fleet', null, 'budget_scenario_modeling', content, model]
    );

    res.json({
      success: true,
      parameters: {
        budget_range_min,
        budget_range_max,
        timeline_years,
        fleet_size,
        currentFleetSize: vehicles.length
      },
      scenarios: content,
      analysisId: saved.rows[0].id,
      model
    });
  } catch (err) {
    console.error('Budget Scenario Modeler Error:', err);
    res.status(500).json({ error: 'Failed to generate budget scenarios', details: err.message });
  }
});

module.exports = router;
