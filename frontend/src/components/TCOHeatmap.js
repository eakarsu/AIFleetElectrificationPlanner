import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function TCOHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    fetch(`${API_BASE}/custom-views/tco-heatmap`, {
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }
    })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(setData)
      .catch(e => setErr(String(e)));
  }, []);

  if (err) return <div style={{ padding: 12, color: '#b91c1c' }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12, color: '#64748b' }}>Loading TCO heatmap…</div>;

  const { years, vehicles, min_tco_k, max_tco_k } = data;

  function cellColor(v) {
    const t = (v - min_tco_k) / Math.max(1, max_tco_k - min_tco_k);
    const clamped = Math.max(0, Math.min(1, t));
    // green (low) -> red (high)
    const r = Math.round(34 + clamped * (220 - 34));
    const g = Math.round(197 - clamped * (197 - 38));
    const b = Math.round(94 - clamped * (94 - 38));
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h3 style={{ marginTop: 0, color: '#0f172a' }}>TCO Heatmap (Vehicle × Year)</h3>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
        Total cost of ownership per vehicle per year ({data.currency}).
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 2, width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 6, color: '#475569' }}>Vehicle</th>
              {years.map(y => <th key={y} style={{ padding: 6, color: '#475569' }}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.vehicle_id}>
                <td style={{ padding: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {v.vehicle} <span style={{ color: '#64748b', fontWeight: 400 }}>({v.type})</span>
                </td>
                {v.cells.map(c => (
                  <td key={c.year}
                      title={`${v.vehicle} ${c.year}: $${c.tco_k}k`}
                      style={{
                        background: cellColor(c.tco_k),
                        color: 'white',
                        textAlign: 'center',
                        padding: '10px 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                        minWidth: 50
                      }}>
                    {c.tco_k}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
        <span>Lower</span>
        <div style={{
          width: 140, height: 10,
          background: 'linear-gradient(to right, rgb(34,197,94), rgb(220,38,38))',
          borderRadius: 4
        }} />
        <span>Higher TCO</span>
      </div>
    </div>
  );
}
