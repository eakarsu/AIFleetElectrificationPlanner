const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

router.get('/', auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const [vehicles, routes, stations, budgets, maintenance] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM vehicles'),
      pool.query('SELECT COUNT(*) as count FROM route_plans'),
      pool.query('SELECT COUNT(*) as count FROM charging_stations'),
      pool.query('SELECT COALESCE(SUM(allocated_amount),0) as total, COALESCE(SUM(spent_amount),0) as spent FROM budgets'),
      pool.query("SELECT COUNT(*) as count FROM maintenance_schedules WHERE status = 'scheduled'")
    ]);
    res.json({
      total_vehicles: parseInt(vehicles.rows[0].count),
      total_routes: parseInt(routes.rows[0].count),
      total_stations: parseInt(stations.rows[0].count),
      total_budget: parseFloat(budgets.rows[0].total),
      budget_spent: parseFloat(budgets.rows[0].spent),
      pending_maintenance: parseInt(maintenance.rows[0].count)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-insights', auth, async (req, res) => {
  const { fleet_data, period, focus_areas } = req.body;
  try {
    const prompt = `Analyze fleet electrification performance data and provide insights:
- Fleet data summary: ${fleet_data}
- Analysis period: ${period}
- Focus areas: ${focus_areas}

Provide:
1. Key performance indicators and trends
2. Cost efficiency analysis
3. Energy usage patterns and optimization opportunities
4. Fleet utilization insights
5. Predictive analytics for next quarter
6. Benchmarking against industry standards
7. Top 5 actionable recommendations
8. Risk alerts and areas needing attention`;

    const response = await callOpenRouter(prompt, 'You are a fleet analytics expert providing data-driven insights for EV fleet optimization.');
    res.json({
      insights: response.choices?.[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
