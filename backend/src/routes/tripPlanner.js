const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM trip_plans ORDER BY start_date ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM trip_plans WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, vehicle_id, start_date, end_date, origin, destination, total_distance, daily_budget, total_budget, status, itinerary } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO trip_plans (name, vehicle_id, start_date, end_date, origin, destination, total_distance, daily_budget, total_budget, status, itinerary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, vehicle_id, start_date, end_date, origin, destination, total_distance, daily_budget, total_budget, status || 'planned', JSON.stringify(itinerary || [])]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, vehicle_id, start_date, end_date, origin, destination, total_distance, daily_budget, total_budget, status, itinerary } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE trip_plans SET name=$1, vehicle_id=$2, start_date=$3, end_date=$4, origin=$5, destination=$6, total_distance=$7, daily_budget=$8, total_budget=$9, status=$10, itinerary=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, vehicle_id, start_date, end_date, origin, destination, total_distance, daily_budget, total_budget, status, JSON.stringify(itinerary || []), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM trip_plans WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-plan', auth, async (req, res) => {
  const { origin, destination, duration_days, vehicle_type, budget, preferences } = req.body;
  try {
    const prompt = `Create a detailed day-by-day EV trip plan:
- Origin: ${origin}
- Destination: ${destination}
- Duration: ${duration_days} days
- Vehicle type: ${vehicle_type}
- Total budget: $${budget}
- Preferences: ${preferences}

Provide a day-by-day itinerary including:
1. Daily driving segments with distances
2. Charging stops (location, duration, estimated cost)
3. Daily energy consumption and costs
4. Recommended stops and activities
5. Overnight charging locations
6. Daily budget breakdown (charging, food, accommodation)
7. Contingency plans for range anxiety scenarios
8. Total trip cost summary`;

    const response = await callOpenRouter(prompt, 'You are an EV travel planning expert who creates detailed, practical trip itineraries.');
    res.json({
      plan: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
