import React, { useState, useEffect } from 'react';
import { Sparkles, Send, X, Truck, Map, Zap, DollarSign, Battery, Activity, TrendingUp, Leaf, Wrench, Users, PieChart, Shield, Navigation, BarChart2, MessageCircle } from 'lucide-react';
import api from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const ICONS = {
  'truck': Truck, 'map': Map, 'zap': Zap, 'dollar-sign': DollarSign,
  'battery': Battery, 'activity': Activity, 'trending-up': TrendingUp,
  'leaf': Leaf, 'tool': Wrench, 'users': Users, 'pie-chart': PieChart,
  'shield': Shield, 'navigation': Navigation, 'bar-chart': BarChart2,
  'message-circle': MessageCircle
};

export default function AICenter() {
  const [features, setFeatures] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getAIFeatures().then(setFeatures).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.aiChat({
        feature_id: selectedFeature?.id || 'general-advisor',
        prompt: prompt,
        context: context
      });
      setResult(res);
      setHistory(prev => [...prev, {
        feature: selectedFeature?.name || 'General Advisor',
        prompt: prompt,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={28} style={{ color: '#8b5cf6' }} />
            AI Center
          </h2>
          <p>All AI-powered features in one place</p>
        </div>
      </div>

      {/* Feature Selection */}
      <div className="ai-center-grid" style={{ marginBottom: '28px' }}>
        {features.map(f => {
          const Icon = ICONS[f.icon] || Sparkles;
          const isSelected = selectedFeature?.id === f.id;
          return (
            <div
              key={f.id}
              className="ai-feature-card"
              onClick={() => setSelectedFeature(isSelected ? null : f)}
              style={isSelected ? { borderColor: '#8b5cf6', background: '#faf5ff' } : {}}
            >
              <div className="ai-feature-icon"><Icon size={22} /></div>
              <h4>{f.name}</h4>
              <p>{f.description}</p>
              {isSelected && <span className="badge badge-active" style={{ marginTop: '8px', display: 'inline-block' }}>Selected</span>}
            </div>
          );
        })}
      </div>

      {/* Chat Interface */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: '#8b5cf6' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
            {selectedFeature ? selectedFeature.name : 'EV Fleet Advisor'} - AI Assistant
          </h3>
          {selectedFeature && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSelectedFeature(null)}
              style={{ marginLeft: 'auto' }}
            >
              <X size={14} /> Clear Selection
            </button>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          <div className="form-group">
            <label>Context (optional)</label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Add any context about your fleet, current situation, constraints..."
              style={{ minHeight: '70px' }}
            />
          </div>

          <div className="form-group">
            <label>Your Question</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={selectedFeature
                  ? `Ask about ${selectedFeature.name.toLowerCase()}...`
                  : 'Ask any question about fleet electrification...'
                }
                style={{ minHeight: '80px', flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Press Ctrl+Enter to send</span>
            <button className="btn btn-ai btn-lg" onClick={handleSend} disabled={loading || !prompt.trim()}>
              {loading ? (
                <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', margin: 0 }} /> Generating...</>
              ) : (
                <><Send size={18} /> Send to AI</>
              )}
            </button>
          </div>

          {loading && (
            <div className="ai-thinking" style={{ marginTop: '20px' }}>
              <div className="ai-thinking-dots">
                <span></span><span></span><span></span>
              </div>
              <span style={{ fontSize: '14px', color: '#64748b' }}>AI is thinking...</span>
            </div>
          )}

          {result && !result.error && (
            <div style={{ marginTop: '20px' }}>
              <AIResponseDisplay result={result} />
            </div>
          )}

          {result?.error && (
            <div className="login-error" style={{ marginTop: '20px' }}>
              Error: {result.error}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: '24px', background: 'white', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>Recent Queries</h3>
          {history.slice().reverse().map((h, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div>
                <span className="ai-badge" style={{ marginRight: '8px', fontSize: '10px' }}>{h.feature}</span>
                {h.prompt.length > 100 ? h.prompt.slice(0, 100) + '...' : h.prompt}
              </div>
              <span style={{ color: 'var(--text-light)', whiteSpace: 'nowrap' }}>{h.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
