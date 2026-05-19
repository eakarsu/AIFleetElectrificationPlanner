// Driver engagement: in-vehicle coaching for range-maximising driving.
const router = require('express').Router();
const auth = require('../middleware/auth');

// POST /api/driver-engagement/score { driver_id, samples:[{speed_kph, accel_g, brake_g, regen_kwh, range_mi}] }
router.post('/score', auth, (req, res) => {
  const { driver_id, samples = [] } = req.body || {};
  if (!driver_id || !samples.length) return res.status(400).json({ error: 'driver_id + samples[] required' });
  let efficiencyScore = 100;
  const tips = new Set();
  for (const s of samples.slice(0, 1000)) {
    if (Math.abs(Number(s.accel_g || 0)) > 0.25) { efficiencyScore -= 1; tips.add('avoid hard acceleration'); }
    if (Math.abs(Number(s.brake_g || 0)) > 0.3) { efficiencyScore -= 1; tips.add('anticipate stops earlier — use regen'); }
    if (Number(s.speed_kph || 0) > 110) { efficiencyScore -= 0.5; tips.add('reduce highway speed to <100 km/h for max range'); }
  }
  efficiencyScore = Math.max(0, Math.round(efficiencyScore));
  return res.json({ driver_id, samples: samples.length, efficiency_score: efficiencyScore, coaching_tips: Array.from(tips) });
});

module.exports = router;
