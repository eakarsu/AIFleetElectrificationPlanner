// Real-time fleet telematics: stream vehicle data.
const router = require('express').Router();
const auth = require('../middleware/auth');

// POST /api/telematics-stream/ingest { vehicle_id, samples:[{ts,lat,lon,soc_pct,speed_kph,energy_kwh}] }
router.post('/ingest', auth, async (req, res) => {
  try {
    const { vehicle_id, samples = [] } = req.body || {};
    if (!vehicle_id || !samples.length) return res.status(400).json({ error: 'vehicle_id + samples[] required' });
    const pool = req.app.locals.pool;
    let inserted = 0;
    for (const s of samples.slice(0, 1000)) {
      try {
        await pool.query(
          `INSERT INTO telematics_samples (vehicle_id, ts, lat, lon, soc_pct, speed_kph, energy_kwh) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [vehicle_id, s.ts || new Date(), s.lat, s.lon, s.soc_pct, s.speed_kph, s.energy_kwh]
        );
        inserted++;
      } catch { break; }
    }
    return res.json({ vehicle_id, inserted, submitted: samples.length });
  } catch (e) {
    return res.status(500).json({ error: 'ingest failed' });
  }
});

// GET /api/telematics-stream/snapshot/:vehicle_id
router.get('/snapshot/:vehicle_id', auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const r = await pool.query(`SELECT * FROM telematics_samples WHERE vehicle_id = $1 ORDER BY ts DESC LIMIT 1`, [req.params.vehicle_id]).catch(() => ({ rows: [] }));
    return res.json({ vehicle_id: req.params.vehicle_id, latest: r.rows[0] || null });
  } catch (e) {
    return res.status(500).json({ error: 'snapshot failed' });
  }
});

module.exports = router;
