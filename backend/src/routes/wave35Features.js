'use strict';
// Wave 35A: deterministic domain helpers for authenticated tasks.
// No provider call is made unless OPENROUTER_API_KEY or OPENAI_API_KEY is set.
const DOMAIN = "fleet electrification";
const FEATURES = [{"key": "ev-readiness", "label": "EV readiness"}, {"key": "charging-priority", "label": "Charging priority"}, {"key": "transition-outlook", "label": "Transition outlook"}];
function hasProvider(env = process.env) { return Boolean(env.OPENROUTER_API_KEY || env.OPENAI_API_KEY); }
function createStore() { return { seq: 0, tasks: [] }; }
function ownerId(req) { return String(req.user?.id ?? req.user?.userId ?? req.user?.email ?? ''); }
function normalizeTask(input = {}, owner = '') {
  const title = String(input.title || '').trim();
  if (!title) { const e = new Error('title is required'); e.status = 400; throw e; }
  return {
    title,
    description: input.description == null ? '' : String(input.description),
    status: String(input.status || 'todo'),
    priority: String(input.priority || 'medium'),
    completed: Boolean(input.completed),
    dueDate: input.dueDate || null,
    ownerId: owner,
  };
}
function createTask(store, owner, input) {
  const task = { id: `task-${++store.seq}`, ...normalizeTask(input, owner), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.tasks.push(task); return task;
}
function updateTask(store, owner, id, patch = {}) {
  const task = store.tasks.find((t) => t.id === id && t.ownerId === owner);
  if (!task) return null;
  if (patch.title !== undefined) task.title = String(patch.title);
  if (patch.description !== undefined) task.description = String(patch.description);
  if (patch.status !== undefined) task.status = String(patch.status);
  if (patch.priority !== undefined) task.priority = String(patch.priority);
  if (patch.completed !== undefined) task.completed = Boolean(patch.completed);
  if (patch.dueDate !== undefined) task.dueDate = patch.dueDate;
  task.updatedAt = new Date().toISOString(); return task;
}
function listTasks(store, owner, filters = {}) {
  const q = String(filters.q || filters.search || '').trim().toLowerCase();
  return store.tasks.filter((t) => t.ownerId === owner)
    .filter((t) => !filters.status || t.status === filters.status)
    .filter((t) => !filters.priority || t.priority === filters.priority)
    .filter((t) => !q || `${t.title} ${t.description} ${t.status} ${t.priority}`.toLowerCase().includes(q));
}
function toCSV(tasks) {
  const headers = ['id','title','description','status','priority','completed','dueDate','createdAt','updatedAt'];
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.join(','), ...tasks.map((t) => headers.map((h) => esc(t[h])).join(','))].join('\n') + '\n';
}
function serializeExport(tasks, format = 'json') {
  if (String(format).toLowerCase() === 'csv') return { contentType: 'text/csv', filename: 'tasks.csv', body: toCSV(tasks) };
  return { contentType: 'application/json', filename: 'tasks.json', body: JSON.stringify({ exportedAt: new Date().toISOString(), count: tasks.length, data: tasks }, null, 2) };
}
function fallback(feature, tasks) {
  const byStatus = {}; const byPriority = {};
  for (const t of tasks) { byStatus[t.status] = (byStatus[t.status] || 0) + 1; byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; }
  const open = tasks.filter((t) => !t.completed);
  // Preserve false/0/empty: counts and flags are emitted even when zero/empty.
  return {
    feature, domain: DOMAIN, aiGenerated: false,
    label: 'Deterministic fallback (no AI provider configured)',
    provider: null,
    sections: {
      summary: { total: tasks.length, open: open.length, completed: tasks.length - open.length, hasRecords: tasks.length > 0 },
      byStatus, byPriority,
      topItems: open.slice(0, 5).map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, completed: false })),
      nextActions: open.length ? open.slice(0, 3).map((t) => `Review: ${t.title}`) : [],
    },
  };
}
async function runAi(feature, tasks, env = process.env, callProvider) {
  if (!FEATURES.some((f) => f.key === feature)) { const e = new Error('Unknown AI feature'); e.status = 404; throw e; }
  if (hasProvider(env) && typeof callProvider === 'function') {
    try { const text = await callProvider(feature, tasks); return { feature, domain: DOMAIN, aiGenerated: true, label: 'AI provider result', provider: env.OPENROUTER_API_KEY ? 'openrouter' : 'openai', sections: { summary: { total: tasks.length }, text: String(text || '') } }; } catch { /* fall through to deterministic fallback */ }
  }
  return fallback(feature, tasks);
}
module.exports = { DOMAIN, FEATURES, hasProvider, createStore, ownerId, createTask, updateTask, listTasks, toCSV, serializeExport, fallback, runAi };
