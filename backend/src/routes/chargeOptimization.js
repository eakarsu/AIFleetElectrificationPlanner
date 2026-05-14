// Charge optimization: weather-aware charging scheduling (cheap hours, solar).
const router = require('express').Router();
const auth = require('../middleware/auth');

// POST /api/charge-optimization/plan { vehicles:[{id,soc_pct,capacity_kwh,target_pct,ready_by}], grid_prices:{hour:cents/kwh}, solar_kw_avail:{hour:kw} }
router.post('/plan', auth, async (req, res) => {
  try {
    const { vehicles = [], grid_prices = {}, solar_kw_avail = {} } = req.body || {};
    if (!vehicles.length) return res.status(400).json({ error: 'vehicles required' });
    const plan = vehicles.map(v => {
      const needKwh = Math.max(0, (Number(v.target_pct) - Number(v.soc_pct)) / 100 * Number(v.capacity_kwh || 75));
      const readyHour = v.ready_by ? new Date(v.ready_by).getHours() : 8;
      const slots = Object.keys(grid_prices).map(h => Number(h)).filter(h => h < readyHour).sort((a, b) => grid_prices[a] - grid_prices[b]);
      let remaining = needKwh;
      const schedule = [];
      for (const h of slots) {
        if (remaining <= 0) break;
        const solar = Number(solar_kw_avail[h] || 0);
        const grid = Math.max(0, 11 - solar); // assume 11kW L2 station
        const charge = Math.min(remaining, grid + solar);
        schedule.push({ hour: h, kwh: Math.round(charge * 10) / 10, source: solar > 0 ? 'solar+grid' : 'grid', cost_cents: Math.round(charge * Number(grid_prices[h])) });
        remaining -= charge;
      }
      return { vehicle_id: v.id, needKwh: Math.round(needKwh * 10) / 10, scheduled: needKwh - remaining, schedule };
    });
    return res.json({ vehicles: plan.length, plan });
  } catch (e) {
    return res.status(500).json({ error: 'plan failed' });
  }
});

module.exports = router;
