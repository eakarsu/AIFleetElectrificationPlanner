'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const express = require('express');
const F = require('../src/routes/wave35Features');
const createTasksRouter = require('../src/routes/tasks').createTasksRouter;
test('wave35 helpers: search/filter, export preserves false/0, AI fallback labelled', async () => {
  const store = F.createStore();
  const a = F.createTask(store, 'u1', { title: 'Alpha check', priority: 'high' });
  F.createTask(store, 'u1', { title: 'Beta review', status: 'done', completed: true });
  F.createTask(store, 'u2', { title: 'Alpha other user' });
  assert.equal(F.listTasks(store, 'u1', { q: 'alpha' }).length, 1);
  assert.equal(F.listTasks(store, 'u1', { status: 'done' }).length, 1);
  assert.equal(a.completed, false);
  const csv = F.toCSV(F.listTasks(store, 'u1', {})); assert.match(csv, /completed/); assert.match(csv, /false/);
  const js = JSON.parse(F.serializeExport([], 'json').body); assert.equal(js.count, 0); assert.deepEqual(js.data, []);
  const ai = await F.runAi(F.FEATURES[0].key, [], {}, null); assert.equal(ai.aiGenerated, false); assert.match(ai.label, /Deterministic fallback/); assert.equal(ai.sections.summary.total, 0); assert.deepEqual(ai.sections.topItems, []);
});
test('wave35 tasks API: auth, create/list/update, search/filter, export, AI', async () => {
  const auth = (req, res, next) => req.headers['x-user'] ? (req.user = { id: req.headers['x-user'] }, next()) : res.status(401).json({ error: 'unauthorized' });
  const app = express(); app.use(express.json()); app.use('/api/tasks', createTasksRouter(auth));
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${srv.address().port}/api/tasks`; const H = { 'Content-Type': 'application/json', 'x-user': 'u1' };
  try {
    assert.equal((await fetch(base)).status, 401);
    const created = await (await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ title: 'First task' }) })).json();
    assert.equal(created.title, 'First task'); assert.equal(created.completed, false);
    assert.equal((await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({}) })).status, 400);
    const upd = await (await fetch(`${base}/${created.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ status: 'done', completed: true }) })).json(); assert.equal(upd.status, 'done');
    assert.equal((await (await fetch(`${base}?q=first`, { headers: H })).json()).count, 1);
    assert.equal((await (await fetch(`${base}?q=nomatch`, { headers: H })).json()).count, 0);
    const csv = await (await fetch(`${base}/export?format=csv`, { headers: H })).text(); assert.match(csv, /First task/);
    const json = await (await fetch(`${base}/export?format=json`, { headers: H })).json(); assert.equal(json.count, 1);
    for (const f of F.FEATURES) { const ai = await (await fetch(`${base}/ai/${f.key}`, { method: 'POST', headers: H, body: '{}' })).json(); assert.equal(ai.aiGenerated, false); assert.ok(ai.sections); }
    assert.equal((await fetch(`${base}/ai/unknown`, { method: 'POST', headers: H, body: '{}' })).status, 404);
  } finally { srv.close(); }
});
