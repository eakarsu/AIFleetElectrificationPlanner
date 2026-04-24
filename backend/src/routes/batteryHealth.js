const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM battery_health ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM battery_health WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { vehicle_id, health_percentage, cycles_completed, max_capacity_kwh, current_capacity_kwh, degradation_rate, last_checked, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO battery_health (vehicle_id, health_percentage, cycles_completed, max_capacity_kwh, current_capacity_kwh, degradation_rate, last_checked, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [vehicle_id, health_percentage, cycles_completed, max_capacity_kwh, current_capacity_kwh, degradation_rate, last_checked || new Date(), notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { vehicle_id, health_percentage, cycles_completed, max_capacity_kwh, current_capacity_kwh, degradation_rate, last_checked, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE battery_health SET vehicle_id=$1, health_percentage=$2, cycles_completed=$3, max_capacity_kwh=$4, current_capacity_kwh=$5, degradation_rate=$6, last_checked=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [vehicle_id, health_percentage, cycles_completed, max_capacity_kwh, current_capacity_kwh, degradation_rate, last_checked, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM battery_health WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-predict', auth, async (req, res) => {
  const { vehicle_model, current_health, age_months, mileage, charging_habits, climate } = req.body;
  try {
    const prompt = `Predict battery health and degradation for an EV:
- Vehicle model: ${vehicle_model}
- Current battery health: ${current_health}%
- Vehicle age: ${age_months} months
- Current mileage: ${mileage} miles
- Charging habits: ${charging_habits}
- Climate/Region: ${climate}

Provide:
1. Predicted health at 1, 2, 3, and 5 years from now
2. Estimated remaining useful life
3. Factors accelerating degradation
4. Recommendations to extend battery life
5. Replacement cost estimate and optimal timing
6. Impact on vehicle range over time`;

    const response = await callOpenRouter(prompt, 'You are a battery technology expert specializing in EV battery lifecycle management.');
    res.json({
      prediction: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
