const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM maintenance_schedules ORDER BY scheduled_date ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM maintenance_schedules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { vehicle_id, service_type, scheduled_date, status, cost_estimate, technician, priority, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO maintenance_schedules (vehicle_id, service_type, scheduled_date, status, cost_estimate, technician, priority, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [vehicle_id, service_type, scheduled_date, status || 'scheduled', cost_estimate, technician, priority || 'medium', notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { vehicle_id, service_type, scheduled_date, status, cost_estimate, technician, priority, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE maintenance_schedules SET vehicle_id=$1, service_type=$2, scheduled_date=$3, status=$4, cost_estimate=$5, technician=$6, priority=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [vehicle_id, service_type, scheduled_date, status, cost_estimate, technician, priority, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM maintenance_schedules WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-predict', auth, async (req, res) => {
  const { vehicle_model, mileage, age_months, last_service, driving_conditions } = req.body;
  try {
    const prompt = `Predict maintenance needs for an electric vehicle:
- Vehicle model: ${vehicle_model}
- Current mileage: ${mileage} miles
- Vehicle age: ${age_months} months
- Last service: ${last_service}
- Driving conditions: ${driving_conditions}

Provide:
1. Upcoming maintenance items with priority levels
2. Estimated costs for each service
3. Optimal maintenance schedule for next 12 months
4. Common issues for this model at this mileage
5. Preventive measures to avoid costly repairs
6. EV-specific maintenance considerations (brake regen, coolant, etc.)`;

    const response = await callOpenRouter(prompt, 'You are a predictive maintenance AI for electric vehicle fleets.');
    res.json({
      prediction: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
