import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export default function EVTransitionPlanPDF() {
  const [form, setForm] = useState({
    org_name: 'Acme Logistics',
    fleet_size: 50,
    target_ev_percent: 80,
    timeline_years: 5,
    budget: 2500000
  });
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function generate() {
    setBusy(true); setErr(null); setResult(null);
    try {
      const t = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/custom-views/transition-plan-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify(form)
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setResult(body);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  }

  function download() {
    if (!result?.pdf_base64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${result.pdf_base64}`;
    link.download = result.filename || 'ev-transition-plan.pdf';
    link.click();
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff' }}>
      <h3 style={{ marginTop: 0, color: '#0f172a' }}>EV Transition Plan PDF</h3>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
        Generate a phased EV-transition plan as a downloadable PDF.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#475569' }}>
          Organization
          <input value={form.org_name} onChange={e => set('org_name', e.target.value)}
                 style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12, color: '#475569' }}>
          Fleet size
          <input type="number" value={form.fleet_size} onChange={e => set('fleet_size', Number(e.target.value))}
                 style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12, color: '#475569' }}>
          Target EV %
          <input type="number" value={form.target_ev_percent} onChange={e => set('target_ev_percent', Number(e.target.value))}
                 style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12, color: '#475569' }}>
          Timeline (years)
          <input type="number" value={form.timeline_years} onChange={e => set('timeline_years', Number(e.target.value))}
                 style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 12, color: '#475569', gridColumn: '1 / span 2' }}>
          Budget (USD)
          <input type="number" value={form.budget} onChange={e => set('budget', Number(e.target.value))}
                 style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, border: '1px solid #cbd5e1', borderRadius: 4 }} />
        </label>
      </div>

      <button onClick={generate} disabled={busy}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Generating…' : 'Generate PDF'}
      </button>

      {err && <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{err}</div>}

      {result && (
        <div style={{ marginTop: 12, padding: 12, background: '#ecfdf5', borderRadius: 4, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{result.filename} · {result.bytes} bytes</div>
          {result.summary && (
            <ul style={{ margin: '6px 0', paddingLeft: 18, color: '#0f172a' }}>
              <li>Phases: {result.summary.phases}</li>
              <li>CO2 reduction: {result.summary.co2_reduction_tons_per_year} t/yr</li>
              <li>Annual savings: ${result.summary.annual_savings_usd?.toLocaleString()}</li>
            </ul>
          )}
          <button onClick={download}
                  style={{ marginTop: 6, padding: '6px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
