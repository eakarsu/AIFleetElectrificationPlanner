const router = require('express').Router();
const auth = require('../middleware/auth');

let rows = [
  { id: 1, depot_name: 'North Depot', forecast_window: '06:00-10:00', queued_vehicles: 18, available_ports: 10, peak_wait_minutes: 42, overload_risk: 'high', status: 'stagger_departures' },
  { id: 2, depot_name: 'Airport Yard', forecast_window: '22:00-02:00', queued_vehicles: 9, available_ports: 12, peak_wait_minutes: 8, overload_risk: 'low', status: 'normal' },
];
const nextId = () => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

router.use(auth);
router.get('/', (req, res) => res.json(rows));
router.post('/', (req, res) => {
  const row = { id: nextId(), ...req.body };
  rows.unshift(row);
  res.status(201).json(row);
});
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = rows.findIndex((row) => row.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  rows[idx] = { ...rows[idx], ...req.body, id };
  res.json(rows[idx]);
});
router.delete('/:id', (req, res) => {
  rows = rows.filter((row) => row.id !== Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
