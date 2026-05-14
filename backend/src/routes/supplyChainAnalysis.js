// Supply chain analysis: understand EV supply constraints, lead times,
// component sourcing.
const router = require('express').Router();
const auth = require('../middleware/auth');

const LEAD_TIMES = {
  battery_cell: { typical_weeks: 18, risk: 'high', mitigations: ['multi-supplier', 'second-life'] },
  silicon_chips: { typical_weeks: 22, risk: 'high', mitigations: ['order_early', 'less_optioned_trims'] },
  rare_earth_magnets: { typical_weeks: 14, risk: 'medium', mitigations: ['alt_motor_designs'] },
  l2_charger: { typical_weeks: 6, risk: 'low', mitigations: [] },
  dcfc_charger: { typical_weeks: 24, risk: 'high', mitigations: ['pre_order'] },
};

// GET /api/supply-chain-analysis/leadtimes?items=battery_cell,dcfc_charger
router.get('/leadtimes', auth, (req, res) => {
  const items = (req.query.items || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!items.length) return res.json({ catalog: LEAD_TIMES });
  const result = {};
  for (const i of items) if (LEAD_TIMES[i]) result[i] = LEAD_TIMES[i];
  return res.json({ items: result });
});

module.exports = router;
