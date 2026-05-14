// Agentic fleet manager: NL input → TCO, vehicle models, charging, timeline.
const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

// POST /api/agentic-fleet-manager/plan { current_fleet:{diesel_count,total_miles_year}, budget_usd, horizon_years }
router.post('/plan', auth, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.current_fleet) return res.status(400).json({ error: 'current_fleet required' });
    const system = 'You are a fleet electrification consultant. Output JSON {"tco_summary":{"5y_diesel_usd":n,"5y_ev_usd":n,"savings_usd":n},"vehicle_models":[{"oem":"...","model":"...","range_mi":int,"price_usd":n}],"charging_infra":{"l2_chargers":int,"dcfc_chargers":int,"site_cost_usd":n},"timeline":[{"year":int,"actions":["..."]}]}.';
    let parsed;
    try {
      const raw = await callOpenRouter(system, JSON.stringify(body));
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }
    return res.json({ inputs: body, plan: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'plan failed' });
  }
});

module.exports = router;
