const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM charging_stations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM charging_stations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, location, latitude, longitude, charger_type, power_kw, num_ports, status, cost_per_kwh, network } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO charging_stations (name, location, latitude, longitude, charger_type, power_kw, num_ports, status, cost_per_kwh, network)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, location, latitude, longitude, charger_type, power_kw, num_ports, status || 'available', cost_per_kwh, network]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, location, latitude, longitude, charger_type, power_kw, num_ports, status, cost_per_kwh, network } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE charging_stations SET name=$1, location=$2, latitude=$3, longitude=$4, charger_type=$5, power_kw=$6, num_ports=$7, status=$8, cost_per_kwh=$9, network=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, location, latitude, longitude, charger_type, power_kw, num_ports, status, cost_per_kwh, network, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM charging_stations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-recommend', auth, async (req, res) => {
  const { fleet_size, daily_miles, location, budget } = req.body;
  try {
    const prompt = `Recommend optimal charging infrastructure for an EV fleet:
- Fleet size: ${fleet_size} vehicles
- Average daily miles per vehicle: ${daily_miles}
- Location/Region: ${location}
- Infrastructure budget: $${budget}

Analyze and recommend:
1. Number and types of chargers needed (Level 2, DC Fast)
2. Optimal placement strategy
3. Expected energy costs
4. ROI timeline
5. Smart charging schedule recommendations`;

    const response = await callOpenRouter(prompt, 'You are an EV charging infrastructure specialist.');
    res.json({
      recommendation: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
