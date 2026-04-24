const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM carbon_footprints ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM carbon_footprints WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, vehicle_id, period, ice_emissions_kg, ev_emissions_kg, savings_kg, trees_equivalent, report_type, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO carbon_footprints (name, vehicle_id, period, ice_emissions_kg, ev_emissions_kg, savings_kg, trees_equivalent, report_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, vehicle_id, period, ice_emissions_kg, ev_emissions_kg, savings_kg, trees_equivalent, report_type || 'monthly', notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, vehicle_id, period, ice_emissions_kg, ev_emissions_kg, savings_kg, trees_equivalent, report_type, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE carbon_footprints SET name=$1, vehicle_id=$2, period=$3, ice_emissions_kg=$4, ev_emissions_kg=$5, savings_kg=$6, trees_equivalent=$7, report_type=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, vehicle_id, period, ice_emissions_kg, ev_emissions_kg, savings_kg, trees_equivalent, report_type, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM carbon_footprints WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-calculate', auth, async (req, res) => {
  const { fleet_size, annual_miles, current_fuel_type, region, renewable_percentage } = req.body;
  try {
    const prompt = `Calculate carbon footprint savings from fleet electrification:
- Fleet size: ${fleet_size} vehicles
- Annual miles per vehicle: ${annual_miles}
- Current fuel type: ${current_fuel_type}
- Region: ${region}
- Renewable energy in grid: ${renewable_percentage}%

Provide:
1. Current fleet CO2 emissions (annual)
2. Projected EV fleet emissions (including grid electricity source)
3. Net carbon reduction
4. Equivalent environmental impact (trees planted, homes powered)
5. Carbon credit potential and value
6. Sustainability reporting metrics
7. Year-over-year improvement projections`;

    const response = await callOpenRouter(prompt, 'You are an environmental sustainability analyst specializing in transportation emissions.');
    res.json({
      calculation: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
