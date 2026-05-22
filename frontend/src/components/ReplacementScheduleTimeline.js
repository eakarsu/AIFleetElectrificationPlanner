import React, { useEffect, useState } from 'react';

const API_BASE = (process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

export default function ReplacementScheduleTimeline() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    fetch(`${API_BASE}/custom-views/replacement-schedule`, {
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
    })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(setData)
      .catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ padding: 12, color: '#b91c1c' }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12, color: '#64748b' }}>Loading replacement schedule…</div>;

  const years = data.timeline_years || [];
  const priColor = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h3 style={{ marginTop: 0, color: '#0f172a' }}>Vehicle Replacement Schedule</h3>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
        Timeline of planned ICE-to-EV replacements ({data.rows.length} vehicles).
      </div>

      {/* Timeline header */}
      <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${years.length}, 1fr)`, gap: 4, marginBottom: 8, fontSize: 11, color: '#475569', fontWeight: 600 }}>
        <div>Vehicle</div>
        {years.map(y => <div key={y} style={{ textAlign: 'center' }}>{y}</div>)}
      </div>

      {data.rows.map((r) => (
        <div key={r.vehicle_id}
             style={{ display: 'grid', gridTemplateColumns: `220px repeat(${years.length}, 1fr)`, gap: 4, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{r.vehicle}</div>
            <div style={{ color: '#64748b', fontSize: 11 }}>{r.type} · {(r.current_mileage || 0).toLocaleString()} mi</div>
          </div>
          {years.map(y => {
            const hit = y === r.replace_year;
            return (
              <div key={y} style={{
                height: 32,
                background: hit ? priColor[r.priority] || '#1e40af' : '#f1f5f9',
                borderRadius: 4,
                color: 'white',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600
              }} title={hit ? `Replace with ${r.target_ev} ($${r.est_cost.toLocaleString()})` : ''}>
                {hit ? `$${(r.est_cost / 1000).toFixed(0)}k` : ''}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#dc2626', borderRadius: 2, marginRight: 4 }} />high priority</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#d97706', borderRadius: 2, marginRight: 4 }} />medium</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#16a34a', borderRadius: 2, marginRight: 4 }} />low</span>
      </div>
    </div>
  );
}
