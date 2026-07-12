-- TransitOps initial schema
-- Owner: Hriday

CREATE TYPE user_role AS ENUM (
  'admin',
  'fleet_manager',
  'dispatcher',
  'safety_officer',
  'financial_analyst'
);

CREATE TYPE vehicle_type AS ENUM ('van', 'truck', 'trailer', 'bike');
CREATE TYPE vehicle_status AS ENUM ('available', 'on_trip', 'in_shop', 'retired');
CREATE TYPE driver_status AS ENUM ('available', 'on_trip', 'off_duty', 'suspended');
CREATE TYPE trip_status AS ENUM ('draft', 'dispatched', 'completed', 'cancelled');
CREATE TYPE maintenance_status AS ENUM ('open', 'closed');
CREATE TYPE expense_category AS ENUM ('fuel', 'maintenance', 'toll', 'other');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  registration_number VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  vehicle_type vehicle_type NOT NULL,
  max_load_kg NUMERIC(12, 2) NOT NULL,
  odometer_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
  acquisition_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'available',
  region VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  license_number VARCHAR(64) NOT NULL UNIQUE,
  license_category VARCHAR(32) NOT NULL,
  license_expiry DATE NOT NULL,
  contact_number VARCHAR(32) NOT NULL,
  safety_score NUMERIC(5, 2) NOT NULL DEFAULT 100,
  status driver_status NOT NULL DEFAULT 'available',
  region VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  source VARCHAR(200) NOT NULL,
  destination VARCHAR(200) NOT NULL,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  driver_id INTEGER NOT NULL REFERENCES drivers(id),
  cargo_weight_kg NUMERIC(12, 2) NOT NULL,
  planned_distance_km NUMERIC(12, 2) NOT NULL,
  actual_distance_km NUMERIC(12, 2),
  fuel_consumed_liters NUMERIC(12, 2),
  final_odometer_km NUMERIC(12, 2),
  revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status trip_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE TABLE maintenance_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  title VARCHAR(160) NOT NULL,
  description TEXT,
  cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  service_date DATE NOT NULL,
  status maintenance_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);

CREATE TABLE fuel_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  trip_id INTEGER REFERENCES trips(id),
  liters NUMERIC(12, 2) NOT NULL,
  cost NUMERIC(14, 2) NOT NULL,
  log_date DATE NOT NULL,
  odometer_km NUMERIC(12, 2),
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id),
  category expense_category NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  reference_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_region ON vehicles(region);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_maintenance_vehicle ON maintenance_logs(vehicle_id);
CREATE INDEX idx_fuel_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
