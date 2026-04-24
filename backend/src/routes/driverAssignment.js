const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM driver_assignments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM driver_assignments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { driver_name, vehicle_id, route_id, shift_start, shift_end, status, efficiency_score, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO driver_assignments (driver_name, vehicle_id, route_id, shift_start, shift_end, status, efficiency_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [driver_name, vehicle_id, route_id, shift_start, shift_end, status || 'assigned', efficiency_score, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { driver_name, vehicle_id, route_id, shift_start, shift_end, status, efficiency_score, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE driver_assignments SET driver_name=$1, vehicle_id=$2, route_id=$3, shift_start=$4, shift_end=$5, status=$6, efficiency_score=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [driver_name, vehicle_id, route_id, shift_start, shift_end, status, efficiency_score, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM driver_assignments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-optimize', auth, async (req, res) => {
  const { drivers, vehicles, routes, preferences } = req.body;
  try {
    const prompt = `Optimize driver-vehicle assignments for an EV fleet:
- Available drivers: ${drivers}
- Available vehicles: ${vehicles}
- Routes to cover: ${routes}
- Preferences/constraints: ${preferences}

Provide:
1. Optimal driver-vehicle-route assignments
2. Reasoning for each assignment
3. Efficiency score predictions
4. Schedule optimization suggestions
5. Fatigue management considerations
6. Training recommendations for drivers new to EVs`;

    const response = await callOpenRouter(prompt, 'You are a fleet operations optimizer specializing in driver-vehicle matching for EV fleets.');
    res.json({
      optimization: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
