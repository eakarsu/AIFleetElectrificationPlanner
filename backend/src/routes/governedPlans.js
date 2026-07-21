'use strict';
const express = require('express');
const authenticate = require('../middleware/auth');
const { evaluateElectrificationPlan } = require('../domain/electrificationPlan');
const router = express.Router();
const PROVIDERS = new Set(['telematics', 'fleet', 'utility', 'gis', 'charging-network', 'procurement', 'finance']);

function context(req) {
  const actor = String(req.user?.id || req.user?.sub || '');
  if (!actor) return null;
  return { actor, tenant: String(req.user.tenantId || req.user.tenant_id || `user:${actor}`), role: req.user.role || 'planner' };
}
function key(req) { const value = req.get('Idempotency-Key'); return value && value.length <= 128 ? value : null; }
async function event(client, ctx, caseId, type, details = {}) {
  await client.query('INSERT INTO governed_case_events(tenant_id,case_id,actor_id,event_type,details) VALUES($1,$2,$3,$4,$5)', [ctx.tenant, caseId, ctx.actor, type, details]);
}

router.use(authenticate);
router.post('/integrations/:outboxId/result', async (req,res,next) => { try {
  const ctx=context(req); if (!['integration_worker','admin'].includes(ctx.role)) return res.status(403).json({ error:'integration worker role required' });
  if (!['delivered','failed'].includes(req.body.status)) return res.status(422).json({ error:'status must be delivered or failed' });
  const failure=String(req.body.error||'').slice(0,1000); const result=await req.app.locals.pool.query(`UPDATE integration_outbox SET status=CASE WHEN $1='delivered' THEN 'delivered' WHEN attempts+1>=5 THEN 'dead_letter' ELSE 'failed' END,attempts=attempts+1,last_error=CASE WHEN $1='failed' THEN $2 ELSE NULL END,next_attempt_at=NOW()+(INTERVAL '1 minute'*LEAST(60,POWER(2,attempts))),updated_at=NOW() WHERE id=$3 AND tenant_id=$4 AND status IN ('queued','processing','failed') RETURNING *`,[req.body.status,failure,req.params.outboxId,ctx.tenant]);
  if(!result.rowCount)return res.status(409).json({error:'outbox item is missing or terminal'});res.json(result.rows[0]);
} catch(error){next(error);} });
router.get('/', async (req, res, next) => { try {
  const ctx = context(req); const result = await req.app.locals.pool.query('SELECT * FROM governed_cases WHERE tenant_id=$1 AND workflow_type=$2 ORDER BY updated_at DESC LIMIT 100', [ctx.tenant, 'fleet-electrification']); res.json(result.rows);
} catch (error) { next(error); } });
router.post('/', async (req, res, next) => {
  const ctx = context(req); const idempotencyKey = key(req);
  if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key is required (max 128 characters)' });
  const evaluation = evaluateElectrificationPlan(req.body.input);
  if (evaluation.errors.length) return res.status(422).json(evaluation);
  const provenance = req.body.provenance;
  if (!Array.isArray(provenance) || !provenance.length) return res.status(422).json({ error: 'at least one provenance record is required' });
  const client = await req.app.locals.pool.connect();
  try { await client.query('BEGIN');
    const inserted = await client.query(`INSERT INTO governed_cases(tenant_id,workflow_type,input,result,assumptions,uncertainty,provenance,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET updated_at=governed_cases.updated_at RETURNING *`, [ctx.tenant, 'fleet-electrification', req.body.input, evaluation.result, evaluation.assumptions, evaluation.uncertainty, provenance, ctx.actor, idempotencyKey]);
    await event(client, ctx, inserted.rows[0].id, 'evaluated', { idempotencyKey }); await client.query('COMMIT'); res.status(201).json(inserted.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
});
router.post('/:id/submit', async (req, res, next) => { try {
  const ctx = context(req); const result = await req.app.locals.pool.query(`UPDATE governed_cases SET status='submitted',version=version+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='draft' AND version=$3 RETURNING *`, [req.params.id, ctx.tenant, Number(req.body.version)]);
  if (!result.rowCount) return res.status(409).json({ error: 'case is missing, stale, or not draft' }); await event(req.app.locals.pool, ctx, req.params.id, 'submitted'); res.json(result.rows[0]);
} catch (error) { next(error); } });
router.post('/:id/decision', async (req, res, next) => { try {
  const ctx = context(req); if (!['fleet_engineer','manager','admin'].includes(ctx.role)) return res.status(403).json({ error: 'fleet engineering approval role required' });
  if (!['approved','rejected'].includes(req.body.decision) || !String(req.body.note || '').trim()) return res.status(422).json({ error: 'decision and approval note are required' });
  const result = await req.app.locals.pool.query(`UPDATE governed_cases SET status=$1,approved_by=$2,approval_note=$3,version=version+1,updated_at=NOW() WHERE id=$4 AND tenant_id=$5 AND status='submitted' AND version=$6 AND created_by<>$2 RETURNING *`, [req.body.decision, ctx.actor, req.body.note, req.params.id, ctx.tenant, Number(req.body.version)]);
  if (!result.rowCount) return res.status(409).json({ error: 'stale/not submitted, or four-eyes approval failed' }); await event(req.app.locals.pool, ctx, req.params.id, req.body.decision, { note: req.body.note }); res.json(result.rows[0]);
} catch (error) { next(error); } });
router.post('/:id/integrations', async (req, res, next) => { try {
  const ctx = context(req); const idempotencyKey = key(req); if (!idempotencyKey || !PROVIDERS.has(req.body.provider)) return res.status(422).json({ error: 'allowed provider and Idempotency-Key are required' });
  const owned = await req.app.locals.pool.query("SELECT id FROM governed_cases WHERE id=$1 AND tenant_id=$2 AND status='approved'", [req.params.id, ctx.tenant]); if (!owned.rowCount) return res.status(409).json({ error: 'approved case required' });
  const queued = await req.app.locals.pool.query(`INSERT INTO integration_outbox(tenant_id,case_id,provider,operation,payload,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET updated_at=integration_outbox.updated_at RETURNING *`, [ctx.tenant, req.params.id, req.body.provider, req.body.operation || 'export', req.body.payload || {}, idempotencyKey]); res.status(202).json(queued.rows[0]);
} catch (error) { next(error); } });

module.exports = router;
