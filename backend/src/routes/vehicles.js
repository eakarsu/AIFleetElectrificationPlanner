const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM vehicles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { make, model, year, type, battery_capacity_kwh, range_miles, status, license_plate, vin, current_mileage } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO vehicles (make, model, year, type, battery_capacity_kwh, range_miles, status, license_plate, vin, current_mileage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [make, model, year, type, battery_capacity_kwh, range_miles, status || 'active', license_plate, vin, current_mileage || 0]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { make, model, year, type, battery_capacity_kwh, range_miles, status, license_plate, vin, current_mileage } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE vehicles SET make=$1, model=$2, year=$3, type=$4, battery_capacity_kwh=$5, range_miles=$6, status=$7, license_plate=$8, vin=$9, current_mileage=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [make, model, year, type, battery_capacity_kwh, range_miles, status, license_plate, vin, current_mileage, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-recommend', auth, async (req, res) => {
  const { fleet_size, budget, use_case, region } = req.body;
  try {
    const prompt = `As an EV fleet expert, recommend the best electric vehicles for a fleet with these requirements:
- Fleet size: ${fleet_size} vehicles
- Budget: $${budget}
- Primary use case: ${use_case}
- Region: ${region}

Provide detailed recommendations with specific EV models, estimated costs, range considerations, and charging infrastructure needs. Format as structured recommendations with pros/cons for each option.`;

    const response = await callOpenRouter(prompt, 'You are an expert EV fleet advisor specializing in commercial fleet electrification.');
    const content = response.choices?.[0]?.message?.content || 'No response generated';
    res.json({
      recommendation: content,
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
