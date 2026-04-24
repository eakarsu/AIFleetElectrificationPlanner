const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM budgets ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT * FROM budgets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, category, allocated_amount, spent_amount, period, fiscal_year, department, status, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `INSERT INTO budgets (name, category, allocated_amount, spent_amount, period, fiscal_year, department, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, category, allocated_amount, spent_amount || 0, period, fiscal_year, department, status || 'active', notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, category, allocated_amount, spent_amount, period, fiscal_year, department, status, notes } = req.body;
  try {
    const result = await req.app.locals.pool.query(
      `UPDATE budgets SET name=$1, category=$2, allocated_amount=$3, spent_amount=$4, period=$5, fiscal_year=$6, department=$7, status=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, category, allocated_amount, spent_amount, period, fiscal_year, department, status, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM budgets WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-optimize', auth, async (req, res) => {
  const { total_budget, fleet_size, priorities, timeline, current_spending } = req.body;
  try {
    const prompt = `Optimize the budget for fleet electrification:
- Total available budget: $${total_budget}
- Fleet size: ${fleet_size} vehicles
- Key priorities: ${priorities}
- Timeline: ${timeline}
- Current annual spending: $${current_spending}

Provide:
1. Optimal budget allocation across categories (vehicles, infrastructure, training, operations)
2. Priority spending recommendations
3. Cost-saving opportunities
4. Financing options (leasing vs buying, grants, incentives)
5. Cash flow projection
6. Risk-adjusted budget scenarios (conservative, moderate, aggressive)
7. ROI timeline for each investment category`;

    const response = await callOpenRouter(prompt, 'You are a financial planning expert for fleet electrification projects.');
    res.json({
      optimization: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
