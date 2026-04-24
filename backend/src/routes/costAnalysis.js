const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM cost_analyses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM cost_analyses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, vehicle_id, analysis_type, current_fuel_cost, ev_energy_cost, maintenance_savings, total_tco_ice, total_tco_ev, payback_years, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO cost_analyses (name, vehicle_id, analysis_type, current_fuel_cost, ev_energy_cost, maintenance_savings, total_tco_ice, total_tco_ev, payback_years, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, vehicle_id, analysis_type, current_fuel_cost, ev_energy_cost, maintenance_savings, total_tco_ice, total_tco_ev, payback_years, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, vehicle_id, analysis_type, current_fuel_cost, ev_energy_cost, maintenance_savings, total_tco_ice, total_tco_ev, payback_years, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE cost_analyses SET name=$1, vehicle_id=$2, analysis_type=$3, current_fuel_cost=$4, ev_energy_cost=$5, maintenance_savings=$6, total_tco_ice=$7, total_tco_ev=$8, payback_years=$9, notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, vehicle_id, analysis_type, current_fuel_cost, ev_energy_cost, maintenance_savings, total_tco_ice, total_tco_ev, payback_years, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM cost_analyses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-analyze', auth, async (req, res) => {
  const { vehicle_type, annual_miles, fuel_price, electricity_rate, vehicle_count } = req.body;
  try {
    const prompt = `Perform a comprehensive Total Cost of Ownership (TCO) analysis comparing ICE vs EV:
- Vehicle type: ${vehicle_type}
- Annual miles per vehicle: ${annual_miles}
- Current fuel price: $${fuel_price}/gallon
- Electricity rate: $${electricity_rate}/kWh
- Number of vehicles: ${vehicle_count}

Provide detailed analysis including:
1. Annual fuel vs electricity costs
2. Maintenance cost comparison
3. Insurance differences
4. Depreciation comparison
5. Total 5-year and 10-year TCO
6. Break-even point
7. Government incentives available
8. Net present value analysis`;

    const response = await callOpenRouter(prompt, 'You are a financial analyst specializing in fleet electrification economics.');
    res.json({
      analysis: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
