const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      req.app.locals.pool.query('SELECT * FROM route_plans ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      req.app.locals.pool.query('SELECT COUNT(*) FROM route_plans')
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM route_plans WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, origin, destination, distance_miles, estimated_duration, vehicle_id, stops, status } = req.body;
  if (!name || !origin || !destination) {
    return res.status(400).json({ error: 'name, origin, and destination are required' });
  }
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO route_plans (name, origin, destination, distance_miles, estimated_duration, vehicle_id, stops, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, origin, destination, distance_miles, estimated_duration, vehicle_id, JSON.stringify(stops || []), status || 'planned']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, origin, destination, distance_miles, estimated_duration, vehicle_id, stops, status } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE route_plans SET name=$1, origin=$2, destination=$3, distance_miles=$4, estimated_duration=$5, vehicle_id=$6, stops=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, origin, destination, distance_miles, estimated_duration, vehicle_id, JSON.stringify(stops || []), status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM route_plans WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-optimize', auth, async (req, res) => {
  const { origin, destination, vehicle_type, battery_level, weather_conditions } = req.body;
  try {
    const prompt = `Optimize an EV route with these details:
- Origin: ${origin}
- Destination: ${destination}
- Vehicle type: ${vehicle_type}
- Current battery level: ${battery_level}%
- Weather: ${weather_conditions}

Provide an optimized route plan including:
1. Recommended charging stops with estimated charging times
2. Energy consumption estimates per segment
3. Total trip time with and without charging
4. Alternative routes if available
5. Tips for maximizing range in current conditions`;

    const response = await callOpenRouter(prompt, 'You are an EV route optimization AI that considers battery range, charging infrastructure, and real-time conditions.');
    res.json({
      optimization: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
