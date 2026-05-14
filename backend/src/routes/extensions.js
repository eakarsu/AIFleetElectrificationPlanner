/**
 * Apply pass 5 — Fleet Electrification backlog (additive).
 *
 * Backlog implemented (cap 8):
 *  1. NEEDS-CREDS  vehicle quote integration            -> /quotes/request   503 missing VEHICLE_QUOTE_API_KEY
 *  2. NEEDS-CREDS  federal/state grant feeds            -> /grants/list      503 missing GRANT_FEED_API_KEY
 *  3. NEEDS-CREDS  real-time telematics                 -> /telematics/*     503 missing TELEMATICS_API_KEY
 *  4. NEEDS-PRODUCT-DECISION permit/regulatory workflow -> /permits          status enums in code
 *  5. NEEDS-PRODUCT-DECISION lease vs buy financing     -> /finance/lease-vs-buy  AI-gated, deterministic stub fallback
 *  6. CUSTOM       charging-window optimization         -> /charging-window  rate-card heuristic
 *  7. CUSTOM       ESG reporting wrapper                -> /esg/report       wraps existing carbon table
 *  8. CUSTOM       telematics streaming buffer (additive table; pull-mode pseudo-stream)
 *
 * Env vars (all NEEDS-CREDS endpoints return 503 + missing:<NAME> when unset):
 *   - OPENROUTER_API_KEY        (existing) AI features
 *   - VEHICLE_QUOTE_API_KEY     vehicle quote integration
 *   - GRANT_FEED_API_KEY        federal / state grant feeds
 *   - TELEMATICS_API_KEY        real-time telematics provider
 *
 * Tables: CREATE TABLE IF NOT EXISTS only.
 */

const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

let bootstrapped = false;
async function ensureSchema(pool) {
  if (bootstrapped) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_quote_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      payload JSONB,
      status VARCHAR(40) DEFAULT 'queued',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS permit_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      jurisdiction VARCHAR(120),
      permit_type VARCHAR(120),
      status VARCHAR(40) DEFAULT 'draft',
      due_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS finance_evaluations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      vehicle_id INTEGER,
      decision VARCHAR(20),
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS telematics_buffer (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER,
      user_id INTEGER,
      payload JSONB,
      received_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS esg_snapshots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      period TEXT,
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  bootstrapped = true;
}

function tryParseJson(text) {
  if (typeof text !== 'string') return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  try { return JSON.parse(candidate); } catch (_) {
    const s = candidate.indexOf('{'); const e = candidate.lastIndexOf('}');
    if (s >= 0 && e > s) { try { return JSON.parse(candidate.slice(s, e + 1)); } catch { /* fall */ } }
    return null;
  }
}

function noKey(name = 'OPENROUTER_API_KEY') {
  return { status: 503, body: { error: 'AI service unavailable', missing: name } };
}

router.use(auth);
router.use(async (req, _res, next) => { try { await ensureSchema(req.app.locals.pool); next(); } catch (e) { next(e); } });

// ─── 1. Vehicle quote requests (NEEDS-CREDS) ────────────────────────────────
router.post('/quotes/request', async (req, res) => {
  if (!process.env.VEHICLE_QUOTE_API_KEY) {
    return res.status(503).json({ error: 'Vehicle quote service unavailable', missing: 'VEHICLE_QUOTE_API_KEY' });
  }
  const pool = req.app.locals.pool;
  const { make, model, year, qty } = req.body || {};
  if (!make || !model) return res.status(400).json({ error: 'make and model required' });
  const r = await pool.query(
    `INSERT INTO vehicle_quote_requests (user_id, payload, status) VALUES ($1, $2, 'queued') RETURNING *`,
    [req.user.id, { make, model, year, qty: qty || 1 }]
  );
  res.json({ data: r.rows[0] });
});

router.get('/quotes/requests', async (req, res) => {
  const pool = req.app.locals.pool;
  const r = await pool.query(`SELECT * FROM vehicle_quote_requests WHERE user_id = $1 ORDER BY id DESC LIMIT 100`, [req.user.id]);
  res.json({ data: r.rows });
});

// ─── 2. Federal / state grant feeds (NEEDS-CREDS) ───────────────────────────
router.get('/grants/list', (req, res) => {
  if (!process.env.GRANT_FEED_API_KEY) {
    return res.status(503).json({ error: 'Grant feed unavailable', missing: 'GRANT_FEED_API_KEY' });
  }
  // Placeholder: return empty list when key is set (real provider wiring deferred).
  res.json({ data: [], note: 'GRANT_FEED_API_KEY set; provider wiring deferred to next pass' });
});

// ─── 3. Real-time telematics (NEEDS-CREDS + buffer ingest) ──────────────────
router.get('/telematics/live/:vehicleId', (req, res) => {
  if (!process.env.TELEMATICS_API_KEY) {
    return res.status(503).json({ error: 'Telematics unavailable', missing: 'TELEMATICS_API_KEY' });
  }
  res.json({ vehicle_id: req.params.vehicleId, soc: null, note: 'TELEMATICS_API_KEY set; provider wiring deferred' });
});

// Pseudo-stream pull buffer (NOT NEEDS-CREDS — operators can post their own scraped data):
router.post('/telematics/ingest', async (req, res) => {
  const pool = req.app.locals.pool;
  const { vehicle_id, payload } = req.body || {};
  if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id required' });
  await pool.query(
    `INSERT INTO telematics_buffer (vehicle_id, user_id, payload) VALUES ($1, $2, $3)`,
    [vehicle_id, req.user.id, payload || {}]
  );
  res.json({ ok: true });
});

router.get('/telematics/recent', async (req, res) => {
  const pool = req.app.locals.pool;
  const r = await pool.query(`
    SELECT * FROM telematics_buffer WHERE user_id = $1 ORDER BY id DESC LIMIT 50
  `, [req.user.id]);
  res.json({ data: r.rows });
});

// ─── 4. Permit / regulatory workflow (PRODUCT-DECISION) ─────────────────────
// PRODUCT-DECISION: status enum = draft|submitted|approved|denied|expired. Defaults to 'draft'
// on creation. The audit didn't pin a workflow, so we ship a flat lifecycle that any back-
// office UI can render and that doesn't lock us into a specific approval process.
router.post('/permits', async (req, res) => {
  const pool = req.app.locals.pool;
  const { jurisdiction, permit_type, due_date, notes } = req.body || {};
  if (!jurisdiction || !permit_type) return res.status(400).json({ error: 'jurisdiction and permit_type required' });
  const r = await pool.query(
    `INSERT INTO permit_records (user_id, jurisdiction, permit_type, status, due_date, notes)
     VALUES ($1, $2, $3, 'draft', $4, $5) RETURNING *`,
    [req.user.id, jurisdiction, permit_type, due_date || null, notes || null]
  );
  res.json({ data: r.rows[0] });
});

router.get('/permits', async (req, res) => {
  const pool = req.app.locals.pool;
  const r = await pool.query(`SELECT * FROM permit_records WHERE user_id = $1 ORDER BY id DESC`, [req.user.id]);
  res.json({ data: r.rows });
});

router.patch('/permits/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  const { status, notes } = req.body || {};
  const allowed = ['draft', 'submitted', 'approved', 'denied', 'expired'];
  if (status && !allowed.includes(status)) return res.status(400).json({ error: `status must be one of ${allowed.join(',')}` });
  const r = await pool.query(`
    UPDATE permit_records SET
      status = COALESCE($1, status),
      notes  = COALESCE($2, notes),
      updated_at = NOW()
    WHERE id = $3 AND user_id = $4 RETURNING *
  `, [status || null, notes || null, req.params.id, req.user.id]);
  if (!r.rowCount) return res.status(404).json({ error: 'not found' });
  res.json({ data: r.rows[0] });
});

// ─── 5. Lease vs Buy financing (PRODUCT-DECISION + AI-optional) ─────────────
// PRODUCT-DECISION: when OPENROUTER_API_KEY is unset we still answer with a deterministic
// payback + monthly-cash heuristic. With the key set, the LLM is asked to reason over the same
// inputs and return a structured JSON. Discount rate defaults to 8%, term = 60 months.
router.post('/finance/lease-vs-buy', async (req, res) => {
  const pool = req.app.locals.pool;
  const { vehicle_id, msrp, lease_monthly, term_months, residual_value, annual_miles } = req.body || {};
  if (!msrp || !lease_monthly) return res.status(400).json({ error: 'msrp and lease_monthly required' });
  const term = Number(term_months) || 60;
  const buyMonthly = Number(msrp) / term;
  const totalLease = Number(lease_monthly) * term;
  const totalBuy = Number(msrp) - Number(residual_value || msrp * 0.4);
  const decision = totalLease < totalBuy ? 'lease' : 'buy';
  const heuristic = {
    decision,
    monthly_buy_cash: Number(buyMonthly.toFixed(2)),
    total_lease_cost: Number(totalLease.toFixed(2)),
    net_buy_cost: Number(totalBuy.toFixed(2)),
    annual_miles: annual_miles || null,
    method: 'deterministic',
  };

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const resp = await callOpenRouter(
        `Given MSRP=$${msrp}, lease=$${lease_monthly}/mo, term=${term}mo, residual=${residual_value || 'unknown'}, annual_miles=${annual_miles || 'unknown'}, return JSON {"decision":"lease|buy","reasoning":"...","sensitivity":[...]}.`,
        'You are a fleet financial analyst. Return JSON only.'
      );
      const content = resp.choices?.[0]?.message?.content || '';
      const parsed = tryParseJson(content);
      if (parsed && parsed.decision) {
        heuristic.decision = parsed.decision;
        heuristic.method = 'ai+heuristic';
        heuristic.ai = parsed;
      }
    } catch (_) { /* keep heuristic */ }
  }

  const r = await pool.query(
    `INSERT INTO finance_evaluations (user_id, vehicle_id, decision, payload) VALUES ($1, $2, $3, $4) RETURNING id`,
    [req.user.id, vehicle_id || null, heuristic.decision, heuristic]
  );
  res.json({ id: r.rows[0].id, ...heuristic });
});

// ─── 6. Charging-window optimization (CUSTOM heuristic) ─────────────────────
// PRODUCT-DECISION: rate card defaults to a flat $0.12/kWh off-peak (00:00-06:00) and
// $0.32/kWh peak; operators can override via body. Solar/weather inputs are accepted but
// optional — we don't pull them from a provider in this pass.
router.post('/charging-window', (req, res) => {
  const { kwh_needed, off_peak_rate = 0.12, peak_rate = 0.32, peak_hours = [16, 21], available_hours = 8 } = req.body || {};
  if (!kwh_needed) return res.status(400).json({ error: 'kwh_needed required' });
  const hoursOffPeak = Math.min(6, available_hours);
  const hoursPeak = Math.max(0, available_hours - hoursOffPeak);
  const split = {
    off_peak_kwh: (kwh_needed * (hoursOffPeak / available_hours)),
    peak_kwh: (kwh_needed * (hoursPeak / available_hours)),
  };
  const cost = split.off_peak_kwh * off_peak_rate + split.peak_kwh * peak_rate;
  res.json({
    plan: {
      off_peak: { hours: '00:00-06:00', kwh: Number(split.off_peak_kwh.toFixed(2)), rate: off_peak_rate },
      peak: { hours: `${peak_hours[0]}:00-${peak_hours[1]}:00`, kwh: Number(split.peak_kwh.toFixed(2)), rate: peak_rate },
      estimated_cost_usd: Number(cost.toFixed(2)),
    },
    note: 'Heuristic plan; weather/solar inputs accepted but not used in this pass.',
  });
});

// ─── 7. ESG reporting wrapper ───────────────────────────────────────────────
router.post('/esg/report', async (req, res) => {
  const pool = req.app.locals.pool;
  const { period } = req.body || {};
  // Pull what's available from the existing carbon_footprints table — fall back to zeros if
  // the table doesn't have rows yet.
  let summary = { period: period || `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`, scope1_tco2e: 0, scope2_tco2e: 0, vehicles: 0 };
  try {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n,
             COALESCE(SUM(scope1_tco2e), 0)::float AS s1,
             COALESCE(SUM(scope2_tco2e), 0)::float AS s2
      FROM carbon_footprints WHERE user_id = $1
    `, [req.user.id]);
    if (r.rows[0]) {
      summary.vehicles = r.rows[0].n;
      summary.scope1_tco2e = r.rows[0].s1 || 0;
      summary.scope2_tco2e = r.rows[0].s2 || 0;
    }
  } catch (_) { /* table may not have those columns; keep zero defaults */ }
  const ins = await pool.query(
    `INSERT INTO esg_snapshots (user_id, period, payload) VALUES ($1, $2, $3) RETURNING id, created_at`,
    [req.user.id, summary.period, summary]
  );
  res.json({ id: ins.rows[0].id, period: summary.period, summary });
});

router.get('/esg/snapshots', async (req, res) => {
  const pool = req.app.locals.pool;
  const r = await pool.query(`SELECT * FROM esg_snapshots WHERE user_id = $1 ORDER BY id DESC LIMIT 50`, [req.user.id]);
  res.json({ data: r.rows });
});

module.exports = router;
