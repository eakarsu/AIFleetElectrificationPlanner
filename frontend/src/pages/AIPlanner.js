import React, { useState } from 'react';
import { Sparkles, DollarSign, Zap, TrendingUp, Send, Map, GraduationCap, Wrench, Leaf } from 'lucide-react';
import api from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

/**
 * Surfaces structured AI endpoints that don't go through /chat:
 *   - POST /api/ai/cost-optimize
 *   - POST /api/ai/charging-network-plan
 *   - POST /api/ai/transition-roadmap
 *   - POST /api/ai/route-optimize
 *   - POST /api/ai/driver-train
 *   - POST /api/ai/maintenance-predict
 *   - POST /api/ai/carbon-impact
 *
 * Mirrors AICenter.js styling: page-header, ai-center-grid feel, btn-ai.
 */
const TABS = [
  { id: 'cost-optimize', label: 'Cost Optimize (TCO)', icon: DollarSign },
  { id: 'charging-network', label: 'Charging Network Plan', icon: Zap },
  { id: 'transition-roadmap', label: 'Transition Roadmap', icon: TrendingUp },
  { id: 'route-optimize', label: 'Route Optimize', icon: Map },
  { id: 'driver-train', label: 'Driver Coaching', icon: GraduationCap },
  { id: 'maintenance-predict', label: 'Maintenance Predict', icon: Wrench },
  { id: 'carbon-impact', label: 'Carbon Impact', icon: Leaf },
];

export default function AIPlanner() {
  const [tab, setTab] = useState('cost-optimize');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [costForm, setCostForm] = useState({
    fleet_size: 50,
    annual_miles_per_vehicle: 25000,
    fuel_price: 4.0,
    electricity_rate: 0.13,
    horizon_years: 5,
    region: '',
  });

  const [chargingForm, setChargingForm] = useState({
    depot_name: '',
    fleet_size: 50,
    daily_kwh_per_vehicle: 80,
    overnight_window_hours: 8,
    utility_demand_charge: '',
    grid_capacity_kw: '',
  });

  const [roadmapForm, setRoadmapForm] = useState({
    fleet_size: 50,
    current_ev_count: 0,
    target_ev_percentage: 100,
    timeline_years: 5,
    annual_budget: 500000,
    industry: '',
    constraints: '',
  });

  const [routeForm, setRouteForm] = useState({
    origin: '',
    destination: '',
    vehicle_model: '',
    battery_capacity_kwh: 75,
    starting_battery_percent: 100,
    total_distance_miles: 0,
    avg_speed_mph: 55,
    load_weight_lbs: 0,
    weather: 'clear',
    terrain: 'mixed',
  });

  const [driverForm, setDriverForm] = useState({
    driver_name: '',
    experience_months: 6,
    avg_kwh_per_mile: 0.32,
    hard_braking_events_per_100mi: 5,
    hard_accel_events_per_100mi: 4,
    avg_regen_use_percent: 60,
    route_types: '',
    weak_areas: '',
  });

  const [maintForm, setMaintForm] = useState({
    vehicle_model: '',
    mileage: 50000,
    age_months: 24,
    battery_health_percent: 92,
    avg_kwh_per_mile: 0.32,
    cycles_completed: 250,
    last_service_date: '',
    operating_climate: '',
    duty_cycle: 'mixed',
  });

  const [carbonForm, setCarbonForm] = useState({
    fleet_size: 50,
    ice_vehicle_count: 30,
    ev_vehicle_count: 20,
    annual_miles_per_vehicle: 25000,
    avg_mpg_ice: 18,
    avg_kwh_per_mile_ev: 0.35,
    grid_renewable_percent: 25,
    region: '',
    reporting_year: new Date().getFullYear(),
  });

  const submit = async (path, payload) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.aiCustom(path, payload);
      setResult(res);
    } catch (err) {
      const msg = err.message || 'Request failed';
      // Surface 503 cleanly when no API key is configured
      if (/unavailable|503|OPENROUTER_API_KEY/i.test(msg)) {
        setError(`AI service unavailable (503): ${msg}`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const splitList = (s) => (s || '').split(/[,;\n]/).map(t => t.trim()).filter(Boolean);

  const formField = (label, value, onChange, type = 'text') => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={value} onChange={onChange} />
    </div>
  );

  const renderCostForm = () => (
    <>
      <div className="form-row">
        {formField('Fleet size', costForm.fleet_size, e => setCostForm({ ...costForm, fleet_size: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Annual miles/vehicle', costForm.annual_miles_per_vehicle, e => setCostForm({ ...costForm, annual_miles_per_vehicle: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Horizon (years)', costForm.horizon_years, e => setCostForm({ ...costForm, horizon_years: parseInt(e.target.value, 10) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Fuel price ($/gal)', costForm.fuel_price, e => setCostForm({ ...costForm, fuel_price: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Electricity ($/kWh)', costForm.electricity_rate, e => setCostForm({ ...costForm, electricity_rate: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Region', costForm.region, e => setCostForm({ ...costForm, region: e.target.value }))}
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/cost-optimize', costForm)}>
        {loading ? 'Computing TCO...' : (<><Send size={16} /> Compute TCO</>)}
      </button>
    </>
  );

  const renderChargingForm = () => (
    <>
      <div className="form-row">
        {formField('Depot name', chargingForm.depot_name, e => setChargingForm({ ...chargingForm, depot_name: e.target.value }))}
        {formField('Fleet size', chargingForm.fleet_size, e => setChargingForm({ ...chargingForm, fleet_size: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Daily kWh/vehicle', chargingForm.daily_kwh_per_vehicle, e => setChargingForm({ ...chargingForm, daily_kwh_per_vehicle: parseFloat(e.target.value) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Overnight window (hrs)', chargingForm.overnight_window_hours, e => setChargingForm({ ...chargingForm, overnight_window_hours: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Demand charge ($/kW)', chargingForm.utility_demand_charge, e => setChargingForm({ ...chargingForm, utility_demand_charge: e.target.value }))}
        {formField('Grid capacity (kW)', chargingForm.grid_capacity_kw, e => setChargingForm({ ...chargingForm, grid_capacity_kw: e.target.value }))}
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/charging-network-plan', chargingForm)}>
        {loading ? 'Sizing chargers...' : (<><Send size={16} /> Plan Charging Network</>)}
      </button>
    </>
  );

  const renderRoadmapForm = () => (
    <>
      <div className="form-row">
        {formField('Fleet size', roadmapForm.fleet_size, e => setRoadmapForm({ ...roadmapForm, fleet_size: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Current EVs', roadmapForm.current_ev_count, e => setRoadmapForm({ ...roadmapForm, current_ev_count: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Target EV %', roadmapForm.target_ev_percentage, e => setRoadmapForm({ ...roadmapForm, target_ev_percentage: parseFloat(e.target.value) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Timeline (years)', roadmapForm.timeline_years, e => setRoadmapForm({ ...roadmapForm, timeline_years: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Annual budget ($)', roadmapForm.annual_budget, e => setRoadmapForm({ ...roadmapForm, annual_budget: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Industry', roadmapForm.industry, e => setRoadmapForm({ ...roadmapForm, industry: e.target.value }))}
      </div>
      <div className="form-group">
        <label>Constraints</label>
        <textarea
          value={roadmapForm.constraints}
          onChange={e => setRoadmapForm({ ...roadmapForm, constraints: e.target.value })}
          placeholder="Permitting, union agreements, depot lease, capital cycles..."
          style={{ minHeight: '70px' }}
        />
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/transition-roadmap', roadmapForm)}>
        {loading ? 'Drafting...' : (<><Send size={16} /> Draft Transition Roadmap</>)}
      </button>
    </>
  );

  const renderRouteForm = () => (
    <>
      <div className="form-row">
        {formField('Origin', routeForm.origin, e => setRouteForm({ ...routeForm, origin: e.target.value }))}
        {formField('Destination', routeForm.destination, e => setRouteForm({ ...routeForm, destination: e.target.value }))}
        {formField('Vehicle model', routeForm.vehicle_model, e => setRouteForm({ ...routeForm, vehicle_model: e.target.value }))}
      </div>
      <div className="form-row">
        {formField('Battery (kWh)', routeForm.battery_capacity_kwh, e => setRouteForm({ ...routeForm, battery_capacity_kwh: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Starting SOC (%)', routeForm.starting_battery_percent, e => setRouteForm({ ...routeForm, starting_battery_percent: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Distance (mi)', routeForm.total_distance_miles, e => setRouteForm({ ...routeForm, total_distance_miles: parseFloat(e.target.value) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Avg speed (mph)', routeForm.avg_speed_mph, e => setRouteForm({ ...routeForm, avg_speed_mph: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Load (lbs)', routeForm.load_weight_lbs, e => setRouteForm({ ...routeForm, load_weight_lbs: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Weather', routeForm.weather, e => setRouteForm({ ...routeForm, weather: e.target.value }))}
      </div>
      <div className="form-row">
        {formField('Terrain', routeForm.terrain, e => setRouteForm({ ...routeForm, terrain: e.target.value }))}
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/route-optimize', routeForm)}>
        {loading ? 'Optimizing...' : (<><Send size={16} /> Optimize Route</>)}
      </button>
    </>
  );

  const renderDriverForm = () => (
    <>
      <div className="form-row">
        {formField('Driver name', driverForm.driver_name, e => setDriverForm({ ...driverForm, driver_name: e.target.value }))}
        {formField('EV experience (months)', driverForm.experience_months, e => setDriverForm({ ...driverForm, experience_months: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Avg kWh/mi', driverForm.avg_kwh_per_mile, e => setDriverForm({ ...driverForm, avg_kwh_per_mile: parseFloat(e.target.value) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Hard brakes /100mi', driverForm.hard_braking_events_per_100mi, e => setDriverForm({ ...driverForm, hard_braking_events_per_100mi: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Hard accel /100mi', driverForm.hard_accel_events_per_100mi, e => setDriverForm({ ...driverForm, hard_accel_events_per_100mi: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Regen use (%)', driverForm.avg_regen_use_percent, e => setDriverForm({ ...driverForm, avg_regen_use_percent: parseFloat(e.target.value) || 0 }), 'number')}
      </div>
      <div className="form-group">
        <label>Route types (comma-separated)</label>
        <input type="text" value={driverForm.route_types} onChange={e => setDriverForm({ ...driverForm, route_types: e.target.value })} placeholder="urban, highway, rural" />
      </div>
      <div className="form-group">
        <label>Weak areas (comma-separated)</label>
        <input type="text" value={driverForm.weak_areas} onChange={e => setDriverForm({ ...driverForm, weak_areas: e.target.value })} placeholder="regen braking, range anxiety" />
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/driver-train', { ...driverForm, route_types: splitList(driverForm.route_types), weak_areas: splitList(driverForm.weak_areas) })}>
        {loading ? 'Building plan...' : (<><Send size={16} /> Build Coaching Plan</>)}
      </button>
    </>
  );

  const renderMaintForm = () => (
    <>
      <div className="form-row">
        {formField('Vehicle model', maintForm.vehicle_model, e => setMaintForm({ ...maintForm, vehicle_model: e.target.value }))}
        {formField('Mileage', maintForm.mileage, e => setMaintForm({ ...maintForm, mileage: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('Age (months)', maintForm.age_months, e => setMaintForm({ ...maintForm, age_months: parseInt(e.target.value, 10) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Battery health (%)', maintForm.battery_health_percent, e => setMaintForm({ ...maintForm, battery_health_percent: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Avg kWh/mi', maintForm.avg_kwh_per_mile, e => setMaintForm({ ...maintForm, avg_kwh_per_mile: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Cycles', maintForm.cycles_completed, e => setMaintForm({ ...maintForm, cycles_completed: parseInt(e.target.value, 10) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Last service', maintForm.last_service_date, e => setMaintForm({ ...maintForm, last_service_date: e.target.value }), 'date')}
        {formField('Climate', maintForm.operating_climate, e => setMaintForm({ ...maintForm, operating_climate: e.target.value }))}
        {formField('Duty cycle', maintForm.duty_cycle, e => setMaintForm({ ...maintForm, duty_cycle: e.target.value }))}
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/maintenance-predict', maintForm)}>
        {loading ? 'Predicting...' : (<><Send size={16} /> Predict Maintenance</>)}
      </button>
    </>
  );

  const renderCarbonForm = () => (
    <>
      <div className="form-row">
        {formField('Fleet size', carbonForm.fleet_size, e => setCarbonForm({ ...carbonForm, fleet_size: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('ICE vehicles', carbonForm.ice_vehicle_count, e => setCarbonForm({ ...carbonForm, ice_vehicle_count: parseInt(e.target.value, 10) || 0 }), 'number')}
        {formField('EVs', carbonForm.ev_vehicle_count, e => setCarbonForm({ ...carbonForm, ev_vehicle_count: parseInt(e.target.value, 10) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Miles/vehicle', carbonForm.annual_miles_per_vehicle, e => setCarbonForm({ ...carbonForm, annual_miles_per_vehicle: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Avg ICE MPG', carbonForm.avg_mpg_ice, e => setCarbonForm({ ...carbonForm, avg_mpg_ice: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('EV kWh/mi', carbonForm.avg_kwh_per_mile_ev, e => setCarbonForm({ ...carbonForm, avg_kwh_per_mile_ev: parseFloat(e.target.value) || 0 }), 'number')}
      </div>
      <div className="form-row">
        {formField('Grid renewables (%)', carbonForm.grid_renewable_percent, e => setCarbonForm({ ...carbonForm, grid_renewable_percent: parseFloat(e.target.value) || 0 }), 'number')}
        {formField('Region', carbonForm.region, e => setCarbonForm({ ...carbonForm, region: e.target.value }))}
        {formField('Reporting year', carbonForm.reporting_year, e => setCarbonForm({ ...carbonForm, reporting_year: parseInt(e.target.value, 10) || 0 }), 'number')}
      </div>
      <button className="btn btn-ai btn-lg" disabled={loading} onClick={() => submit('/ai/carbon-impact', carbonForm)}>
        {loading ? 'Computing...' : (<><Send size={16} /> Compute Carbon Impact</>)}
      </button>
    </>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={28} style={{ color: '#8b5cf6' }} />
            AI Planner
          </h2>
          <p>Structured AI tools: TCO, charging network, transition roadmap</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTab(t.id); setResult(null); setError(null); }}
            >
              <Icon size={14} style={{ marginRight: '6px' }} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', padding: '24px' }}>
        {tab === 'cost-optimize' && renderCostForm()}
        {tab === 'charging-network' && renderChargingForm()}
        {tab === 'transition-roadmap' && renderRoadmapForm()}
        {tab === 'route-optimize' && renderRouteForm()}
        {tab === 'driver-train' && renderDriverForm()}
        {tab === 'maintenance-predict' && renderMaintForm()}
        {tab === 'carbon-impact' && renderCarbonForm()}

        {loading && (
          <div className="ai-thinking" style={{ marginTop: '20px' }}>
            <div className="ai-thinking-dots"><span></span><span></span><span></span></div>
            <span style={{ fontSize: '14px', color: '#64748b' }}>AI is thinking...</span>
          </div>
        )}

        {error && (
          <div className="login-error" style={{ marginTop: '20px' }}>
            Error: {error}
          </div>
        )}

        {result && !error && (
          <div style={{ marginTop: '20px' }}>
            <AIResponseDisplay result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
