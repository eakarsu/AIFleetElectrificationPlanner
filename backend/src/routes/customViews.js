// ============================================================
// === Custom Views - 4 synthesized fleet-electrification endpoints ===
// 2 VIZ: replacement schedule timeline + TCO heatmap
// 2 NON-VIZ: EV transition plan PDF + replacement rules editor (CRUD)
// ============================================================
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In-memory store for replacement rules (vehicle thresholds)
const rulesStore = {
  nextId: 5,
  rows: [
    { id: 1, vehicle_type: 'Sedan',  max_age_years: 8,  max_mileage: 120000, target_ev_model: 'Tesla Model 3',    priority: 'high' },
    { id: 2, vehicle_type: 'SUV',    max_age_years: 9,  max_mileage: 140000, target_ev_model: 'Tesla Model Y',    priority: 'high' },
    { id: 3, vehicle_type: 'Truck',  max_age_years: 10, max_mileage: 180000, target_ev_model: 'Ford F-150 Lightning', priority: 'medium' },
    { id: 4, vehicle_type: 'Van',    max_age_years: 9,  max_mileage: 150000, target_ev_model: 'Ford E-Transit',  priority: 'medium' }
  ]
};

// ---------- helper: load vehicles, tolerate DB absence ----------
async function loadVehicles(req) {
  const pool = req.app.locals.pool;
  if (!pool) return [];
  try {
    const r = await pool.query('SELECT id, make, model, year, type, range_miles, current_mileage, status FROM vehicles ORDER BY year ASC, id ASC LIMIT 50');
    return r.rows || [];
  } catch (_) { return []; }
}

// ============================================================
// VIZ 1: GET /api/custom-views/replacement-schedule
// Returns timeline rows: { vehicle, replace_year, est_cost, target_ev }
// ============================================================
router.get('/replacement-schedule', auth, async (req, res) => {
  try {
    const vehicles = await loadVehicles(req);
    const currentYear = new Date().getFullYear();
    const ruleFor = (type) => rulesStore.rows.find(r => r.vehicle_type === type) || rulesStore.rows[0];

    const seedVehicles = vehicles.length ? vehicles : [
      { id: 1, make: 'Ford', model: 'Transit', year: 2017, type: 'Van',    current_mileage: 142000 },
      { id: 2, make: 'Chevy', model: 'Silverado', year: 2016, type: 'Truck',  current_mileage: 168000 },
      { id: 3, make: 'Toyota', model: 'Camry', year: 2019, type: 'Sedan',  current_mileage: 95000 },
      { id: 4, make: 'Honda', model: 'CR-V', year: 2018, type: 'SUV',    current_mileage: 110000 },
      { id: 5, make: 'Ford', model: 'F-150', year: 2015, type: 'Truck',  current_mileage: 195000 },
      { id: 6, make: 'Nissan', model: 'Altima', year: 2020, type: 'Sedan',  current_mileage: 78000 },
      { id: 7, make: 'Ram', model: 'ProMaster', year: 2017, type: 'Van',    current_mileage: 135000 }
    ];

    const rows = seedVehicles.map(v => {
      const rule = ruleFor(v.type);
      const age = currentYear - (v.year || currentYear);
      const ageGap = Math.max(0, rule.max_age_years - age);
      const mileageGap = Math.max(0, rule.max_mileage - (v.current_mileage || 0));
      const yearsByMileage = Math.round(mileageGap / 18000);
      const yearsToReplace = Math.min(ageGap, yearsByMileage);
      const replaceYear = currentYear + Math.max(0, Math.min(yearsToReplace, 6));
      const baseCost = v.type === 'Truck' ? 72000 : v.type === 'SUV' ? 58000 : v.type === 'Van' ? 65000 : 45000;
      return {
        vehicle_id: v.id,
        vehicle: `${v.make} ${v.model} (${v.year})`,
        type: v.type,
        current_mileage: v.current_mileage,
        replace_year: replaceYear,
        est_cost: baseCost,
        target_ev: rule.target_ev_model,
        priority: rule.priority
      };
    });

    res.json({
      view: 'replacement-schedule',
      generated_at: new Date().toISOString(),
      current_year: currentYear,
      timeline_years: [currentYear, currentYear + 1, currentYear + 2, currentYear + 3, currentYear + 4, currentYear + 5, currentYear + 6],
      rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// VIZ 2: GET /api/custom-views/tco-heatmap
// Grid: vehicle x year matrix of TCO ($k)
// ============================================================
router.get('/tco-heatmap', auth, async (req, res) => {
  try {
    const vehicles = await loadVehicles(req);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear + i);

    const seed = vehicles.length ? vehicles.slice(0, 8) : [
      { id: 1, make: 'Tesla', model: 'Model 3', year: 2024, type: 'Sedan' },
      { id: 2, make: 'Tesla', model: 'Model Y', year: 2024, type: 'SUV' },
      { id: 3, make: 'Ford',  model: 'F-150 Lightning', year: 2024, type: 'Truck' },
      { id: 4, make: 'Chevy', model: 'Bolt', year: 2024, type: 'Sedan' },
      { id: 5, make: 'Rivian', model: 'R1T', year: 2024, type: 'Truck' },
      { id: 6, make: 'Hyundai', model: 'Ioniq 5', year: 2024, type: 'SUV' },
      { id: 7, make: 'Ford',  model: 'E-Transit', year: 2024, type: 'Van' },
      { id: 8, make: 'Kia',   model: 'EV6', year: 2024, type: 'SUV' }
    ];

    const cells = seed.map((v, vi) => {
      const baseTco = (v.type === 'Truck' ? 78 : v.type === 'SUV' ? 62 : v.type === 'Van' ? 70 : 48);
      const perYear = years.map((y, yi) => {
        // simulate cost: increases with age, drops if EV is newer
        const cost = +(baseTco + (yi * 4.5) - (vi * 0.4)).toFixed(1);
        return { year: y, tco_k: cost };
      });
      return {
        vehicle_id: v.id,
        vehicle: `${v.make} ${v.model}`,
        type: v.type,
        cells: perYear
      };
    });

    res.json({
      view: 'tco-heatmap',
      currency: 'USD (thousands)',
      years,
      min_tco_k: 40,
      max_tco_k: 120,
      vehicles: cells
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NON-VIZ 1: POST /api/custom-views/transition-plan-pdf
// Returns a synthesized PDF (text-form). For demo: returns base64 PDF blob.
// ============================================================
router.post('/transition-plan-pdf', auth, async (req, res) => {
  try {
    const {
      org_name = 'Fleet Org',
      fleet_size = 50,
      target_ev_percent = 80,
      timeline_years = 5,
      budget = 2500000
    } = req.body || {};

    const lines = [
      `EV Transition Plan — ${org_name}`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      `Fleet size: ${fleet_size}`,
      `Target EV share: ${target_ev_percent}%`,
      `Timeline: ${timeline_years} years`,
      `Budget: $${Number(budget).toLocaleString()}`,
      ``,
      `Phase 1 (Year 1): Replace ${Math.round(fleet_size * 0.15)} highest-mileage ICE vehicles with EV equivalents.`,
      `Phase 2 (Year 2-3): Install ${Math.round(fleet_size * 0.25)} L2 chargers at depots; replace ${Math.round(fleet_size * 0.35)} more vehicles.`,
      `Phase 3 (Year 4-${timeline_years}): Convert remaining viable vehicles; deploy ${Math.round(fleet_size * 0.10)} DC fast chargers.`,
      ``,
      `Estimated CO2 reduction: ${Math.round(fleet_size * target_ev_percent * 4.2)} metric tons/year.`,
      `Estimated annual fuel savings: $${(fleet_size * target_ev_percent * 35).toLocaleString()}.`
    ];

    // Minimal valid PDF
    const text = lines.join('\\n');
    const escaped = text.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const pdf = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${escaped.length + 60} >> stream`,
      'BT /F1 12 Tf 50 740 Td',
      `(${escaped}) Tj`,
      'ET',
      'endstream endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      'xref 0 6',
      '0000000000 65535 f',
      'trailer << /Size 6 /Root 1 0 R >>',
      'startxref 0',
      '%%EOF'
    ].join('\n');

    const base64 = Buffer.from(pdf, 'utf8').toString('base64');

    res.json({
      view: 'transition-plan-pdf',
      generated_at: new Date().toISOString(),
      filename: `ev-transition-plan-${(org_name || 'fleet').toLowerCase().replace(/\s+/g, '-')}.pdf`,
      content_type: 'application/pdf',
      bytes: pdf.length,
      pdf_base64: base64,
      summary: {
        org_name, fleet_size, target_ev_percent, timeline_years, budget,
        phases: 3,
        co2_reduction_tons_per_year: Math.round(fleet_size * target_ev_percent * 4.2),
        annual_savings_usd: fleet_size * target_ev_percent * 35
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NON-VIZ 2: CRUD /api/custom-views/rules — replacement thresholds editor
// ============================================================
router.get('/rules', auth, (req, res) => {
  res.json({ view: 'rules', rows: rulesStore.rows });
});

router.post('/rules', auth, (req, res) => {
  const { vehicle_type, max_age_years, max_mileage, target_ev_model, priority } = req.body || {};
  if (!vehicle_type) return res.status(400).json({ error: 'vehicle_type required' });
  const row = {
    id: rulesStore.nextId++,
    vehicle_type,
    max_age_years: Number(max_age_years) || 8,
    max_mileage: Number(max_mileage) || 120000,
    target_ev_model: target_ev_model || 'Tesla Model 3',
    priority: priority || 'medium'
  };
  rulesStore.rows.push(row);
  res.json(row);
});

router.put('/rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = rulesStore.rows.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const cur = rulesStore.rows[idx];
  const next = { ...cur, ...req.body, id };
  if (req.body.max_age_years != null) next.max_age_years = Number(req.body.max_age_years);
  if (req.body.max_mileage != null) next.max_mileage = Number(req.body.max_mileage);
  rulesStore.rows[idx] = next;
  res.json(next);
});

router.delete('/rules/:id', auth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const before = rulesStore.rows.length;
  rulesStore.rows = rulesStore.rows.filter(r => r.id !== id);
  if (rulesStore.rows.length === before) return res.status(404).json({ error: 'not found' });
  res.json({ deleted: id });
});

module.exports = router;
