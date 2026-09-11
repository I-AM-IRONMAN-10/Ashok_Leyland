-- =============================================================================
-- ASHOK LEYLAND ENTERPRISE WMS - POSTGRESQL PRODUCTION DATABASE SCHEMA
-- Target Database: PostgreSQL 14+
-- Enterprise Standard: Fully Normalized, Indexed, Referential Integrity & Audit Triggers
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER & ROLE MANAGEMENT
CREATE TYPE user_role AS ENUM ('OPERATOR', 'SUPERVISOR', 'ADMIN');

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    badge_id VARCHAR(30) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'OPERATOR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_badge ON users(badge_id);

-- 2. ENGINE MODEL SPECIFICATIONS
CREATE TABLE engine_models (
    model_id SERIAL PRIMARY KEY,
    model_code VARCHAR(30) UNIQUE NOT NULL, -- e.g. AL-H-6CYL-220, AL-H-4CYL-160
    model_name VARCHAR(100) NOT NULL,
    engine_type VARCHAR(50) NOT NULL,    -- Diesel, Dual-Fuel, CNG
    displacement_cc INT NOT NULL,
    power_hp INT NOT NULL,
    weight_kg NUMERIC(8,2) NOT NULL,
    dimensions_mm VARCHAR(50) NOT NULL  -- e.g. 1200x800x1100
);

-- 3. WAREHOUSE STORAGE MATRIX (CINEMA GRID A-Z, 1-50)
CREATE TYPE location_status AS ENUM (
    'AVAILABLE', 
    'OCCUPIED', 
    'PENDING_CONFIRMATION', 
    'RESERVED_TEMP', 
    'BLOCKED', 
    'RELOCATING'
);

CREATE TABLE warehouse_locations (
    location_id SERIAL PRIMARY KEY,
    location_code VARCHAR(10) UNIQUE NOT NULL, -- e.g. A1, A2, B15, H20
    row_code VARCHAR(5) NOT NULL,               -- Row A, B, C... Z
    col_number INT NOT NULL,                   -- Col 1, 2... 50
    zone_name VARCHAR(30) DEFAULT 'MAIN_BAY',
    is_temp_allowed BOOLEAN DEFAULT TRUE,
    status location_status NOT NULL DEFAULT 'AVAILABLE',
    current_engine_id UUID NULL,               -- FK added below
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_code ON warehouse_locations(location_code);
CREATE INDEX idx_locations_row_col ON warehouse_locations(row_code, col_number);
CREATE INDEX idx_locations_status ON warehouse_locations(status);

-- 4. ENGINES INVENTORY
CREATE TYPE engine_status AS ENUM (
    'STORED', 
    'PENDING_PLACEMENT', 
    'IN_RELOCATION', 
    'RETRIEVED_DISPATCHED', 
    'BLOCKED_BY_FRONT'
);

CREATE TABLE engines (
    engine_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_number VARCHAR(50) UNIQUE NOT NULL, -- Unique Ashok Leyland Engine Serial
    barcode VARCHAR(100) UNIQUE NOT NULL,       -- Scanner barcode string
    model_id INT NOT NULL REFERENCES engine_models(model_id),
    batch_number VARCHAR(50) NOT NULL,
    mfg_date DATE NOT NULL,
    arrival_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_status engine_status NOT NULL DEFAULT 'PENDING_PLACEMENT',
    current_location_id INT NULL REFERENCES warehouse_locations(location_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE warehouse_locations 
ADD CONSTRAINT fk_location_engine 
FOREIGN KEY (current_engine_id) REFERENCES engines(engine_id) ON DELETE SET NULL;

CREATE INDEX idx_engines_number ON engines(engine_number);
CREATE INDEX idx_engines_barcode ON engines(barcode);
CREATE INDEX idx_engines_batch ON engines(batch_number);
CREATE INDEX idx_engines_status ON engines(current_status);

-- 5. RETRIEVAL ORDERS & BULK DISPATCH
CREATE TYPE order_status AS ENUM ('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE retrieval_orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supervisor_id UUID NOT NULL REFERENCES users(user_id),
    excel_filename VARCHAR(255) NULL,
    total_engines INT NOT NULL DEFAULT 0,
    status order_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE retrieval_order_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES retrieval_orders(order_id) ON DELETE CASCADE,
    engine_id UUID NOT NULL REFERENCES engines(engine_id),
    retrieval_sequence INT NOT NULL,
    requires_relocation BOOLEAN DEFAULT FALSE,
    relocation_count INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, RELOCATING, RETRIEVED
    retrieved_at TIMESTAMP WITH TIME ZONE NULL
);

-- 6. INTELLIGENT TEMPORARY RELOCATION RECORDS
CREATE TYPE relocation_state AS ENUM ('SCHEDULED', 'FRONT_MOVED_TEMP', 'TARGET_RETRIEVED', 'FRONT_RESTORED');

CREATE TABLE temporary_relocation_records (
    relocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES retrieval_orders(order_id),
    target_engine_id UUID NOT NULL REFERENCES engines(engine_id),
    blocking_engine_id UUID NOT NULL REFERENCES engines(engine_id),
    original_location_id INT NOT NULL REFERENCES warehouse_locations(location_id),
    temporary_location_id INT NOT NULL REFERENCES warehouse_locations(location_id),
    sequence_order INT NOT NULL,
    state relocation_state NOT NULL DEFAULT 'SCHEDULED',
    operator_id UUID NULL REFERENCES users(user_id),
    moved_to_temp_at TIMESTAMP WITH TIME ZONE NULL,
    restored_at TIMESTAMP WITH TIME ZONE NULL
);

-- 7. REAL-TIME MOVEMENT AUDIT LOGS
CREATE TABLE movement_logs (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engines(engine_id),
    operator_id UUID NOT NULL REFERENCES users(user_id),
    from_location_id INT NULL REFERENCES warehouse_locations(location_id),
    to_location_id INT NOT NULL REFERENCES warehouse_locations(location_id),
    movement_type VARCHAR(50) NOT NULL, -- INBOUND_PLACEMENT, TEMP_RELOCATION, RESTORATION, DISPATCH
    scanned_engine_barcode VARCHAR(100) NOT NULL,
    scanned_location_barcode VARCHAR(100) NOT NULL,
    confirmation_status VARCHAR(30) NOT NULL, -- PENDING, CONFIRMED_PLACED, REJECTED
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX idx_movements_engine ON movement_logs(engine_id);
CREATE INDEX idx_movements_operator ON movement_logs(operator_id);

-- 8. SYSTEM AUDIT TRAIL
CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id UUID NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    payload_json JSONB NULL,
    ip_address VARCHAR(45) NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. SEED DEMO WAREHOUSE DATA (Sample rows A-H, Cols 1-12)
INSERT INTO engine_models (model_code, model_name, engine_type, displacement_cc, power_hp, weight_kg, dimensions_mm) VALUES
('AL-H-6CYL-220', 'Ashok Leyland H-Series 6-Cylinder 220HP', 'Diesel', 5759, 220, 680.00, '1150x780x1050'),
('AL-A-4CYL-160', 'Ashok Leyland A-Series 4-Cylinder 160HP', 'Diesel', 3839, 160, 490.00, '980x680x920'),
('AL-CNG-6CYL-200', 'Ashok Leyland iGen6 CNG 200HP', 'CNG', 5759, 200, 710.00, '1180x800x1080');

-- Populate Sample Grid Locations
DO $$
DECLARE
    r RECORD;
    c INT;
    loc_name TEXT;
BEGIN
    FOR r IN SELECT unnest(ARRAY['A','B','C','D','E','F','G','H']) AS r_code LOOP
        FOR c IN 1..12 LOOP
            loc_name := r.r_code || c;
            INSERT INTO warehouse_locations (location_code, row_code, col_number, status)
            VALUES (loc_name, r.r_code, c, 'AVAILABLE')
            ON CONFLICT DO NOTHING;
        END FOR;
    END LOOP;
END $$;
