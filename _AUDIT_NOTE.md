# Audit Apply Notes — AIFleetElectrificationPlanner

Audit source: `_AUDIT/reports/batch_03.md` (#32). Verdict: partial-build (19 routes, 2 AI endpoints).

## Original recommendations

Missing AI counterparts:
- `/cost-optimize` — TCO optimization
- `/charging-network-plan` — charging infrastructure
- `/route-optimize` — EV route optimization
- `/driver-train` — driving behavior coaching
- `/maintenance-predict` — predictive maintenance
- `/carbon-impact` — carbon reduction
- `/transition-roadmap` — phased plan

## Implementations applied

Added three AI endpoints to `backend/src/routes/ai.js`. Existing pattern was a generic `/chat` with feature_id; new endpoints provide structured JSON outputs.

1. `POST /api/ai/cost-optimize` — TCO comparison ICE vs EV with per-vehicle breakdown, payback, recommendations.
2. `POST /api/ai/charging-network-plan` — depot-level charger sizing (Level 2 / DC Fast), peak kW, capex, demand-charge warning, phasing.
3. `POST /api/ai/transition-roadmap` — phased multi-year roadmap with budget, milestones, KPIs, incentives.

Each uses `callOpenRouter` (existing) + a small `tryParseJson` helper to robustly extract the JSON payload. Syntax-checked via `node --check`.

## Backlog (prioritized)

### Mechanical
- `/route-optimize` — promote existing `/chat` route-optimization usage to a structured endpoint.
- `/driver-train` — structured EV driving behavior coaching.
- `/maintenance-predict` — wraps battery + trip data.
- `/carbon-impact` — already in `carbonFootprint.js` non-AI; add structured AI version.

### Needs creds / external
- Vehicle quote integration with manufacturers/dealers.
- Federal/state grant + tax credit feeds.
- Real-time telematics integration.

### Needs product decision
- Permit/regulatory tracking workflow.
- Lease vs. buy financing decision tree.

### Custom features
- Real-time fleet telematics streaming.
- Charging-window optimization with weather + solar inputs.
- ESG reporting wrapper.

## Apply pass 3 (frontend)

**Stack:** React (CRA) under `frontend/`, Express backend under `backend/`.

**FE already wired.** `frontend/src/App.js` registers an `AICenter` page (covers all 15 chat-style features via `POST /api/ai/chat`) and an `AIPlanner` page (covers the 3 structured endpoints `POST /api/ai/cost-optimize`, `POST /api/ai/charging-network-plan`, `POST /api/ai/transition-roadmap`). `frontend/src/services/api.js` handles JWT via `localStorage.getItem('token')` Bearer header. Each CRUD feature in `App.js` also has per-feature AI buttons routed through the chat endpoint. Nothing to add.

**Files written/modified:** none.
**Syntax check:** N/A (no new code).

## Apply pass 4 (mechanical backlog)

Promoted the four mechanical-backlog AI features into structured endpoints + AIPlanner tabs.

**New backend endpoints in `backend/src/routes/ai.js`:**
1. `POST /api/ai/route-optimize` — structured EV route optimization (origin/destination, battery, charging stops, kWh/mi).
2. `POST /api/ai/driver-train` — EV driver coaching plan (training modules, drills, expected efficiency gain, KPIs).
3. `POST /api/ai/maintenance-predict` — predictive maintenance (battery outlook, due services with priority, anomaly flags, annual cost).
4. `POST /api/ai/carbon-impact` — structured carbon impact (annual tCO2e, equivalents, scope1/scope2, improvement levers).

All four reuse existing `callOpenRouter` + `tryParseJson`, run under existing `auth` middleware (JWT bearer + rate limiter), and return **HTTP 503** with a descriptive error when `OPENROUTER_API_KEY` is not configured (via new `noKey()` helper, scoped to the new handlers; existing endpoints untouched).

**Frontend changes in `frontend/src/pages/AIPlanner.js`:**
- Added 4 new tabs (Route Optimize, Driver Coaching, Maintenance Predict, Carbon Impact) with form state, form renderers, and submit handlers.
- Submits via existing `api.aiCustom(path, payload)` which already injects the JWT bearer header.
- 503 responses are surfaced as `AI service unavailable (503): …` instead of a generic error.
- New `lucide-react` icons (`Map`, `GraduationCap`, `Wrench`, `Leaf`) — already a dep, no new packages.

**No new dependencies. No working code touched.**

**Syntax check:**
- `node --check backend/src/routes/ai.js` — PASS
- `node --check frontend/src/pages/AIPlanner.js` — PASS

**Smoke test (with `OPENROUTER_API_KEY=""`):**
- `/api/health` → `{status:ok}`
- All 4 endpoints with valid bearer → **HTTP 503** `{"error":"AI service unavailable: OPENROUTER_API_KEY not configured."}`
- Without bearer → HTTP 401 (existing `auth` middleware)
- Missing required field → HTTP 400 (`origin and destination required`, etc.)

**Backlog remaining:** all NEEDS-CREDS or PRODUCT-DECISION (vehicle-quote integration, grant feeds, telematics streaming, permit workflow, lease-vs-buy tree, ESG wrapper).

