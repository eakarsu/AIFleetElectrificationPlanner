import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

function authHeaders() {
  const t = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const EMPTY = { vehicle_type: 'Sedan', max_age_years: 8, max_mileage: 120000, target_ev_model: 'Tesla Model 3', priority: 'medium' };

export default function ReplacementRulesEditor() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  function load() {
    fetch(`${API_BASE}/custom-views/rules`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => setRows(d.rows || []))
      .catch(e => setErr(String(e)));
  }

  useEffect(load, []);

  async function save() {
    setErr(null);
    try {
      const url = editingId ? `${API_BASE}/custom-views/rules/${editingId}` : `${API_BASE}/custom-views/rules`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(draft) });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(b.error || `HTTP ${r.status}`);
      }
      setDraft(EMPTY); setEditingId(null); load();
    } catch (e) { setErr(String(e.message || e)); }
  }

  async function remove(id) {
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/custom-views/rules/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      load();
    } catch (e) { setErr(String(e.message || e)); }
  }

  function edit(row) { setEditingId(row.id); setDraft({ ...row }); }
  function cancel() { setEditingId(null); setDraft(EMPTY); }

  function set(k, v) { setDraft(prev => ({ ...prev, [k]: v })); }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h3 style={{ marginTop: 0, color: '#0f172a' }}>Replacement Rules Editor</h3>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
        Define replacement thresholds per vehicle type (age, mileage, target EV model, priority).
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Max Age (yr)</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Max Mileage</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Target EV</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Priority</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{r.vehicle_type}</td>
                <td style={{ padding: 8 }}>{r.max_age_years}</td>
                <td style={{ padding: 8 }}>{Number(r.max_mileage).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{r.target_ev_model}</td>
                <td style={{ padding: 8 }}>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 3, color: 'white',
                    background: r.priority === 'high' ? '#dc2626' : r.priority === 'medium' ? '#d97706' : '#16a34a'
                  }}>{r.priority}</span>
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <button onClick={() => edit(r)} style={{ padding: '4px 8px', marginRight: 6, fontSize: 11, background: '#1e40af', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ padding: '4px 8px', fontSize: 11, background: '#dc2626', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="6" style={{ padding: 12, color: '#64748b', textAlign: 'center' }}>No rules yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{editingId ? `Editing rule #${editingId}` : 'Add new rule'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          <select value={draft.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}
                  style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
            {['Sedan', 'SUV', 'Truck', 'Van', 'Bus'].map(o => <option key={o}>{o}</option>)}
          </select>
          <input type="number" value={draft.max_age_years} onChange={e => set('max_age_years', Number(e.target.value))}
                 placeholder="Max age yr" style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          <input type="number" value={draft.max_mileage} onChange={e => set('max_mileage', Number(e.target.value))}
                 placeholder="Max mileage" style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          <input value={draft.target_ev_model} onChange={e => set('target_ev_model', e.target.value)}
                 placeholder="Target EV" style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }} />
          <select value={draft.priority} onChange={e => set('priority', e.target.value)}
                  style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 }}>
            {['low', 'medium', 'high'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={save}
                  style={{ padding: '6px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 8 }}>
            {editingId ? 'Save' : 'Add Rule'}
          </button>
          {editingId && <button onClick={cancel} style={{ padding: '6px 14px', background: '#64748b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </div>

      {err && <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{err}</div>}
    </div>
  );
}
