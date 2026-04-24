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

module.exports = router;
