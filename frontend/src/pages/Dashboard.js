import React, { useState, useEffect } from 'react';
import { Truck, Map, Zap, DollarSign, Battery, Activity, TrendingUp, Leaf, Wrench, Users, PieChart, Shield, Navigation, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ICONS = {
  'truck': Truck, 'map': Map, 'zap': Zap, 'dollar-sign': DollarSign,
  'battery': Battery, 'activity': Activity, 'trending-up': TrendingUp,
  'leaf': Leaf, 'tool': Wrench, 'users': Users, 'pie-chart': PieChart,
  'shield': Shield, 'navigation': Navigation
};

const COLORS = ['blue', 'green', 'purple', 'orange', 'red', 'blue', 'green', 'purple', 'orange', 'red', 'blue', 'green', 'purple'];

export default function Dashboard({ features, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>AI-Powered Fleet Electrification Overview</p>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0ea5e9' }}><Truck size={24} /></div>
            <div><div className="stat-value">{stats.total_vehicles}</div><div className="stat-label">Fleet Vehicles</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}><Map size={24} /></div>
            <div><div className="stat-value">{stats.total_routes}</div><div className="stat-label">Active Routes</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><Zap size={24} /></div>
            <div><div className="stat-value">{stats.total_stations}</div><div className="stat-label">Charging Stations</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}><DollarSign size={24} /></div>
            <div><div className="stat-value">${(stats.total_budget / 1000).toFixed(0)}K</div><div className="stat-label">Total Budget</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><Wrench size={24} /></div>
            <div><div className="stat-value">{stats.pending_maintenance}</div><div className="stat-label">Pending Maintenance</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}><DollarSign size={24} /></div>
            <div><div className="stat-value">${(stats.budget_spent / 1000).toFixed(0)}K</div><div className="stat-label">Budget Spent</div></div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Fleet Management Features</h3>
      <div className="cards-grid">
        {features.map((f, i) => {
          const Icon = ICONS[f.icon] || Truck;
          const color = COLORS[i % COLORS.length];
          return (
            <div key={f.key} className="card" onClick={() => onNavigate(f.key)}>
              <div className="card-header">
                <div className={`card-icon ${color}`}><Icon size={22} /></div>
                <span className="badge badge-active" style={{ fontSize: '10px' }}>AI-Powered</span>
              </div>
              <div className="card-title">{f.label}</div>
              <div className="card-subtitle">Manage and optimize with AI assistance</div>
              <div className="card-footer">
                <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); onNavigate(f.key); }}>
                  Open
                </button>
                <button className="btn btn-sm btn-ai" onClick={(e) => { e.stopPropagation(); onNavigate(f.key); }}>
                  {f.aiLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
