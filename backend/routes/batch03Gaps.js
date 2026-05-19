// ============================================================
// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated Gap-feature endpoints (lean v0).
// TODO: configure credentials (set OPENROUTER_API_KEY).
// ============================================================
const express = require('express');
const router = express.Router();

let _gfReady = false;
async function ensureGapTable(pool) {
  if (_gfReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      user_id INT,
      input JSONB,
      output JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _gfReady = true;
  } catch (_) { /* tolerant of missing DB */ }
}

async function callAI(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'AI service unavailable. Set OPENROUTER_API_KEY (TODO: configure credentials).' };
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: r.ok, status: r.status, text, raw: data };
  } catch (e) {
    return { ok: false, status: 500, error: String(e.message || e) };
  }
}

function buildHandler(slug, label, hint) {
  return async (req, res) => {
    const body = req.body || {};
    const userId = req.user?.id || null;
    const prompt = `Feature: ${label}\nContext hint: ${hint}\nUser input:\n${JSON.stringify(body, null, 2)}\n\nProduce a concise, actionable response.`;
    const ai = await callAI(prompt);
    try {
      const pool = req.app.locals.pool || req.app.get('pool') || null;
      if (pool) {
        await ensureGapTable(pool);
        await pool.query('INSERT INTO gap_features(slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
          [slug, userId, body, { text: ai.text || ai.error || null }]);
      }
    } catch (_) { /* tolerant */ }
    if (!ai.ok) return res.status(ai.status || 500).json({ error: ai.error || ai.text || `Upstream error (${ai.status})`, slug });
    res.json({ slug, label, result: ai.text });
  };
}

router.post('/gap-ai-surface-is-currently-thin-9-endpoints-across-files-mi', buildHandler('gap-ai-ai-surface-is-currently-thin-9-endpoints-across-files-mi', 'AI surface is currently thin (9 endpoints across files) — mi', 'AI surface is currently thin (9 endpoints across files) — missing TCO optimiser, charging-network planner, route-range optimiser, driver-training recommender, predictive maintenance, carbon-impact cal'));
router.post('/gap-no-real-time-telematics-agent', buildHandler('gap-ai-no-real-time-telematics-agent', 'No real-time telematics agent', 'No real-time telematics agent'));
router.post('/gap-no-supplier-quote-integration-vehicle-charger', buildHandler('gap-non-no-supplier-quote-integration-vehicle-charger', 'No supplier-quote integration (vehicle/charger)', 'No supplier-quote integration (vehicle/charger)'));
router.post('/gap-no-permit-regulatory-filing-automation', buildHandler('gap-non-no-permit-regulatory-filing-automation', 'No permit / regulatory filing automation', 'No permit / regulatory filing automation'));
router.post('/gap-no-grant-incentive-tracker-federal-state-rebates', buildHandler('gap-non-no-grant-incentive-tracker-federal-state-rebates', 'No grant / incentive tracker (federal/state rebates)', 'No grant / incentive tracker (federal/state rebates)'));
router.post('/gap-no-standalone-driver-management-module', buildHandler('gap-non-no-standalone-driver-management-module', 'No standalone driver-management module', 'No standalone driver-management module'));
router.post('/gap-no-uptime-availability-tracker', buildHandler('gap-non-no-uptime-availability-tracker', 'No uptime / availability tracker', 'No uptime / availability tracker'));
router.post('/gap-no-webhooks-for-telematics-push', buildHandler('gap-non-no-webhooks-for-telematics-push', 'No webhooks for telematics push', 'No webhooks for telematics push'));
router.post('/gap-no-file-upload-module', buildHandler('gap-non-no-file-upload-module', 'No file upload module', 'No file upload module'));

module.exports = router;
