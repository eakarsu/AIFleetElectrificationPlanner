const router = require('express').Router();
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../middleware/aiClient');

// AI Center - unified endpoint for all AI features
const AI_FEATURES = [
  { id: 'vehicle-recommendation', name: 'Vehicle Recommendation', description: 'Get AI-powered EV recommendations for your fleet', icon: 'truck' },
  { id: 'route-optimization', name: 'Route Optimization', description: 'Optimize routes for maximum EV efficiency', icon: 'map' },
  { id: 'charging-strategy', name: 'Charging Strategy', description: 'AI-powered charging infrastructure planning', icon: 'zap' },
  { id: 'cost-analysis', name: 'Cost & TCO Analysis', description: 'Compare total cost of ownership: EV vs ICE', icon: 'dollar-sign' },
  { id: 'battery-prediction', name: 'Battery Health Prediction', description: 'Predict battery degradation and lifespan', icon: 'battery' },
  { id: 'energy-forecast', name: 'Energy Forecast', description: 'Forecast energy consumption and demand', icon: 'activity' },
  { id: 'transition-planning', name: 'Transition Planning', description: 'Create phased electrification roadmaps', icon: 'trending-up' },
  { id: 'carbon-calculator', name: 'Carbon Footprint Calculator', description: 'Calculate emissions savings from electrification', icon: 'leaf' },
  { id: 'maintenance-predictor', name: 'Predictive Maintenance', description: 'AI-powered maintenance scheduling', icon: 'tool' },
  { id: 'driver-optimizer', name: 'Driver-Vehicle Matching', description: 'Optimize driver assignments for EV fleet', icon: 'users' },
  { id: 'budget-optimizer', name: 'Budget Optimization', description: 'AI-driven budget allocation for electrification', icon: 'pie-chart' },
  { id: 'compliance-checker', name: 'Compliance Checker', description: 'Check regulatory compliance and deadlines', icon: 'shield' },
  { id: 'trip-planner', name: 'AI Trip Planner', description: 'Generate day-by-day EV trip itineraries', icon: 'navigation' },
  { id: 'fleet-insights', name: 'Fleet Analytics & Insights', description: 'AI-driven fleet performance insights', icon: 'bar-chart' },
  { id: 'general-advisor', name: 'EV Fleet Advisor', description: 'Ask any question about fleet electrification', icon: 'message-circle' }
];

router.get('/features', auth, (req, res) => {
  res.json(AI_FEATURES);
});

router.post('/chat', auth, async (req, res) => {
  const { feature_id, prompt: userPrompt, context } = req.body;

  const systemPrompts = {
    'vehicle-recommendation': 'You are an expert EV fleet advisor. Help recommend the best electric vehicles for commercial fleets.',
    'route-optimization': 'You are an EV route optimization specialist. Help plan efficient routes considering charging needs.',
    'charging-strategy': 'You are a charging infrastructure expert. Help plan and optimize EV charging strategies.',
    'cost-analysis': 'You are a financial analyst specializing in fleet TCO comparison between EV and ICE vehicles.',
    'battery-prediction': 'You are a battery technology expert. Help predict and manage EV battery health.',
    'energy-forecast': 'You are an energy management specialist for EV fleets.',
    'transition-planning': 'You are a fleet electrification strategist. Help create transition roadmaps.',
    'carbon-calculator': 'You are an environmental analyst. Help calculate and reduce fleet carbon emissions.',
    'maintenance-predictor': 'You are a predictive maintenance AI for electric vehicles.',
    'driver-optimizer': 'You are a fleet operations optimizer for driver-vehicle matching.',
    'budget-optimizer': 'You are a financial planning expert for fleet electrification budgets.',
    'compliance-checker': 'You are a regulatory compliance expert for transportation electrification.',
    'trip-planner': 'You are an EV travel planning expert creating detailed trip itineraries with budgets.',
    'fleet-insights': 'You are a fleet analytics expert providing data-driven insights.',
    'general-advisor': 'You are a comprehensive EV fleet electrification advisor. Answer any question about transitioning fleets to electric vehicles.'
  };

  try {
    const systemPrompt = systemPrompts[feature_id] || systemPrompts['general-advisor'];
    const fullPrompt = context ? `Context: ${context}\n\nQuestion: ${userPrompt}` : userPrompt;

    const response = await callOpenRouter(fullPrompt, systemPrompt);
    const content = response.choices?.[0]?.message?.content || 'No response generated';

    res.json({
      response: content,
      feature: AI_FEATURES.find(f => f.id === feature_id) || { name: 'General Advisor' },
      model: response.model,
      usage: response.usage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Helpers --------------------------------------------------------------
function tryParseJson(text) {
  if (typeof text !== 'string') return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  try {
    return JSON.parse(candidate);
  } catch (e) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(candidate.slice(start, end + 1)); } catch { /* fallthrough */ }
    }
    return null;
  }
}

// POST /api/ai/cost-optimize — TCO comparison ICE vs EV
router.post('/cost-optimize', auth, async (req, res) => {
  try {
    const {
      iceFleet = [],
      candidateEvs = [],
      analysis_horizon_years = 7,
      discount_rate = 0.05,
    } = req.body || {};

    if (iceFleet.length === 0 && candidateEvs.length === 0) {
      return res.status(400).json({ error: 'iceFleet and candidateEvs arrays required' });
    }

    const systemPrompt = `You are a fleet financial analyst. Produce a TCO comparison between an ICE fleet and an EV transition. Return STRICT JSON only.`;
    const prompt = `Compute and explain TCO over ${analysis_horizon_years} years at a ${(discount_rate * 100).toFixed(1)}% discount rate.

ICE FLEET: ${JSON.stringify(iceFleet, null, 2)}
EV CANDIDATES: ${JSON.stringify(candidateEvs, null, 2)}

Respond ONLY with JSON:
{
  "summary": "2-3 sentence finding",
  "ice_tco_usd": 0,
  "ev_tco_usd": 0,
  "savings_usd": 0,
  "payback_years": 0,
  "per_vehicle_breakdown": [
    { "label": "string", "annual_fuel_or_electricity": 0, "annual_maintenance": 0, "capex": 0, "tco": 0 }
  ],
  "recommendations": ["..."],
  "risks": ["..."],
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('cost-optimize error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute TCO' });
  }
});

// POST /api/ai/charging-network-plan — depot charger sizing
router.post('/charging-network-plan', auth, async (req, res) => {
  try {
    const {
      depot_locations = [],
      vehicles = [],
      utility_rate_per_kwh = 0.13,
      target_charging_window_hours = 8,
      grid_capacity_kw = null,
    } = req.body || {};

    if (depot_locations.length === 0 || vehicles.length === 0) {
      return res.status(400).json({ error: 'depot_locations and vehicles arrays required' });
    }

    const totalKwhPerDay = vehicles.reduce((s, v) => s + Number(v.count || 0) * Number(v.kwh_per_day || 0), 0);
    const requiredKw = totalKwhPerDay / Math.max(1, Number(target_charging_window_hours));

    const systemPrompt = `You are a charging-infrastructure planner. Recommend depot-level charger sizing, quantities, utility considerations, and rough capex/opex. Return STRICT JSON only.`;
    const prompt = `Design a charging network for these depots and vehicles.

DEPOTS: ${JSON.stringify(depot_locations, null, 2)}
VEHICLES: ${JSON.stringify(vehicles, null, 2)}
TOTAL DAILY ENERGY: ${totalKwhPerDay.toFixed(0)} kWh
REQUIRED LOAD (over ${target_charging_window_hours} h window): ${requiredKw.toFixed(0)} kW
UTILITY RATE: $${utility_rate_per_kwh}/kWh
GRID CAPACITY (kW): ${grid_capacity_kw ?? 'unknown'}

Respond ONLY with JSON:
{
  "depots": [
    { "name": "string", "level2_chargers": 0, "dc_fast_chargers": 0, "peak_kw": 0, "estimated_capex_usd": 0 }
  ],
  "annual_electricity_cost_usd": 0,
  "demand_charge_warning": "string",
  "phasing": [{ "phase": 1, "year": 1, "actions": ["..."] }],
  "grid_upgrade_required": true,
  "recommendations": ["..."],
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      inputs_summary: { totalKwhPerDay, requiredKw },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('charging-network-plan error:', err);
    res.status(500).json({ error: err.message || 'Failed to plan charging network' });
  }
});

// Helper: returns true if no API key is configured.
function noKey() {
  return !process.env.OPENROUTER_API_KEY;
}

// POST /api/ai/route-optimize — structured EV route optimization
router.post('/route-optimize', auth, async (req, res) => {
  try {
    if (noKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }
    const {
      origin,
      destination,
      vehicle_model,
      battery_capacity_kwh = 60,
      starting_battery_percent = 100,
      total_distance_miles,
      avg_speed_mph = 55,
      load_weight_lbs = 0,
      weather = 'clear',
      terrain = 'mixed',
    } = req.body || {};

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination required' });
    }

    const systemPrompt = `You are an EV route optimization specialist. Plan an efficient route considering charging stops, battery range, terrain, and weather. Return STRICT JSON only.`;
    const prompt = `Plan an optimized EV route.

ORIGIN: ${origin}
DESTINATION: ${destination}
VEHICLE: ${vehicle_model || 'generic EV'}
BATTERY: ${battery_capacity_kwh} kWh, starting at ${starting_battery_percent}%
DISTANCE: ${total_distance_miles ?? 'unknown'} miles
AVG SPEED: ${avg_speed_mph} mph
LOAD: ${load_weight_lbs} lbs
WEATHER: ${weather}
TERRAIN: ${terrain}

Respond ONLY with JSON:
{
  "summary": "string",
  "estimated_total_miles": 0,
  "estimated_drive_time_hours": 0,
  "estimated_total_kwh": 0,
  "charging_stops": [
    { "location": "string", "miles_from_origin": 0, "charger_type": "Level 2|DC Fast", "duration_minutes": 0, "kwh_added": 0 }
  ],
  "energy_efficiency_kwh_per_mile": 0,
  "battery_arrival_percent": 0,
  "warnings": ["..."],
  "recommendations": ["..."],
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('route-optimize error:', err);
    res.status(500).json({ error: err.message || 'Failed to optimize route' });
  }
});

// POST /api/ai/driver-train — EV driving behavior coaching
router.post('/driver-train', auth, async (req, res) => {
  try {
    if (noKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }
    const {
      driver_name,
      experience_months = 0,
      avg_kwh_per_mile,
      hard_braking_events_per_100mi,
      hard_accel_events_per_100mi,
      avg_regen_use_percent,
      route_types = [],
      weak_areas = [],
    } = req.body || {};

    const systemPrompt = `You are an EV driver coach. Provide actionable, behavior-based training recommendations to improve efficiency, safety, and battery longevity. Return STRICT JSON only.`;
    const prompt = `Generate a personalized EV driver coaching plan.

DRIVER: ${driver_name || 'Unknown'}
EV EXPERIENCE: ${experience_months} months
AVG ENERGY USE: ${avg_kwh_per_mile ?? 'unknown'} kWh/mile
HARD BRAKING: ${hard_braking_events_per_100mi ?? 'unknown'} events per 100 mi
HARD ACCEL: ${hard_accel_events_per_100mi ?? 'unknown'} events per 100 mi
REGEN USE: ${avg_regen_use_percent ?? 'unknown'}%
ROUTE TYPES: ${JSON.stringify(route_types)}
SELF-REPORTED WEAK AREAS: ${JSON.stringify(weak_areas)}

Respond ONLY with JSON:
{
  "overall_score": 0,
  "strengths": ["..."],
  "gaps": ["..."],
  "training_modules": [
    { "title": "string", "objective": "string", "duration_minutes": 0, "exercises": ["..."], "priority": "high|medium|low" }
  ],
  "weekly_practice_drills": ["..."],
  "expected_efficiency_gain_percent": 0,
  "expected_kwh_savings_per_year": 0,
  "kpis_to_track": ["..."],
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('driver-train error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate coaching plan' });
  }
});

// POST /api/ai/maintenance-predict — predictive EV maintenance
router.post('/maintenance-predict', auth, async (req, res) => {
  try {
    if (noKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }
    const {
      vehicle_model,
      mileage,
      age_months,
      battery_health_percent,
      avg_kwh_per_mile,
      cycles_completed,
      last_service_date,
      operating_climate,
      duty_cycle = 'mixed',
    } = req.body || {};

    if (!vehicle_model && !mileage) {
      return res.status(400).json({ error: 'vehicle_model or mileage required' });
    }

    const systemPrompt = `You are a predictive maintenance expert for electric vehicles. Forecast upcoming service needs from telemetry and history. Return STRICT JSON only.`;
    const prompt = `Predict EV maintenance needs.

VEHICLE: ${vehicle_model || 'unknown'}
MILEAGE: ${mileage ?? 'unknown'}
AGE (months): ${age_months ?? 'unknown'}
BATTERY HEALTH: ${battery_health_percent ?? 'unknown'}%
AVG kWh/mi: ${avg_kwh_per_mile ?? 'unknown'}
CYCLES COMPLETED: ${cycles_completed ?? 'unknown'}
LAST SERVICE: ${last_service_date || 'unknown'}
CLIMATE: ${operating_climate || 'unknown'}
DUTY CYCLE: ${duty_cycle}

Respond ONLY with JSON:
{
  "summary": "string",
  "battery_outlook": {
    "predicted_health_in_12_months_percent": 0,
    "estimated_remaining_useful_life_years": 0,
    "risk_level": "low|medium|high"
  },
  "predicted_services": [
    { "service": "string", "due_in_miles": 0, "due_by_date": "YYYY-MM-DD", "estimated_cost_usd": 0, "priority": "critical|high|medium|low", "rationale": "string" }
  ],
  "anomaly_flags": ["..."],
  "preventive_actions": ["..."],
  "estimated_annual_maintenance_cost_usd": 0,
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('maintenance-predict error:', err);
    res.status(500).json({ error: err.message || 'Failed to predict maintenance' });
  }
});

// POST /api/ai/carbon-impact — structured carbon reduction analysis
router.post('/carbon-impact', auth, async (req, res) => {
  try {
    if (noKey()) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured.' });
    }
    const {
      fleet_size,
      ice_vehicle_count,
      ev_vehicle_count,
      annual_miles_per_vehicle = 25000,
      avg_mpg_ice = 18,
      avg_kwh_per_mile_ev = 0.35,
      grid_renewable_percent = 25,
      region,
      reporting_year,
    } = req.body || {};

    if (!fleet_size && !(ice_vehicle_count || ev_vehicle_count)) {
      return res.status(400).json({ error: 'fleet_size (or ice_vehicle_count + ev_vehicle_count) required' });
    }

    const systemPrompt = `You are a fleet sustainability analyst. Quantify the carbon impact of an electrification plan with transparent assumptions. Return STRICT JSON only.`;
    const prompt = `Compute the carbon impact of this fleet mix.

FLEET SIZE: ${fleet_size ?? (Number(ice_vehicle_count || 0) + Number(ev_vehicle_count || 0))}
ICE VEHICLES: ${ice_vehicle_count ?? 'unknown'}
EVs: ${ev_vehicle_count ?? 'unknown'}
ANNUAL MILES/VEHICLE: ${annual_miles_per_vehicle}
ICE MPG: ${avg_mpg_ice}
EV kWh/mi: ${avg_kwh_per_mile_ev}
GRID RENEWABLES: ${grid_renewable_percent}%
REGION: ${region || 'unspecified'}
REPORTING YEAR: ${reporting_year || new Date().getFullYear()}

Respond ONLY with JSON:
{
  "summary": "string",
  "annual_co2e_metric_tons": {
    "ice_emissions": 0,
    "ev_well_to_wheel": 0,
    "net_savings": 0
  },
  "lifetime_savings_metric_tons_co2e": 0,
  "equivalents": {
    "trees_planted": 0,
    "homes_powered_for_a_year": 0,
    "gasoline_gallons_avoided": 0
  },
  "assumptions": ["..."],
  "improvement_levers": [
    { "lever": "string", "additional_savings_tco2e": 0, "estimated_cost_usd": 0 }
  ],
  "scope1_scope2_breakdown": { "scope1_tco2e": 0, "scope2_tco2e": 0 },
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('carbon-impact error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute carbon impact' });
  }
});

// POST /api/ai/transition-roadmap — phased fleet electrification plan
router.post('/transition-roadmap', auth, async (req, res) => {
  try {
    const {
      fleet_size,
      current_ice_count,
      annual_capex_budget,
      target_completion_year,
      priority_segments = [],
      constraints = [],
    } = req.body || {};

    if (!fleet_size || !target_completion_year) {
      return res.status(400).json({ error: 'fleet_size and target_completion_year required' });
    }

    const systemPrompt = `You are a fleet electrification strategist. Produce a phased transition roadmap with annual targets, budget allocations, and risk mitigations. Return STRICT JSON only.`;
    const prompt = `Build a roadmap.

FLEET SIZE: ${fleet_size}
CURRENT ICE COUNT: ${current_ice_count ?? fleet_size}
ANNUAL CAPEX BUDGET: $${annual_capex_budget ?? 'unspecified'}
TARGET COMPLETION YEAR: ${target_completion_year}
PRIORITY SEGMENTS: ${JSON.stringify(priority_segments)}
CONSTRAINTS: ${JSON.stringify(constraints)}

Respond ONLY with JSON:
{
  "summary": "string",
  "phases": [
    { "year": 0, "ev_replacements": 0, "capex_usd": 0, "charging_installs": 0, "key_milestones": ["..."] }
  ],
  "total_capex_usd": 0,
  "estimated_savings_usd_at_target": 0,
  "risks": ["..."],
  "kpis_to_track": ["..."],
  "incentives_to_pursue": ["..."],
  "disclaimer": "string"
}`;

    const response = await callOpenRouter(prompt, systemPrompt);
    const text = response.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);

    res.json({
      analysis: parsed || { raw: text },
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    console.error('transition-roadmap error:', err);
    res.status(500).json({ error: err.message || 'Failed to build transition roadmap' });
  }
});

module.exports = router;
