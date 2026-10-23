'use strict';
const express = require('express');
const F = require('./wave35Features');
async function callProvider(feature, tasks) {
  const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const key = isOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY;
  const url = isOpenRouter ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || (isOpenRouter ? 'anthropic/claude-3-5-sonnet-20241022' : 'gpt-4o-mini');
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: 'user', content: `Domain: ${F.DOMAIN}. Feature: ${feature}. Analyse these tasks and return a concise labelled summary:\n${JSON.stringify(tasks)}` }], max_tokens: 600 }) });
  if (!res.ok) throw new Error(`Provider HTTP ${res.status}`);
  const data = await res.json(); return data.choices?.[0]?.message?.content || '';
}
function createTasksRouter(auth, store = F.createStore()) {
  const router = express.Router();
  router.use(auth);
  router.get('/export', (req, res) => { const tasks = F.listTasks(store, F.ownerId(req), req.query); const out = F.serializeExport(tasks, req.query.format || 'json'); res.setHeader('Content-Type', out.contentType); res.setHeader('Content-Disposition', `attachment; filename=${out.filename}`); res.send(out.body); });
  router.get('/', (req, res) => { const tasks = F.listTasks(store, F.ownerId(req), req.query); res.json({ data: tasks, count: tasks.length }); });
  router.post('/', (req, res) => { try { res.status(201).json(F.createTask(store, F.ownerId(req), req.body || {})); } catch (e) { res.status(e.status || 400).json({ error: e.message }); } });
  router.put('/:id', (req, res) => { const t = F.updateTask(store, F.ownerId(req), req.params.id, req.body || {}); return t ? res.json(t) : res.status(404).json({ error: 'Task not found' }); });
  router.patch('/:id', (req, res) => { const t = F.updateTask(store, F.ownerId(req), req.params.id, req.body || {}); return t ? res.json(t) : res.status(404).json({ error: 'Task not found' }); });
  router.post('/ai/:feature', async (req, res) => { try { const tasks = F.listTasks(store, F.ownerId(req), {}); res.json(await F.runAi(req.params.feature, tasks, process.env, callProvider)); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });
  return router;
}
module.exports = createTasksRouter; module.exports.createTasksRouter = createTasksRouter;
