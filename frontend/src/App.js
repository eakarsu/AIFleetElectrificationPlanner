import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import CrudPage from './pages/CrudPage';
import AICenter from './pages/AICenter';
import AIPlanner from './pages/AIPlanner';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';

const FEATURES = [
  { key: 'vehicles', label: 'Fleet Vehicles', resource: 'vehicles', icon: 'truck',
    fields: [
      { name: 'make', label: 'Make', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['Sedan','SUV','Truck','Van','Bus'] },
      { name: 'battery_capacity_kwh', label: 'Battery (kWh)', type: 'number' },
      { name: 'range_miles', label: 'Range (miles)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['active','maintenance','charging','inactive'] },
      { name: 'license_plate', label: 'License Plate', type: 'text' },
      { name: 'vin', label: 'VIN', type: 'text' },
      { name: 'current_mileage', label: 'Mileage', type: 'number' }
    ],
    cardFields: ['make','model','year','type','range_miles','status'],
    tableFields: ['make','model','year','type','battery_capacity_kwh','range_miles','status','license_plate'],
    aiAction: 'aiVehicleRecommend',
    aiLabel: 'AI Recommend',
    aiFields: [
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'budget', label: 'Budget ($)', type: 'number' },
      { name: 'use_case', label: 'Use Case', type: 'text', placeholder: 'e.g., urban delivery, long haul' },
      { name: 'region', label: 'Region', type: 'text', placeholder: 'e.g., California, Northeast US' }
    ]
  },
  { key: 'routes', label: 'Route Planning', resource: 'routes', icon: 'map',
    fields: [
      { name: 'name', label: 'Route Name', type: 'text', required: true },
      { name: 'origin', label: 'Origin', type: 'text', required: true },
      { name: 'destination', label: 'Destination', type: 'text', required: true },
      { name: 'distance_miles', label: 'Distance (miles)', type: 'number' },
      { name: 'estimated_duration', label: 'Duration', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['planned','active','completed'] }
    ],
    cardFields: ['name','origin','destination','distance_miles','status'],
    tableFields: ['name','origin','destination','distance_miles','estimated_duration','status'],
    aiAction: 'aiRouteOptimize',
    aiLabel: 'AI Optimize Route',
    aiFields: [
      { name: 'origin', label: 'Origin', type: 'text' },
      { name: 'destination', label: 'Destination', type: 'text' },
      { name: 'vehicle_type', label: 'Vehicle Type', type: 'text' },
      { name: 'battery_level', label: 'Battery Level (%)', type: 'number' },
      { name: 'weather_conditions', label: 'Weather', type: 'text' }
    ]
  },
  { key: 'charging-stations', label: 'Charging Stations', resource: 'charging-stations', icon: 'zap',
    fields: [
      { name: 'name', label: 'Station Name', type: 'text', required: true },
      { name: 'location', label: 'Location', type: 'text', required: true },
      { name: 'latitude', label: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', type: 'number' },
      { name: 'charger_type', label: 'Charger Type', type: 'select', options: ['Level 2','DC Fast','Tesla Supercharger'] },
      { name: 'power_kw', label: 'Power (kW)', type: 'number' },
      { name: 'num_ports', label: 'Ports', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['available','occupied','maintenance','offline'] },
      { name: 'cost_per_kwh', label: 'Cost/kWh ($)', type: 'number' },
      { name: 'network', label: 'Network', type: 'text' }
    ],
    cardFields: ['name','location','charger_type','power_kw','num_ports','status'],
    tableFields: ['name','location','charger_type','power_kw','num_ports','status','cost_per_kwh','network'],
    aiAction: 'aiChargingRecommend',
    aiLabel: 'AI Recommend',
    aiFields: [
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'daily_miles', label: 'Daily Miles/Vehicle', type: 'number' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'budget', label: 'Budget ($)', type: 'number' }
    ]
  },
  { key: 'cost-analysis', label: 'Cost Analysis', resource: 'cost-analysis', icon: 'dollar-sign',
    fields: [
      { name: 'name', label: 'Analysis Name', type: 'text', required: true },
      { name: 'analysis_type', label: 'Type', type: 'select', options: ['TCO','ROI','Breakeven','Comparison'] },
      { name: 'current_fuel_cost', label: 'Annual Fuel Cost ($)', type: 'number' },
      { name: 'ev_energy_cost', label: 'Annual EV Cost ($)', type: 'number' },
      { name: 'maintenance_savings', label: 'Maintenance Savings ($)', type: 'number' },
      { name: 'total_tco_ice', label: 'ICE TCO ($)', type: 'number' },
      { name: 'total_tco_ev', label: 'EV TCO ($)', type: 'number' },
      { name: 'payback_years', label: 'Payback (years)', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['name','analysis_type','total_tco_ice','total_tco_ev','payback_years'],
    tableFields: ['name','analysis_type','current_fuel_cost','ev_energy_cost','total_tco_ice','total_tco_ev','payback_years'],
    aiAction: 'aiCostAnalyze',
    aiLabel: 'AI Analyze',
    aiFields: [
      { name: 'vehicle_type', label: 'Vehicle Type', type: 'text' },
      { name: 'annual_miles', label: 'Annual Miles', type: 'number' },
      { name: 'fuel_price', label: 'Fuel Price ($/gal)', type: 'number' },
      { name: 'electricity_rate', label: 'Electricity ($/kWh)', type: 'number' },
      { name: 'vehicle_count', label: 'Vehicle Count', type: 'number' }
    ]
  },
  { key: 'battery-health', label: 'Battery Health', resource: 'battery-health', icon: 'battery',
    fields: [
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
      { name: 'health_percentage', label: 'Health (%)', type: 'number' },
      { name: 'cycles_completed', label: 'Cycles', type: 'number' },
      { name: 'max_capacity_kwh', label: 'Max Capacity (kWh)', type: 'number' },
      { name: 'current_capacity_kwh', label: 'Current Capacity (kWh)', type: 'number' },
      { name: 'degradation_rate', label: 'Degradation Rate', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['vehicle_id','health_percentage','cycles_completed','current_capacity_kwh'],
    tableFields: ['vehicle_id','health_percentage','cycles_completed','max_capacity_kwh','current_capacity_kwh','degradation_rate'],
    aiAction: 'aiBatteryPredict',
    aiLabel: 'AI Predict',
    aiFields: [
      { name: 'vehicle_model', label: 'Vehicle Model', type: 'text' },
      { name: 'current_health', label: 'Current Health (%)', type: 'number' },
      { name: 'age_months', label: 'Age (months)', type: 'number' },
      { name: 'mileage', label: 'Mileage', type: 'number' },
      { name: 'charging_habits', label: 'Charging Habits', type: 'text' },
      { name: 'climate', label: 'Climate/Region', type: 'text' }
    ]
  },
  { key: 'energy-forecast', label: 'Energy Forecast', resource: 'energy-forecast', icon: 'activity',
    fields: [
      { name: 'name', label: 'Forecast Name', type: 'text', required: true },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'total_kwh', label: 'Total kWh', type: 'number' },
      { name: 'peak_demand_kw', label: 'Peak Demand (kW)', type: 'number' },
      { name: 'off_peak_kwh', label: 'Off-Peak kWh', type: 'number' },
      { name: 'cost_estimate', label: 'Cost Estimate ($)', type: 'number' },
      { name: 'renewable_percentage', label: 'Renewable (%)', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['name','period','total_kwh','cost_estimate','renewable_percentage'],
    tableFields: ['name','period','fleet_size','total_kwh','peak_demand_kw','cost_estimate','renewable_percentage'],
    aiAction: 'aiEnergyForecast',
    aiLabel: 'AI Forecast',
    aiFields: [
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'vehicle_types', label: 'Vehicle Types', type: 'text' },
      { name: 'daily_usage_pattern', label: 'Usage Pattern', type: 'text' },
      { name: 'season', label: 'Season', type: 'text' },
      { name: 'region', label: 'Region', type: 'text' }
    ]
  },
  { key: 'transition-plans', label: 'Transition Plans', resource: 'transition-plans', icon: 'trending-up',
    fields: [
      { name: 'name', label: 'Plan Name', type: 'text', required: true },
      { name: 'current_fleet_size', label: 'Current Fleet Size', type: 'number' },
      { name: 'target_ev_percentage', label: 'Target EV %', type: 'number' },
      { name: 'timeline_months', label: 'Timeline (months)', type: 'number' },
      { name: 'budget', label: 'Budget ($)', type: 'number' },
      { name: 'phase', label: 'Phase', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft','planned','active','completed'] }
    ],
    cardFields: ['name','phase','target_ev_percentage','timeline_months','budget','status'],
    tableFields: ['name','current_fleet_size','target_ev_percentage','timeline_months','budget','phase','status'],
    aiAction: 'aiTransitionPlan',
    aiLabel: 'AI Plan',
    aiFields: [
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'current_ev_count', label: 'Current EVs', type: 'number' },
      { name: 'budget', label: 'Budget ($)', type: 'number' },
      { name: 'timeline', label: 'Timeline', type: 'text' },
      { name: 'industry', label: 'Industry', type: 'text' }
    ]
  },
  { key: 'carbon-footprint', label: 'Carbon Footprint', resource: 'carbon-footprint', icon: 'leaf',
    fields: [
      { name: 'name', label: 'Report Name', type: 'text', required: true },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'ice_emissions_kg', label: 'ICE Emissions (kg)', type: 'number' },
      { name: 'ev_emissions_kg', label: 'EV Emissions (kg)', type: 'number' },
      { name: 'savings_kg', label: 'Savings (kg)', type: 'number' },
      { name: 'trees_equivalent', label: 'Trees Equivalent', type: 'number' },
      { name: 'report_type', label: 'Type', type: 'select', options: ['monthly','quarterly','annual'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['name','period','savings_kg','trees_equivalent','report_type'],
    tableFields: ['name','period','ice_emissions_kg','ev_emissions_kg','savings_kg','trees_equivalent','report_type'],
    aiAction: 'aiCarbonCalculate',
    aiLabel: 'AI Calculate',
    aiFields: [
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'annual_miles', label: 'Annual Miles/Vehicle', type: 'number' },
      { name: 'current_fuel_type', label: 'Fuel Type', type: 'text' },
      { name: 'region', label: 'Region', type: 'text' },
      { name: 'renewable_percentage', label: 'Renewable (%)', type: 'number' }
    ]
  },
  { key: 'maintenance', label: 'Maintenance', resource: 'maintenance', icon: 'tool',
    fields: [
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number', required: true },
      { name: 'service_type', label: 'Service Type', type: 'text', required: true },
      { name: 'scheduled_date', label: 'Scheduled Date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['scheduled','in_progress','completed','cancelled'] },
      { name: 'cost_estimate', label: 'Cost ($)', type: 'number' },
      { name: 'technician', label: 'Technician', type: 'text' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['low','medium','high','critical'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['service_type','scheduled_date','status','priority','cost_estimate','technician'],
    tableFields: ['vehicle_id','service_type','scheduled_date','status','cost_estimate','technician','priority'],
    aiAction: 'aiMaintenancePredict',
    aiLabel: 'AI Predict',
    aiFields: [
      { name: 'vehicle_model', label: 'Vehicle Model', type: 'text' },
      { name: 'mileage', label: 'Mileage', type: 'number' },
      { name: 'age_months', label: 'Age (months)', type: 'number' },
      { name: 'last_service', label: 'Last Service', type: 'text' },
      { name: 'driving_conditions', label: 'Conditions', type: 'text' }
    ]
  },
  { key: 'driver-assignment', label: 'Driver Assignment', resource: 'driver-assignment', icon: 'users',
    fields: [
      { name: 'driver_name', label: 'Driver Name', type: 'text', required: true },
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number' },
      { name: 'route_id', label: 'Route ID', type: 'number' },
      { name: 'shift_start', label: 'Shift Start', type: 'datetime-local' },
      { name: 'shift_end', label: 'Shift End', type: 'datetime-local' },
      { name: 'status', label: 'Status', type: 'select', options: ['assigned','active','off_duty','on_break'] },
      { name: 'efficiency_score', label: 'Efficiency Score', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['driver_name','vehicle_id','status','efficiency_score'],
    tableFields: ['driver_name','vehicle_id','route_id','status','efficiency_score','shift_start','shift_end'],
    aiAction: 'aiDriverOptimize',
    aiLabel: 'AI Optimize',
    aiFields: [
      { name: 'drivers', label: 'Available Drivers', type: 'text' },
      { name: 'vehicles', label: 'Available Vehicles', type: 'text' },
      { name: 'routes', label: 'Routes to Cover', type: 'text' },
      { name: 'preferences', label: 'Preferences', type: 'text' }
    ]
  },
  { key: 'budget', label: 'Budget Planner', resource: 'budget', icon: 'pie-chart',
    fields: [
      { name: 'name', label: 'Budget Name', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['vehicles','infrastructure','training','maintenance','energy','insurance','technology','compliance','marketing','planning','warranty'] },
      { name: 'allocated_amount', label: 'Allocated ($)', type: 'number', required: true },
      { name: 'spent_amount', label: 'Spent ($)', type: 'number' },
      { name: 'period', label: 'Period', type: 'text' },
      { name: 'fiscal_year', label: 'Fiscal Year', type: 'number' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['active','planned','completed','cancelled'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['name','category','allocated_amount','spent_amount','status'],
    tableFields: ['name','category','allocated_amount','spent_amount','period','fiscal_year','department','status'],
    aiAction: 'aiBudgetOptimize',
    aiLabel: 'AI Optimize',
    aiFields: [
      { name: 'total_budget', label: 'Total Budget ($)', type: 'number' },
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'priorities', label: 'Priorities', type: 'text' },
      { name: 'timeline', label: 'Timeline', type: 'text' },
      { name: 'current_spending', label: 'Current Spending ($)', type: 'number' }
    ]
  },
  { key: 'compliance', label: 'Compliance', resource: 'compliance', icon: 'shield',
    fields: [
      { name: 'name', label: 'Record Name', type: 'text', required: true },
      { name: 'regulation', label: 'Regulation', type: 'text', required: true },
      { name: 'jurisdiction', label: 'Jurisdiction', type: 'text' },
      { name: 'deadline', label: 'Deadline', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['pending','in_progress','compliant','non_compliant'] },
      { name: 'requirement_details', label: 'Requirements', type: 'textarea' },
      { name: 'current_progress', label: 'Progress (%)', type: 'number' },
      { name: 'penalty_risk', label: 'Risk Level', type: 'select', options: ['low','medium','high','critical'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ],
    cardFields: ['name','regulation','jurisdiction','deadline','status','current_progress'],
    tableFields: ['name','regulation','jurisdiction','deadline','status','current_progress','penalty_risk'],
    aiAction: 'aiComplianceCheck',
    aiLabel: 'AI Check',
    aiFields: [
      { name: 'state', label: 'State/Region', type: 'text' },
      { name: 'fleet_size', label: 'Fleet Size', type: 'number' },
      { name: 'current_ev_percentage', label: 'Current EV %', type: 'number' },
      { name: 'industry', label: 'Industry', type: 'text' },
      { name: 'deadlines', label: 'Known Deadlines', type: 'text' }
    ]
  },
  { key: 'trip-planner', label: 'Trip Planner', resource: 'trip-planner', icon: 'navigation',
    fields: [
      { name: 'name', label: 'Trip Name', type: 'text', required: true },
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'end_date', label: 'End Date', type: 'date' },
      { name: 'origin', label: 'Origin', type: 'text' },
      { name: 'destination', label: 'Destination', type: 'text' },
      { name: 'total_distance', label: 'Distance (miles)', type: 'number' },
      { name: 'daily_budget', label: 'Daily Budget ($)', type: 'number' },
      { name: 'total_budget', label: 'Total Budget ($)', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['draft','planned','active','completed'] }
    ],
    cardFields: ['name','origin','destination','total_distance','total_budget','status'],
    tableFields: ['name','origin','destination','start_date','end_date','total_distance','total_budget','status'],
    aiAction: 'aiTripPlan',
    aiLabel: 'AI Plan Trip',
    aiFields: [
      { name: 'origin', label: 'Origin', type: 'text' },
      { name: 'destination', label: 'Destination', type: 'text' },
      { name: 'duration_days', label: 'Duration (days)', type: 'number' },
      { name: 'vehicle_type', label: 'Vehicle Type', type: 'text' },
      { name: 'budget', label: 'Budget ($)', type: 'number' },
      { name: 'preferences', label: 'Preferences', type: 'text' }
    ]
  }
];

function App() {
  const [user, setUser] = useState(null);
  const [activeFeature, setActiveFeature] = useState('dashboard');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setActiveFeature('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const feature = FEATURES.find(f => f.key === activeFeature);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar
          features={FEATURES}
          activeFeature={activeFeature}
          onNavigate={setActiveFeature}
          user={user}
          onLogout={handleLogout}
        />
        <div className="main-content">
          <Routes>
            <Route path="/custom-views" element={<CustomViewsPage />} />
            <Route path="*" element={
              <>
                {activeFeature === 'dashboard' && <Dashboard features={FEATURES} onNavigate={setActiveFeature} />}
                {activeFeature === 'ai-center' && <AICenter />}
                {activeFeature === 'ai-planner' && <AIPlanner />}
                {activeFeature === 'custom-views' && <CustomViewsPage />}
                {feature && <CrudPage feature={feature} />}
              </>
            } />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
