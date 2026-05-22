require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Make pool available to routes
app.locals.pool = pool;

// Apply rate limiter to AI routes
app.use('/api/ai', rateLimiter);
app.use('/api/vehicles/:id/assess', rateLimiter);
app.use('/api/routes/:id/ev-feasibility', rateLimiter);
app.use('/api/budget-planning/ai-scenarios', rateLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/routes', require('./routes/routePlanning'));
app.use('/api/charging-stations', require('./routes/chargingStations'));
app.use('/api/cost-analysis', require('./routes/costAnalysis'));
app.use('/api/battery-health', require('./routes/batteryHealth'));
app.use('/api/energy-forecast', require('./routes/energyForecast'));
app.use('/api/transition-plans', require('./routes/transitionPlans'));
app.use('/api/carbon-footprint', require('./routes/carbonFootprint'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/driver-assignment', require('./routes/driverAssignment'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/trip-planner', require('./routes/tripPlanner'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/vehicles', require('./routes/vehicleAssess'));
app.use('/api/routes', require('./routes/routeFeasibility'));
app.use('/api/budget-planning', require('./routes/budgetScenarios'));
// Apply pass 5 — backlog extensions (quotes, grants, telematics, permits, finance, charging-window, ESG)
app.use('/api/ext', require('./routes/extensions'));
app.use('/api/agentic-fleet-manager', require('./routes/agenticFleetManager'));
app.use('/api/telematics-stream', require('./routes/telematicsStream'));
app.use('/api/charge-optimization', require('./routes/chargeOptimization'));
app.use('/api/driver-engagement', require('./routes/driverEngagement'));
app.use('/api/supply-chain-analysis', require('./routes/supplyChainAnalysis'));
app.use('/api/sustainability-report', require('./routes/sustainabilityReport'));
app.use('/api/financing-options', require('./routes/financingOptions'));
app.use('/api/charger-queue-forecast', require('./routes/chargerQueueForecast'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Custom Views — 4 synthesized fleet-electrification endpoints
app.use('/api/custom-views', require('./routes/customViews'));


// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('../routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
