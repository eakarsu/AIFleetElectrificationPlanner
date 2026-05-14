// Sustainability reporting: ESG reporting of fleet electrification progress.
const router = require('express').Router();
const auth = require('../middleware/auth');

// gCO2/km (rough): diesel passenger 200, diesel HD 800, EV 60 (region-blended)
const EF = { diesel_passenger: 200, diesel_hd: 800, ev: 60 };

// POST /api/sustainability-report/build { period, miles_diesel_passenger, miles_diesel_hd, miles_ev }
router.post('/build', auth, (req, res) => {
  const b = req.body || {};
  const km_to_mi = 0.621371;
  const co2 = {
    diesel_passenger: (Number(b.miles_diesel_passenger || 0) / km_to_mi) * EF.diesel_passenger,
    diesel_hd: (Number(b.miles_diesel_hd || 0) / km_to_mi) * EF.diesel_hd,
    ev: (Number(b.miles_ev || 0) / km_to_mi) * EF.ev,
  };
  const totalKg = (co2.diesel_passenger + co2.diesel_hd + co2.ev) / 1000;
  const avoidedKg = (Number(b.miles_ev || 0) / km_to_mi) * (EF.diesel_passenger - EF.ev) / 1000;
  return res.json({
    period: b.period || null,
    emissions_kg_co2e: { total: Math.round(totalKg), by_class: Object.fromEntries(Object.entries(co2).map(([k, v]) => [k, Math.round(v / 1000)])) },
    avoided_kg_co2e: Math.round(avoidedKg),
    ev_pct_miles: ((Number(b.miles_ev || 0)) / ((Number(b.miles_ev || 0)) + (Number(b.miles_diesel_passenger || 0)) + (Number(b.miles_diesel_hd || 0)) || 1)) * 100,
  });
});

module.exports = router;
