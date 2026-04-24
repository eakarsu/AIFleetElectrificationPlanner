require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Make pool available to routes
app.locals.pool = pool;

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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
