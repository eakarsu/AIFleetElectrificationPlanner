const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM transition_plans ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM transition_plans WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, current_fleet_size, target_ev_percentage, timeline_months, budget, phase, milestones, status } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO transition_plans (name, current_fleet_size, target_ev_percentage, timeline_months, budget, phase, milestones, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, current_fleet_size, target_ev_percentage, timeline_months, budget, phase, JSON.stringify(milestones || []), status || 'draft']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, current_fleet_size, target_ev_percentage, timeline_months, budget, phase, milestones, status } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE transition_plans SET name=$1, current_fleet_size=$2, target_ev_percentage=$3, timeline_months=$4, budget=$5, phase=$6, milestones=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, current_fleet_size, target_ev_percentage, timeline_months, budget, phase, JSON.stringify(milestones || []), status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM transition_plans WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-plan', auth, async (req, res) => {
  const { fleet_size, current_ev_count, budget, timeline, industry } = req.body;
  try {
    const prompt = `Create a comprehensive fleet electrification transition plan:
- Current fleet size: ${fleet_size} vehicles
- Current EV count: ${current_ev_count}
- Available budget: $${budget}
- Desired timeline: ${timeline}
- Industry: ${industry}

Design a phased transition plan including:
1. Phase-by-phase vehicle replacement schedule
2. Priority vehicles for replacement (highest ROI first)
3. Infrastructure buildout timeline
4. Training and change management plan
5. Risk mitigation strategies
6. Key milestones and KPIs
7. Financial projections per phase
8. Regulatory compliance timeline`;

    const response = await callOpenRouter(prompt, 'You are a fleet electrification strategist and transition planning expert.');
    res.json({
      plan: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
