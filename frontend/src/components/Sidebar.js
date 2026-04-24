import React from 'react';
import { Truck, Map, Zap, DollarSign, Battery, Activity, TrendingUp, Leaf, Wrench, Users, PieChart, Shield, Navigation, LayoutDashboard, Bot, LogOut } from 'lucide-react';

const ICONS = {
  'truck': Truck, 'map': Map, 'zap': Zap, 'dollar-sign': DollarSign,
  'battery': Battery, 'activity': Activity, 'trending-up': TrendingUp,
  'leaf': Leaf, 'tool': Wrench, 'users': Users, 'pie-chart': PieChart,
  'shield': Shield, 'navigation': Navigation
};

export default function Sidebar({ features, activeFeature, onNavigate, user, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">EV</div>
          <div>
            <h1>Fleet Planner</h1>
            <span>AI-Powered Electrification</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Overview</div>
        <div
          className={`sidebar-item ${activeFeature === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div className="sidebar-section">Fleet Management</div>
        {features.slice(0, 5).map(f => {
          const Icon = ICONS[f.icon] || Truck;
          return (
            <div
              key={f.key}
              className={`sidebar-item ${activeFeature === f.key ? 'active' : ''}`}
              onClick={() => onNavigate(f.key)}
            >
              <Icon size={18} />
              <span>{f.label}</span>
            </div>
          );
        })}

        <div className="sidebar-section">Planning & Analytics</div>
        {features.slice(5, 9).map(f => {
          const Icon = ICONS[f.icon] || Activity;
          return (
            <div
              key={f.key}
              className={`sidebar-item ${activeFeature === f.key ? 'active' : ''}`}
              onClick={() => onNavigate(f.key)}
            >
              <Icon size={18} />
              <span>{f.label}</span>
            </div>
          );
        })}

        <div className="sidebar-section">Operations</div>
        {features.slice(9).map(f => {
          const Icon = ICONS[f.icon] || Wrench;
          return (
            <div
              key={f.key}
              className={`sidebar-item ${activeFeature === f.key ? 'active' : ''}`}
              onClick={() => onNavigate(f.key)}
            >
              <Icon size={18} />
              <span>{f.label}</span>
            </div>
          );
        })}

        <div className="sidebar-section">AI</div>
        <div
          className={`sidebar-item ${activeFeature === 'ai-center' ? 'active' : ''}`}
          onClick={() => onNavigate('ai-center')}
        >
          <Bot size={18} />
          <span>AI Center</span>
        </div>
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{user.name?.[0] || 'U'}</div>
        <div className="sidebar-user-info">
          <div className="name">{user.name}</div>
          <div className="role">{user.role?.replace('_', ' ')}</div>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
