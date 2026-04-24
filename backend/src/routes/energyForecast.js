const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM energy_forecasts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM energy_forecasts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, period, fleet_size, total_kwh, peak_demand_kw, off_peak_kwh, cost_estimate, renewable_percentage, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO energy_forecasts (name, period, fleet_size, total_kwh, peak_demand_kw, off_peak_kwh, cost_estimate, renewable_percentage, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, period, fleet_size, total_kwh, peak_demand_kw, off_peak_kwh, cost_estimate, renewable_percentage, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, period, fleet_size, total_kwh, peak_demand_kw, off_peak_kwh, cost_estimate, renewable_percentage, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE energy_forecasts SET name=$1, period=$2, fleet_size=$3, total_kwh=$4, peak_demand_kw=$5, off_peak_kwh=$6, cost_estimate=$7, renewable_percentage=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, period, fleet_size, total_kwh, peak_demand_kw, off_peak_kwh, cost_estimate, renewable_percentage, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM energy_forecasts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-forecast', auth, async (req, res) => {
  const { fleet_size, vehicle_types, daily_usage_pattern, season, region } = req.body;
  try {
    const prompt = `Forecast energy consumption for an EV fleet:
- Fleet size: ${fleet_size} vehicles
- Vehicle types: ${vehicle_types}
- Daily usage pattern: ${daily_usage_pattern}
- Season: ${season}
- Region: ${region}

Provide:
1. Daily, weekly, and monthly energy consumption forecast (kWh)
2. Peak demand analysis and time-of-use optimization
3. Seasonal variation factors
4. Grid impact assessment
5. Renewable energy integration opportunities
6. Cost optimization through smart charging schedules
7. Demand response participation potential`;

    const response = await callOpenRouter(prompt, 'You are an energy management specialist for EV fleets.');
    res.json({
      forecast: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
