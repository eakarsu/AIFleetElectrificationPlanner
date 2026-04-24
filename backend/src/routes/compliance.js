const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM compliance_records ORDER BY deadline ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM compliance_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, regulation, jurisdiction, deadline, status, requirement_details, current_progress, penalty_risk, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO compliance_records (name, regulation, jurisdiction, deadline, status, requirement_details, current_progress, penalty_risk, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, regulation, jurisdiction, deadline, status || 'pending', requirement_details, current_progress || 0, penalty_risk, notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, regulation, jurisdiction, deadline, status, requirement_details, current_progress, penalty_risk, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE compliance_records SET name=$1, regulation=$2, jurisdiction=$3, deadline=$4, status=$5, requirement_details=$6, current_progress=$7, penalty_risk=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, regulation, jurisdiction, deadline, status, requirement_details, current_progress, penalty_risk, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM compliance_records WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-check', auth, async (req, res) => {
  const { state, fleet_size, current_ev_percentage, industry, deadlines } = req.body;
  try {
    const prompt = `Analyze regulatory compliance for fleet electrification:
- State/Region: ${state}
- Fleet size: ${fleet_size} vehicles
- Current EV percentage: ${current_ev_percentage}%
- Industry: ${industry}
- Known deadlines: ${deadlines}

Provide:
1. Applicable federal, state, and local EV mandates
2. Current compliance status assessment
3. Upcoming regulatory deadlines
4. Required actions to maintain compliance
5. Available incentives and credits
6. Penalty risk assessment
7. Recommended compliance roadmap`;

    const response = await callOpenRouter(prompt, 'You are a regulatory compliance expert for transportation electrification.');
    res.json({
      analysis: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
