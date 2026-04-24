require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop tables if exist
    await client.query(`
      DROP TABLE IF EXISTS trip_plans CASCADE;
      DROP TABLE IF EXISTS compliance_records CASCADE;
      DROP TABLE IF EXISTS budgets CASCADE;
      DROP TABLE IF EXISTS driver_assignments CASCADE;
      DROP TABLE IF EXISTS maintenance_schedules CASCADE;
      DROP TABLE IF EXISTS carbon_footprints CASCADE;
      DROP TABLE IF EXISTS energy_forecasts CASCADE;
      DROP TABLE IF EXISTS transition_plans CASCADE;
      DROP TABLE IF EXISTS cost_analyses CASCADE;
      DROP TABLE IF EXISTS battery_health CASCADE;
      DROP TABLE IF EXISTS charging_stations CASCADE;
      DROP TABLE IF EXISTS route_plans CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create tables
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'fleet_manager',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE vehicles (
        id SERIAL PRIMARY KEY,
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        battery_capacity_kwh DECIMAL(10,2),
        range_miles INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        license_plate VARCHAR(20),
        vin VARCHAR(50),
        current_mileage INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE route_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        distance_miles DECIMAL(10,2),
        estimated_duration VARCHAR(100),
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        stops TEXT,
        status VARCHAR(50) DEFAULT 'planned',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE charging_stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,6),
        longitude DECIMAL(10,6),
        charger_type VARCHAR(50) NOT NULL,
        power_kw INTEGER,
        num_ports INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'available',
        cost_per_kwh DECIMAL(10,4),
        network VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE cost_analyses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        analysis_type VARCHAR(50),
        current_fuel_cost DECIMAL(12,2),
        ev_energy_cost DECIMAL(12,2),
        maintenance_savings DECIMAL(12,2),
        total_tco_ice DECIMAL(12,2),
        total_tco_ev DECIMAL(12,2),
        payback_years DECIMAL(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE battery_health (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        health_percentage DECIMAL(5,2),
        cycles_completed INTEGER,
        max_capacity_kwh DECIMAL(10,2),
        current_capacity_kwh DECIMAL(10,2),
        degradation_rate DECIMAL(5,3),
        last_checked TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE energy_forecasts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        period VARCHAR(50),
        fleet_size INTEGER,
        total_kwh DECIMAL(12,2),
        peak_demand_kw DECIMAL(10,2),
        off_peak_kwh DECIMAL(12,2),
        cost_estimate DECIMAL(12,2),
        renewable_percentage DECIMAL(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE transition_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        current_fleet_size INTEGER,
        target_ev_percentage DECIMAL(5,2),
        timeline_months INTEGER,
        budget DECIMAL(15,2),
        phase VARCHAR(50),
        milestones TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE carbon_footprints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        period VARCHAR(50),
        ice_emissions_kg DECIMAL(12,2),
        ev_emissions_kg DECIMAL(12,2),
        savings_kg DECIMAL(12,2),
        trees_equivalent INTEGER,
        report_type VARCHAR(50) DEFAULT 'monthly',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE maintenance_schedules (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        service_type VARCHAR(100) NOT NULL,
        scheduled_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        cost_estimate DECIMAL(10,2),
        technician VARCHAR(255),
        priority VARCHAR(20) DEFAULT 'medium',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE driver_assignments (
        id SERIAL PRIMARY KEY,
        driver_name VARCHAR(255) NOT NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        route_id INTEGER REFERENCES route_plans(id) ON DELETE SET NULL,
        shift_start TIMESTAMP,
        shift_end TIMESTAMP,
        status VARCHAR(50) DEFAULT 'assigned',
        efficiency_score DECIMAL(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE budgets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        allocated_amount DECIMAL(15,2),
        spent_amount DECIMAL(15,2) DEFAULT 0,
        period VARCHAR(50),
        fiscal_year INTEGER,
        department VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE compliance_records (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        regulation VARCHAR(255),
        jurisdiction VARCHAR(100),
        deadline DATE,
        status VARCHAR(50) DEFAULT 'pending',
        requirement_details TEXT,
        current_progress INTEGER DEFAULT 0,
        penalty_risk VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE trip_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        start_date DATE,
        end_date DATE,
        origin VARCHAR(255),
        destination VARCHAR(255),
        total_distance DECIMAL(10,2),
        daily_budget DECIMAL(10,2),
        total_budget DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'planned',
        itinerary TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed users
    const passwordHash = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('Admin User', 'admin@fleet.com', '${passwordHash}', 'admin'),
      ('John Manager', 'john@fleet.com', '${passwordHash}', 'fleet_manager'),
      ('Sarah Analyst', 'sarah@fleet.com', '${passwordHash}', 'analyst');
    `);

    // Seed vehicles (15 items)
    await client.query(`
      INSERT INTO vehicles (make, model, year, type, battery_capacity_kwh, range_miles, status, license_plate, vin, current_mileage) VALUES
      ('Tesla', 'Model 3', 2024, 'Sedan', 75.00, 358, 'active', 'EV-001', '5YJ3E1EA1PF000001', 12500),
      ('Tesla', 'Model Y', 2024, 'SUV', 75.00, 330, 'active', 'EV-002', '5YJ3E1EA1PF000002', 8200),
      ('Ford', 'F-150 Lightning', 2024, 'Truck', 131.00, 320, 'active', 'EV-003', '1FTFW1E87PF000003', 15600),
      ('Chevrolet', 'Bolt EUV', 2024, 'SUV', 65.00, 247, 'active', 'EV-004', '1G1FZ6S07P4000004', 22100),
      ('Rivian', 'R1T', 2024, 'Truck', 135.00, 328, 'active', 'EV-005', '7FCTGAAL5PN000005', 5400),
      ('BMW', 'iX', 2024, 'SUV', 111.50, 324, 'active', 'EV-006', 'WBY73AW09P7000006', 9800),
      ('Mercedes', 'EQS', 2024, 'Sedan', 107.80, 350, 'maintenance', 'EV-007', 'W1K6G7GB3PA000007', 31200),
      ('Hyundai', 'Ioniq 5', 2024, 'SUV', 77.40, 303, 'active', 'EV-008', 'KM8KRDAF0PU000008', 11300),
      ('Kia', 'EV6', 2024, 'SUV', 77.40, 310, 'active', 'EV-009', 'KNDC5DLC0P5000009', 7600),
      ('Volkswagen', 'ID.4', 2024, 'SUV', 82.00, 275, 'active', 'EV-010', 'WVWZZZ3CZPE000010', 18900),
      ('Polestar', '2', 2024, 'Sedan', 78.00, 270, 'active', 'EV-011', 'LPSED3KA3PN000011', 14200),
      ('Nissan', 'Ariya', 2024, 'SUV', 87.00, 304, 'charging', 'EV-012', '5N1BJ3AE0PC000012', 6700),
      ('Audi', 'e-tron GT', 2024, 'Sedan', 93.40, 238, 'active', 'EV-013', 'WAUAGEF43PN000013', 20500),
      ('Lucid', 'Air', 2024, 'Sedan', 112.00, 516, 'active', 'EV-014', '1LBA2DCA0PD000014', 3200),
      ('BYD', 'Seal', 2024, 'Sedan', 82.56, 321, 'active', 'EV-015', 'LGXCE4CB6P1000015', 1800),
      ('Tesla', 'Semi', 2024, 'Truck', 500.00, 500, 'active', 'EV-016', '5YJ3E1EA1PF000016', 45000),
      ('Ford', 'E-Transit', 2024, 'Van', 68.00, 126, 'active', 'EV-017', '1FTBW9CK2PKA00017', 28500)
    `);

    // Seed route plans (15 items)
    await client.query(`
      INSERT INTO route_plans (name, origin, destination, distance_miles, estimated_duration, vehicle_id, stops, status) VALUES
      ('Bay Area Daily', 'San Francisco, CA', 'San Jose, CA', 48.5, '55 min', 1, '[]', 'active'),
      ('LA to Vegas', 'Los Angeles, CA', 'Las Vegas, NV', 270.0, '4h 15min', 3, '[{"stop":"Barstow","charge_time":"25min"}]', 'planned'),
      ('Seattle Loop', 'Seattle, WA', 'Tacoma, WA', 34.0, '40 min', 2, '[]', 'active'),
      ('NYC to Boston', 'New York, NY', 'Boston, MA', 215.0, '3h 45min', 4, '[{"stop":"New Haven","charge_time":"20min"}]', 'planned'),
      ('Denver Metro', 'Denver, CO', 'Boulder, CO', 30.0, '35 min', 5, '[]', 'active'),
      ('Miami Corridor', 'Miami, FL', 'Fort Lauderdale, FL', 30.0, '35 min', 6, '[]', 'active'),
      ('Chicago Suburbs', 'Chicago, IL', 'Naperville, IL', 33.0, '40 min', 7, '[]', 'completed'),
      ('Austin Circle', 'Austin, TX', 'Round Rock, TX', 20.0, '25 min', 8, '[]', 'active'),
      ('Portland Run', 'Portland, OR', 'Salem, OR', 47.0, '50 min', 9, '[]', 'planned'),
      ('Phoenix Loop', 'Phoenix, AZ', 'Scottsdale, AZ', 12.0, '20 min', 10, '[]', 'active'),
      ('Atlanta Metro', 'Atlanta, GA', 'Marietta, GA', 20.0, '30 min', 11, '[]', 'active'),
      ('DC Beltway', 'Washington, DC', 'Arlington, VA', 8.0, '15 min', 12, '[]', 'active'),
      ('Detroit Industrial', 'Detroit, MI', 'Dearborn, MI', 10.0, '18 min', 13, '[]', 'active'),
      ('San Diego Coast', 'San Diego, CA', 'Carlsbad, CA', 35.0, '38 min', 14, '[]', 'planned'),
      ('Dallas Express', 'Dallas, TX', 'Fort Worth, TX', 33.0, '40 min', 15, '[]', 'active')
    `);

    // Seed charging stations (15 items)
    await client.query(`
      INSERT INTO charging_stations (name, location, latitude, longitude, charger_type, power_kw, num_ports, status, cost_per_kwh, network) VALUES
      ('HQ Supercharger', 'Company HQ - Lot A', 37.7749, -122.4194, 'DC Fast', 250, 8, 'available', 0.28, 'Tesla Supercharger'),
      ('Downtown Level 2', 'Downtown Parking Garage', 37.7849, -122.4094, 'Level 2', 19, 12, 'available', 0.18, 'ChargePoint'),
      ('Warehouse DC Fast', 'Distribution Center', 37.6879, -122.4702, 'DC Fast', 150, 4, 'available', 0.32, 'EVgo'),
      ('Airport Charging Hub', 'SFO Airport Lot B', 37.6213, -122.3790, 'DC Fast', 350, 6, 'available', 0.35, 'Electrify America'),
      ('Mall Level 2', 'Westfield Mall', 37.7599, -122.4148, 'Level 2', 11, 8, 'available', 0.15, 'Blink'),
      ('Fleet Depot Alpha', 'North Fleet Depot', 37.8044, -122.2712, 'DC Fast', 200, 10, 'available', 0.25, 'Fleet Owned'),
      ('Fleet Depot Beta', 'South Fleet Depot', 37.5585, -122.2711, 'DC Fast', 200, 8, 'available', 0.25, 'Fleet Owned'),
      ('Hotel Charging', 'Marriott Downtown', 37.7869, -122.4009, 'Level 2', 19, 4, 'available', 0.20, 'ChargePoint'),
      ('Rest Stop Charger', 'I-5 Rest Area', 37.4419, -122.1430, 'DC Fast', 150, 6, 'available', 0.30, 'Electrify America'),
      ('Office Park L2', 'Tech Park Campus', 37.3861, -122.0839, 'Level 2', 7, 20, 'available', 0.12, 'ChargePoint'),
      ('Grocery Store', 'Whole Foods Market', 37.7649, -122.4294, 'Level 2', 11, 4, 'available', 0.00, 'Free'),
      ('City Fast Charge', 'Public Lot - Main St', 37.7919, -122.3964, 'DC Fast', 100, 4, 'occupied', 0.38, 'EVgo'),
      ('Solar Canopy Station', 'Solar Park', 37.5485, -122.0590, 'DC Fast', 175, 8, 'available', 0.22, 'Fleet Owned'),
      ('Highway Supercharger', 'I-280 Service Plaza', 37.4849, -122.2294, 'DC Fast', 250, 12, 'available', 0.31, 'Tesla Supercharger'),
      ('Overnight Depot', 'Central Bus Depot', 37.7559, -122.4484, 'Level 2', 19, 30, 'available', 0.10, 'Fleet Owned')
    `);

    // Seed cost analyses (15 items)
    await client.query(`
      INSERT INTO cost_analyses (name, vehicle_id, analysis_type, current_fuel_cost, ev_energy_cost, maintenance_savings, total_tco_ice, total_tco_ev, payback_years, notes) VALUES
      ('Tesla Model 3 vs Camry', 1, 'TCO', 4200.00, 1200.00, 1500.00, 42000.00, 38000.00, 3.20, 'Strong ROI for high-mileage sedan use'),
      ('Model Y vs RAV4', 2, 'TCO', 4800.00, 1350.00, 1800.00, 48000.00, 44500.00, 2.80, 'SUV segment comparison'),
      ('F-150 Lightning vs F-150', 3, 'TCO', 7200.00, 2100.00, 2500.00, 65000.00, 58000.00, 4.10, 'Truck segment - higher upfront but savings'),
      ('Bolt EUV vs Equinox', 4, 'TCO', 3600.00, 1050.00, 1200.00, 35000.00, 30000.00, 2.50, 'Budget EV strong value proposition'),
      ('Rivian R1T vs Tacoma', 5, 'TCO', 5400.00, 1600.00, 2000.00, 55000.00, 52000.00, 5.20, 'Premium truck - longer payback'),
      ('BMW iX vs X5', 6, 'TCO', 6000.00, 1700.00, 2200.00, 72000.00, 68000.00, 4.50, 'Luxury SUV comparison'),
      ('EQS vs S-Class', 7, 'TCO', 5800.00, 1650.00, 2100.00, 95000.00, 92000.00, 6.00, 'Ultra-luxury segment'),
      ('Ioniq 5 vs Tucson', 8, 'TCO', 3900.00, 1100.00, 1400.00, 38000.00, 34000.00, 2.90, 'Mid-range EV excellent value'),
      ('EV6 vs Sportage', 9, 'TCO', 3900.00, 1100.00, 1400.00, 39000.00, 35000.00, 3.00, 'Similar to Ioniq 5 economics'),
      ('ID.4 vs Tiguan', 10, 'TCO', 4100.00, 1150.00, 1500.00, 40000.00, 36000.00, 3.30, 'European brand EV transition'),
      ('Polestar 2 vs Volvo S60', 11, 'TCO', 4500.00, 1300.00, 1600.00, 45000.00, 42000.00, 3.80, 'Scandinavian comparison'),
      ('Ariya vs Rogue', 12, 'TCO', 4000.00, 1150.00, 1350.00, 38000.00, 35000.00, 3.10, 'Nissan lineup comparison'),
      ('e-tron GT vs A7', 13, 'TCO', 5500.00, 1550.00, 1900.00, 75000.00, 70000.00, 5.50, 'Performance luxury segment'),
      ('Lucid Air vs Model S', 14, 'TCO', 5200.00, 1450.00, 1800.00, 88000.00, 85000.00, 6.50, 'Ultra-premium EV comparison'),
      ('Semi vs Diesel Semi', 16, 'TCO', 45000.00, 12000.00, 15000.00, 350000.00, 280000.00, 3.50, 'Commercial trucking - massive savings')
    `);

    // Seed battery health (15 items)
    await client.query(`
      INSERT INTO battery_health (vehicle_id, health_percentage, cycles_completed, max_capacity_kwh, current_capacity_kwh, degradation_rate, last_checked, notes) VALUES
      (1, 97.50, 185, 75.00, 73.13, 0.015, '2024-03-15', 'Excellent condition'),
      (2, 98.20, 120, 75.00, 73.65, 0.012, '2024-03-14', 'Near new condition'),
      (3, 95.80, 240, 131.00, 125.50, 0.018, '2024-03-13', 'Good - heavy use truck'),
      (4, 93.10, 380, 65.00, 60.52, 0.022, '2024-03-12', 'Moderate degradation expected at mileage'),
      (5, 99.10, 65, 135.00, 133.79, 0.008, '2024-03-11', 'Nearly perfect - low usage'),
      (6, 96.40, 150, 111.50, 107.49, 0.016, '2024-03-10', 'Good health'),
      (7, 91.20, 450, 107.80, 98.31, 0.025, '2024-03-09', 'Higher degradation - flagged for monitoring'),
      (8, 97.00, 170, 77.40, 75.08, 0.014, '2024-03-08', 'Good condition'),
      (9, 98.50, 110, 77.40, 76.24, 0.010, '2024-03-07', 'Excellent health'),
      (10, 94.60, 290, 82.00, 77.57, 0.020, '2024-03-06', 'Moderate wear - normal for mileage'),
      (11, 96.10, 210, 78.00, 74.96, 0.017, '2024-03-05', 'Good health'),
      (12, 98.80, 90, 87.00, 85.96, 0.009, '2024-03-04', 'Near new'),
      (13, 93.80, 310, 93.40, 87.61, 0.021, '2024-03-03', 'Moderate - high performance usage'),
      (14, 99.50, 40, 112.00, 111.44, 0.005, '2024-03-02', 'Pristine condition'),
      (15, 99.80, 20, 82.56, 82.40, 0.003, '2024-03-01', 'Brand new')
    `);

    // Seed energy forecasts (15 items)
    await client.query(`
      INSERT INTO energy_forecasts (name, period, fleet_size, total_kwh, peak_demand_kw, off_peak_kwh, cost_estimate, renewable_percentage, notes) VALUES
      ('Q1 2024 Forecast', 'Q1 2024', 15, 45000.00, 850.00, 28000.00, 8100.00, 35.00, 'Winter months - higher consumption'),
      ('Q2 2024 Forecast', 'Q2 2024', 15, 42000.00, 780.00, 26500.00, 7560.00, 42.00, 'Spring - moderate usage'),
      ('Q3 2024 Forecast', 'Q3 2024', 17, 48000.00, 920.00, 30000.00, 8640.00, 55.00, 'Summer - AC increases load'),
      ('Q4 2024 Forecast', 'Q4 2024', 17, 46500.00, 880.00, 29000.00, 8370.00, 38.00, 'Fall transition'),
      ('January Daily', 'Jan 2024', 15, 15500.00, 750.00, 9800.00, 2790.00, 30.00, 'Cold weather impact'),
      ('February Daily', 'Feb 2024', 15, 14200.00, 720.00, 9000.00, 2556.00, 32.00, 'Shorter month'),
      ('March Projection', 'Mar 2024', 15, 15300.00, 740.00, 9600.00, 2754.00, 38.00, 'Spring transition'),
      ('Peak Summer Day', 'Jul 15 2024', 17, 2800.00, 920.00, 1600.00, 504.00, 60.00, 'Maximum solar offset'),
      ('Fleet Expansion +5', 'H2 2024', 22, 62000.00, 1200.00, 39000.00, 11160.00, 45.00, 'After fleet expansion'),
      ('Night Charging Plan', 'Nightly', 17, 1200.00, 340.00, 1200.00, 144.00, 25.00, 'Off-peak only strategy'),
      ('Solar Integration', 'Annual 2024', 17, 180000.00, 920.00, 112000.00, 27000.00, 50.00, 'With rooftop solar'),
      ('Grid Only Baseline', 'Annual 2024', 17, 180000.00, 920.00, 112000.00, 32400.00, 0.00, 'No renewable comparison'),
      ('Weekend Forecast', 'Weekends', 8, 4800.00, 380.00, 3200.00, 864.00, 45.00, 'Reduced weekend fleet'),
      ('Holiday Schedule', 'Dec 2024', 10, 9500.00, 520.00, 6200.00, 1710.00, 28.00, 'Holiday reduced operations'),
      ('2025 Annual Plan', 'Annual 2025', 25, 250000.00, 1500.00, 155000.00, 37500.00, 60.00, 'Projected with 25 vehicles')
    `);

    // Seed transition plans (15 items)
    await client.query(`
      INSERT INTO transition_plans (name, current_fleet_size, target_ev_percentage, timeline_months, budget, phase, milestones, status) VALUES
      ('Phase 1: Sedans', 50, 20.00, 12, 750000.00, 'Phase 1', '["Order vehicles","Install chargers","Train drivers"]', 'active'),
      ('Phase 2: SUVs', 50, 40.00, 24, 1200000.00, 'Phase 2', '["Replace SUV fleet","Expand charging"]', 'planned'),
      ('Phase 3: Trucks', 50, 60.00, 36, 2000000.00, 'Phase 3', '["Electric truck deployment","Heavy-duty infrastructure"]', 'draft'),
      ('Phase 4: Full Fleet', 50, 100.00, 48, 3500000.00, 'Phase 4', '["Complete transition","Decommission ICE"]', 'draft'),
      ('Quick Win - Commuters', 20, 50.00, 6, 400000.00, 'Pilot', '["Deploy 10 EVs","Measure results"]', 'completed'),
      ('Delivery Van Program', 30, 30.00, 18, 900000.00, 'Phase 1', '["E-Transit deployment","Route optimization"]', 'active'),
      ('Executive Fleet', 10, 100.00, 6, 800000.00, 'Complete', '["All executive cars EV"]', 'completed'),
      ('Regional Expansion - West', 100, 25.00, 24, 2500000.00, 'Phase 1', '["West coast facilities","Regional charging"]', 'active'),
      ('Regional Expansion - East', 100, 25.00, 30, 2800000.00, 'Phase 1', '["East coast deployment"]', 'planned'),
      ('Last Mile Delivery', 40, 75.00, 18, 1600000.00, 'Phase 2', '["Urban delivery EVs","Depot charging"]', 'active'),
      ('Airport Shuttle', 15, 100.00, 12, 600000.00, 'Phase 1', '["Electric shuttle buses"]', 'active'),
      ('School Bus Pilot', 20, 25.00, 24, 1500000.00, 'Pilot', '["5 electric school buses"]', 'planned'),
      ('Municipal Fleet', 80, 30.00, 36, 3000000.00, 'Phase 1', '["City vehicles first"]', 'draft'),
      ('Ride-Share Fleet', 200, 50.00, 24, 8000000.00, 'Phase 2', '["100 EVs for ride-share"]', 'planned'),
      ('Long-Haul Trucking', 25, 20.00, 48, 5000000.00, 'Phase 1', '["Tesla Semi deployment","Route charging"]', 'draft')
    `);

    // Seed carbon footprints (15 items)
    await client.query(`
      INSERT INTO carbon_footprints (name, vehicle_id, period, ice_emissions_kg, ev_emissions_kg, savings_kg, trees_equivalent, report_type, notes) VALUES
      ('Model 3 - Q1', 1, 'Q1 2024', 2850.00, 420.00, 2430.00, 112, 'quarterly', 'High savings from sedan replacement'),
      ('Model Y - Q1', 2, 'Q1 2024', 3100.00, 480.00, 2620.00, 121, 'quarterly', 'SUV segment savings'),
      ('F-150 Lightning - Q1', 3, 'Q1 2024', 5200.00, 750.00, 4450.00, 205, 'quarterly', 'Truck replacement huge impact'),
      ('Bolt EUV - Jan', 4, 'Jan 2024', 980.00, 145.00, 835.00, 38, 'monthly', 'Monthly tracking'),
      ('Rivian R1T - Jan', 5, 'Jan 2024', 1100.00, 165.00, 935.00, 43, 'monthly', 'Adventure truck offset'),
      ('BMW iX - Annual', 6, 'Annual 2023', 11500.00, 1700.00, 9800.00, 452, 'annual', 'Full year analysis'),
      ('EQS - Annual', 7, 'Annual 2023', 10800.00, 1600.00, 9200.00, 424, 'annual', 'Luxury sedan impact'),
      ('Fleet Total - Q1', NULL, 'Q1 2024', 48500.00, 7200.00, 41300.00, 1906, 'quarterly', 'All vehicles combined'),
      ('Fleet Total - 2023', NULL, 'Annual 2023', 185000.00, 27500.00, 157500.00, 7269, 'annual', 'Annual fleet report'),
      ('Ioniq 5 - Feb', 8, 'Feb 2024', 920.00, 135.00, 785.00, 36, 'monthly', 'Consistent savings'),
      ('EV6 - Feb', 9, 'Feb 2024', 890.00, 130.00, 760.00, 35, 'monthly', 'Similar to Ioniq platform'),
      ('ID.4 - Q1', 10, 'Q1 2024', 2950.00, 440.00, 2510.00, 116, 'quarterly', 'Good mid-range savings'),
      ('Semi - Jan', 16, 'Jan 2024', 15000.00, 2200.00, 12800.00, 591, 'monthly', 'Massive commercial impact'),
      ('E-Transit - Q1', 17, 'Q1 2024', 4800.00, 710.00, 4090.00, 189, 'quarterly', 'Delivery van savings'),
      ('Fleet Projection 2024', NULL, 'Annual 2024', 200000.00, 28000.00, 172000.00, 7940, 'annual', 'Projected with fleet growth')
    `);

    // Seed maintenance schedules (15 items)
    await client.query(`
      INSERT INTO maintenance_schedules (vehicle_id, service_type, scheduled_date, status, cost_estimate, technician, priority, notes) VALUES
      (1, 'Tire Rotation', '2024-04-15', 'scheduled', 80.00, 'Mike Johnson', 'low', 'Regular 10K mile rotation'),
      (2, 'Cabin Air Filter', '2024-04-20', 'scheduled', 45.00, 'Mike Johnson', 'low', 'Annual replacement'),
      (3, 'Brake Inspection', '2024-04-10', 'scheduled', 120.00, 'Sarah Tech', 'medium', 'Regen braking check included'),
      (4, 'Battery Coolant Check', '2024-04-25', 'scheduled', 150.00, 'Sarah Tech', 'high', 'Higher degradation noted'),
      (5, 'Software Update', '2024-04-05', 'completed', 0.00, 'OTA', 'medium', 'Firmware v2.4.1'),
      (6, 'Tire Replacement', '2024-05-01', 'scheduled', 1200.00, 'Mike Johnson', 'medium', 'All season tires'),
      (7, 'Full Diagnostic', '2024-04-08', 'in_progress', 250.00, 'Sarah Tech', 'high', 'Investigating charging issue'),
      (8, 'Wiper Blades', '2024-04-30', 'scheduled', 35.00, 'Mike Johnson', 'low', 'Standard replacement'),
      (9, '12V Battery Check', '2024-05-15', 'scheduled', 65.00, 'Sarah Tech', 'medium', '12V auxiliary battery test'),
      (10, 'Wheel Alignment', '2024-05-10', 'scheduled', 150.00, 'Mike Johnson', 'medium', 'After pothole damage report'),
      (11, 'HVAC Service', '2024-05-20', 'scheduled', 200.00, 'Sarah Tech', 'low', 'Pre-summer AC check'),
      (12, 'Suspension Check', '2024-04-22', 'scheduled', 175.00, 'Mike Johnson', 'medium', 'Noise reported by driver'),
      (13, 'Performance Calibration', '2024-05-05', 'scheduled', 300.00, 'EV Specialist', 'medium', 'High-performance tune'),
      (14, 'Initial Service', '2024-06-01', 'scheduled', 0.00, 'Lucid Service', 'low', 'First scheduled service'),
      (16, 'Commercial Inspection', '2024-04-12', 'scheduled', 500.00, 'Heavy Duty Team', 'high', 'DOT compliance inspection')
    `);

    // Seed driver assignments (15 items)
    await client.query(`
      INSERT INTO driver_assignments (driver_name, vehicle_id, route_id, shift_start, shift_end, status, efficiency_score, notes) VALUES
      ('Alex Rivera', 1, 1, '2024-04-01 07:00', '2024-04-01 15:00', 'active', 92.50, 'Top performer - efficient driving'),
      ('Maria Santos', 2, 3, '2024-04-01 07:00', '2024-04-01 15:00', 'active', 88.30, 'Good range optimization'),
      ('James Chen', 3, 2, '2024-04-01 06:00', '2024-04-01 14:00', 'active', 85.70, 'Learning EV driving habits'),
      ('Lisa Park', 4, 5, '2024-04-01 08:00', '2024-04-01 16:00', 'active', 94.20, 'Best efficiency score'),
      ('David Brown', 5, 6, '2024-04-01 07:00', '2024-04-01 15:00', 'active', 87.10, 'Comfortable with large EV'),
      ('Emma Wilson', 6, 7, '2024-04-01 09:00', '2024-04-01 17:00', 'active', 90.80, 'Luxury vehicle specialist'),
      ('Carlos Mendez', 8, 8, '2024-04-01 06:00', '2024-04-01 14:00', 'active', 91.40, 'Early shift preferred'),
      ('Sarah Kim', 9, 9, '2024-04-01 07:00', '2024-04-01 15:00', 'off_duty', 89.60, 'On vacation this week'),
      ('Michael Lee', 10, 10, '2024-04-01 08:00', '2024-04-01 16:00', 'active', 86.90, 'Phoenix heat management expert'),
      ('Jennifer Adams', 11, 11, '2024-04-01 07:00', '2024-04-01 15:00', 'active', 93.10, 'Consistently high scores'),
      ('Robert Taylor', 12, 12, '2024-04-01 06:30', '2024-04-01 14:30', 'active', 88.80, 'DC area specialist'),
      ('Amy Zhang', 14, 14, '2024-04-01 07:00', '2024-04-01 15:00', 'active', 95.00, 'Highest efficiency - eco driving'),
      ('Tom Jackson', 16, NULL, '2024-04-01 05:00', '2024-04-01 17:00', 'active', 82.50, 'Semi truck driver - long haul'),
      ('Nicole Foster', 17, NULL, '2024-04-01 06:00', '2024-04-01 14:00', 'active', 87.30, 'Delivery van route'),
      ('Kevin Wright', 15, 15, '2024-04-01 07:00', '2024-04-01 15:00', 'active', 90.20, 'New EV driver - adapting well')
    `);

    // Seed budgets (15 items)
    await client.query(`
      INSERT INTO budgets (name, category, allocated_amount, spent_amount, period, fiscal_year, department, status, notes) VALUES
      ('Vehicle Procurement Q1', 'vehicles', 500000.00, 385000.00, 'Q1', 2024, 'Fleet Operations', 'active', '5 new EVs purchased'),
      ('Charging Infrastructure', 'infrastructure', 250000.00, 142000.00, 'Annual', 2024, 'Facilities', 'active', 'Charger installation ongoing'),
      ('Driver Training Program', 'training', 50000.00, 28000.00, 'Annual', 2024, 'HR', 'active', 'EV orientation and eco-driving'),
      ('Maintenance Budget', 'maintenance', 120000.00, 35000.00, 'Annual', 2024, 'Fleet Operations', 'active', 'Lower than ICE maintenance'),
      ('Energy Costs', 'energy', 200000.00, 48000.00, 'Annual', 2024, 'Operations', 'active', 'Electricity for fleet charging'),
      ('Insurance Premiums', 'insurance', 180000.00, 90000.00, 'Annual', 2024, 'Finance', 'active', 'EV-adjusted premiums'),
      ('Software & Telematics', 'technology', 75000.00, 62000.00, 'Annual', 2024, 'IT', 'active', 'Fleet management software'),
      ('Solar Panel Installation', 'infrastructure', 350000.00, 0.00, 'Q3-Q4', 2024, 'Facilities', 'planned', 'Depot solar canopy project'),
      ('Vehicle Procurement Q2', 'vehicles', 400000.00, 0.00, 'Q2', 2024, 'Fleet Operations', 'planned', '4 additional EVs'),
      ('Battery Warranty Extension', 'warranty', 85000.00, 42500.00, 'Annual', 2024, 'Fleet Operations', 'active', 'Extended warranties for fleet'),
      ('Compliance & Reporting', 'compliance', 30000.00, 12000.00, 'Annual', 2024, 'Legal', 'active', 'Regulatory compliance costs'),
      ('Marketing - Green Fleet', 'marketing', 25000.00, 8000.00, 'Annual', 2024, 'Marketing', 'active', 'Sustainability messaging'),
      ('Emergency Repairs Fund', 'maintenance', 50000.00, 5000.00, 'Annual', 2024, 'Fleet Operations', 'active', 'Contingency fund'),
      ('Grid Upgrade Contribution', 'infrastructure', 100000.00, 100000.00, 'Q1', 2024, 'Facilities', 'completed', 'Utility grid upgrade share'),
      ('2025 Planning Budget', 'planning', 40000.00, 10000.00, 'Q4', 2024, 'Strategy', 'active', 'Next year transition planning')
    `);

    // Seed compliance records (15 items)
    await client.query(`
      INSERT INTO compliance_records (name, regulation, jurisdiction, deadline, status, requirement_details, current_progress, penalty_risk, notes) VALUES
      ('CA ACT Rule', 'Advanced Clean Trucks', 'California', '2025-01-01', 'in_progress', 'Zero-emission truck sales mandate', 45, 'medium', 'Need to increase EV truck %'),
      ('CA Fleet Rule', 'Advanced Clean Fleets', 'California', '2024-01-01', 'compliant', 'Fleet reporting and transition plan', 100, 'low', 'Submitted on time'),
      ('EPA GHG Standards', 'EPA 2027 Standards', 'Federal', '2027-01-01', 'in_progress', 'Greenhouse gas emission limits', 30, 'low', 'On track with current plan'),
      ('CARB ZEV Mandate', 'Zero Emission Vehicle', 'California', '2025-06-01', 'in_progress', 'ZEV credit requirements', 60, 'medium', 'Need 3 more ZEV credits'),
      ('NY ZEV Program', 'NY Clean Cars', 'New York', '2026-01-01', 'planned', 'Following CA ZEV standards', 15, 'low', 'East coast expansion planning'),
      ('FMCSA Safety', 'Commercial Vehicle Safety', 'Federal', '2024-06-15', 'in_progress', 'EV-specific safety standards', 75, 'high', 'Semi truck compliance'),
      ('DOT Inspection', 'Annual DOT Inspection', 'Federal', '2024-04-30', 'in_progress', 'Commercial vehicle inspection', 80, 'high', 'Due next month'),
      ('OSHA EV Safety', 'Workplace EV Charging', 'Federal', '2024-12-31', 'compliant', 'High-voltage workplace safety', 100, 'low', 'Training completed'),
      ('ADA Charging Access', 'ADA Compliance', 'Federal', '2024-07-01', 'in_progress', 'Accessible charging stations', 65, 'medium', 'Retrofit 3 stations needed'),
      ('Local Building Code', 'Electrical Permits', 'Municipal', '2024-05-01', 'in_progress', 'Charging infrastructure permits', 90, 'low', 'Final inspection pending'),
      ('Tax Credit Filing', 'IRA EV Tax Credits', 'Federal', '2024-04-15', 'in_progress', 'Claim federal EV incentives', 85, 'low', 'Documentation ready'),
      ('State Incentive App', 'CA HVIP Vouchers', 'California', '2024-06-30', 'planned', 'Heavy-duty vehicle incentive', 20, 'low', 'Application in preparation'),
      ('ESG Reporting', 'SEC Climate Disclosure', 'Federal', '2025-03-01', 'planned', 'Climate-related financial disclosure', 10, 'medium', 'New requirement'),
      ('Utility Rate Filing', 'Commercial EV Rate', 'State', '2024-08-01', 'in_progress', 'Apply for EV fleet electricity rate', 40, 'low', 'Working with utility'),
      ('Insurance Compliance', 'Fleet Insurance', 'State', '2024-05-15', 'in_progress', 'EV fleet insurance requirements', 70, 'medium', 'Updating policies')
    `);

    // Seed trip plans (15 items)
    await client.query(`
      INSERT INTO trip_plans (name, vehicle_id, start_date, end_date, origin, destination, total_distance, daily_budget, total_budget, status, itinerary) VALUES
      ('SF to LA Road Trip', 1, '2024-05-01', '2024-05-03', 'San Francisco, CA', 'Los Angeles, CA', 382.00, 150.00, 450.00, 'planned', '[{"day":1,"route":"SF to SLO","miles":230,"charging":"$25"},{"day":2,"route":"SLO to LA","miles":152,"charging":"$18"}]'),
      ('Pacific Coast Tour', 2, '2024-06-15', '2024-06-20', 'Seattle, WA', 'San Francisco, CA', 808.00, 200.00, 1200.00, 'planned', '[]'),
      ('Texas Triangle', 3, '2024-05-10', '2024-05-13', 'Dallas, TX', 'Houston, TX', 480.00, 175.00, 700.00, 'planned', '[]'),
      ('Northeast Corridor', 4, '2024-05-20', '2024-05-22', 'Washington, DC', 'New York, NY', 226.00, 180.00, 540.00, 'planned', '[]'),
      ('Florida Keys Run', 5, '2024-06-01', '2024-06-04', 'Miami, FL', 'Key West, FL', 160.00, 160.00, 640.00, 'planned', '[]'),
      ('Great Lakes Tour', 6, '2024-07-01', '2024-07-07', 'Chicago, IL', 'Detroit, MI', 850.00, 200.00, 1400.00, 'planned', '[]'),
      ('Rocky Mountain Run', 8, '2024-06-10', '2024-06-14', 'Denver, CO', 'Salt Lake City, UT', 525.00, 190.00, 950.00, 'draft', '[]'),
      ('Southern Charm', 9, '2024-05-25', '2024-05-28', 'Atlanta, GA', 'Nashville, TN', 248.00, 170.00, 680.00, 'planned', '[]'),
      ('Route 66 Segment', 10, '2024-08-01', '2024-08-05', 'Chicago, IL', 'Oklahoma City, OK', 795.00, 185.00, 925.00, 'draft', '[]'),
      ('Wine Country Tour', 11, '2024-05-15', '2024-05-17', 'San Francisco, CA', 'Napa Valley, CA', 120.00, 250.00, 750.00, 'planned', '[]'),
      ('Desert Crossing', 14, '2024-06-20', '2024-06-22', 'Phoenix, AZ', 'Las Vegas, NV', 300.00, 160.00, 480.00, 'planned', '[]'),
      ('Delivery Route East', 17, '2024-04-15', '2024-04-15', 'Newark, NJ', 'Manhattan, NY', 45.00, 50.00, 50.00, 'active', '[]'),
      ('Delivery Route West', 17, '2024-04-16', '2024-04-16', 'Oakland, CA', 'San Jose, CA', 40.00, 45.00, 45.00, 'active', '[]'),
      ('Semi Long Haul Test', 16, '2024-05-05', '2024-05-07', 'Fremont, CA', 'Las Vegas, NV', 570.00, 300.00, 900.00, 'planned', '[]'),
      ('New England Fall', 2, '2024-10-01', '2024-10-05', 'Boston, MA', 'Burlington, VT', 420.00, 220.00, 1100.00, 'draft', '[]')
    `);

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
