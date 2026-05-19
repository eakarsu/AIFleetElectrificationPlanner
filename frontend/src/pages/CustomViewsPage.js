import React, { useState } from 'react';
import ReplacementScheduleTimeline from '../components/ReplacementScheduleTimeline';
import TCOHeatmap from '../components/TCOHeatmap';
import EVTransitionPlanPDF from '../components/EVTransitionPlanPDF';
import ReplacementRulesEditor from '../components/ReplacementRulesEditor';

const TABS = [
  { key: 'schedule', label: 'Replacement Schedule', kind: 'viz' },
  { key: 'heatmap',  label: 'TCO Heatmap',          kind: 'viz' },
  { key: 'pdf',      label: 'Transition Plan PDF',  kind: 'non-viz' },
  { key: 'rules',    label: 'Replacement Rules',    kind: 'non-viz' }
];

export default function CustomViewsPage() {
  const [active, setActive] = useState('schedule');

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Fleet Views</h2>
        <div style={{ color: '#64748b', fontSize: 13 }}>
          Synthesized fleet-electrification views: replacement scheduling, TCO heatmap, transition plan PDF, and rules editor.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key}
                  data-testid={`tab-${t.key}`}
                  onClick={() => setActive(t.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    background: active === t.key ? '#1e40af' : '#f8fafc',
                    color: active === t.key ? 'white' : '#0f172a',
                    cursor: 'pointer',
                    fontSize: 13
                  }}>
            <span style={{ opacity: 0.7, marginRight: 6, fontSize: 10 }}>[{t.kind}]</span>{t.label}
          </button>
        ))}
      </div>

      <div data-testid="custom-views-content">
        {active === 'schedule' && <ReplacementScheduleTimeline />}
        {active === 'heatmap'  && <TCOHeatmap />}
        {active === 'pdf'      && <EVTransitionPlanPDF />}
        {active === 'rules'    && <ReplacementRulesEditor />}
      </div>
    </div>
  );
}
