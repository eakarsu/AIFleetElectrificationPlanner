// Financing options: lease vs. buy analysis, residual value forecasting.
const router = require('express').Router();
const auth = require('../middleware/auth');

// POST /api/financing-options/lease-vs-buy { price, years, finance_rate_pct, lease_apr_pct, lease_residual_pct }
router.post('/lease-vs-buy', auth, (req, res) => {
  const b = req.body || {};
  const price = Number(b.price);
  const years = Number(b.years || 5);
  const months = years * 12;
  const fr = Number(b.finance_rate_pct || 7) / 100 / 12;
  const lr = Number(b.lease_apr_pct || 5) / 100 / 12;
  const residPct = Number(b.lease_residual_pct || 0.55);
  if (!price) return res.status(400).json({ error: 'price required' });

  // Buy: total interest over loan term
  const buyMonthly = (price * fr) / (1 - Math.pow(1 + fr, -months));
  const buyTotal = buyMonthly * months;
  // Lease: capitalised cost - residual + finance + tax (simplified)
  const residual = price * residPct;
  const leaseMonthly = ((price - residual) / months) + ((price + residual) * lr);
  const leaseTotal = leaseMonthly * months;

  return res.json({
    inputs: b,
    buy: { monthly: Math.round(buyMonthly), total: Math.round(buyTotal), residual_estimate: Math.round(residual) },
    lease: { monthly: Math.round(leaseMonthly), total: Math.round(leaseTotal), assumed_residual_pct: residPct },
    recommendation: leaseTotal < buyTotal - residual ? 'lease' : 'buy',
  });
});

module.exports = router;
