-- ============================================
-- Multi-Tenant Clinic Scheduling System
-- Complete Database Schema (DDL)
-- ============================================
-- 
-- This schema implements a multi-tenant clinic scheduling system
-- with robust conflict detection, availability search, and resource management.
--
-- Key Design Decisions:
-- 1. Multi-tenant isolation via tenant_id on all tables
-- 2. Database-level exclusion constraints prevent double-booking
-- 3. Composite indexes optimized for time-range queries
-- 4. Separate tables for services, rooms, devices for flexibility
-- 5. Working hours and breaks support complex scheduling rules
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- Required for exclusion constraints

-- ============================================
-- 1. TENANTS TABLE (Multi-tenant root)
-- ============================================
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- Used for X-Tenant-Id header authentication
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Berlin',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast tenant lookup by slug (used on every request)
CREATE INDEX idx_tenants_slug ON tenants(slug);

COMMENT ON TABLE tenants IS 'Multi-tenant clinics - root of tenant isolation';

-- ============================================
-- 2. DOCTORS TABLE
-- ============================================
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    specialty VARCHAR(100),
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tenant-scoped doctor queries
CREATE INDEX idx_doctors_tenant_id ON doctors(tenant_id);
CREATE INDEX idx_doctors_tenant_active ON doctors(tenant_id, is_active) WHERE is_active = true;

COMMENT ON TABLE doctors IS 'Doctors belonging to tenants with configurable slot durations';

-- ============================================
-- 3. PATIENTS TABLE
-- ============================================
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_tenant ON patients(tenant_id);

COMMENT ON TABLE patients IS 'Patient information for appointment booking';

-- ============================================
-- 4. SERVICES TABLE
-- ============================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_min INTEGER NOT NULL CHECK (duration_min > 0),
    buffer_before_min INTEGER DEFAULT 0 CHECK (buffer_before_min >= 0),
    buffer_after_min INTEGER DEFAULT 0 CHECK (buffer_after_min >= 0),
    requires_room BOOLEAN DEFAULT TRUE,
    requires_device BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_tenant ON services(tenant_id);

COMMENT ON TABLE services IS 'Medical services with duration and buffer requirements for conflict detection';

-- ============================================
-- 5. ROOMS TABLE
-- ============================================
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rooms_tenant_active ON rooms(tenant_id, is_active);

COMMENT ON TABLE rooms IS 'Physical examination rooms - required for most appointments';

-- ============================================
-- 6. DEVICES TABLE
-- ============================================
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_tenant_active ON devices(tenant_id, is_active);

COMMENT ON TABLE devices IS 'Medical devices/equipment that can be scheduled for appointments';

-- ============================================
-- 7. WORKING HOURS TABLE
-- ============================================
CREATE TABLE working_hours (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),  -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT working_hours_time_check CHECK (end_time > start_time)
);

CREATE INDEX idx_working_hours_tenant_doctor_day ON working_hours(tenant_id, doctor_id, day_of_week);

COMMENT ON TABLE working_hours IS 'Doctor availability by day of week - used for availability search';

-- ============================================
-- 8. BREAKS TABLE
-- ============================================
CREATE TYPE resource_type AS ENUM ('doctor', 'room', 'device');

CREATE TABLE breaks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    resource_id INTEGER NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT breaks_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX idx_breaks_tenant_resource_time ON breaks(tenant_id, resource_type, resource_id, starts_at);

COMMENT ON TABLE breaks IS 'One-time breaks, holidays, and maintenance windows for any resource type';

-- ============================================
-- 8.5. RECURRING BREAKS TABLE
-- ============================================
CREATE TABLE recurring_breaks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type resource_type NOT NULL,
    resource_id INTEGER NOT NULL,
    day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recurring_breaks_time_check CHECK (end_time > start_time)
);

-- Indexes for performance
CREATE INDEX idx_recurring_breaks_tenant_resource 
    ON recurring_breaks(tenant_id, resource_type, resource_id)
    WHERE is_active = true;

CREATE INDEX idx_recurring_breaks_tenant_day 
    ON recurring_breaks(tenant_id, day_of_week)
    WHERE is_active = true;

COMMENT ON TABLE recurring_breaks IS 
'Recurring break patterns (daily/weekly) for doctors, rooms, and devices. Complements the breaks table for one-time events.';

COMMENT ON COLUMN recurring_breaks.day_of_week IS 
'NULL for daily breaks (applies every day), 0-6 for weekly breaks (0=Sunday, 1=Monday, ..., 6=Saturday)';

-- ============================================
-- 9. IDEMPOTENCY KEYS TABLE
-- ============================================
CREATE TABLE idempotency_keys (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    CONSTRAINT idempotency_keys_unique UNIQUE (tenant_id, idempotency_key)
);

-- Index for fast lookup and automatic cleanup of expired keys
CREATE INDEX idx_idempotency_keys_tenant_key ON idempotency_keys(tenant_id, idempotency_key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

COMMENT ON TABLE idempotency_keys IS 
'Stores idempotency keys to prevent duplicate requests. Keys expire after 24 hours.';

COMMENT ON COLUMN idempotency_keys.idempotency_key IS 
'Client-provided unique key (e.g., UUID) sent via Idempotency-Key header';

-- ============================================
-- 10. APPOINTMENTS TABLE (Core table - PARTITIONED BY MONTH)
-- ============================================
CREATE TYPE appointment_status AS ENUM ('scheduled', 'cancelled', 'completed', 'no_show');

-- Parent table (partitioned by starts_at month)
-- Note: SERIAL doesn't work well with partitioning, so we use a sequence explicitly
CREATE SEQUENCE appointments_id_seq;

CREATE TABLE appointments (
    id INTEGER NOT NULL DEFAULT nextval('appointments_id_seq'),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    starts_at TIMESTAMPTZ NOT NULL,  -- Stored in UTC (partition key)
    ends_at TIMESTAMPTZ NOT NULL,     -- Stored in UTC
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT appointments_time_check CHECK (ends_at > starts_at),
    PRIMARY KEY (id, starts_at)  -- Composite PK required for partitioning
) PARTITION BY RANGE (starts_at);

-- Create initial partitions: Current month + 2 months ahead
-- In production, use create_future_partitions() function to add more as needed

-- December 2025 (current month)
CREATE TABLE appointments_2025_12 PARTITION OF appointments
    FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- January 2026 (1 month ahead)
CREATE TABLE appointments_2026_01 PARTITION OF appointments
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

-- February 2026 (2 months ahead)
CREATE TABLE appointments_2026_02 PARTITION OF appointments
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

-- ============================================
-- 10. CRITICAL INDEXES FOR PERFORMANCE
-- ============================================
-- These indexes are optimized for:
-- 1. Availability search (<300ms target on local DB)
-- 2. Conflict detection (doctor, room, device)
-- 3. Multi-tenant isolation
-- 4. 50k bookings/day scale
-- ============================================

-- PRIMARY INDEX: Doctor conflict detection (most critical for 50k bookings/day)
CREATE INDEX idx_appointments_tenant_doctor_time 
    ON appointments(tenant_id, doctor_id, starts_at)
    WHERE status = 'scheduled';

-- Room conflict detection
CREATE INDEX idx_appointments_tenant_room_time 
    ON appointments(tenant_id, room_id, starts_at)
    WHERE status = 'scheduled';

-- Availability search optimization - composite index with status for range queries
-- This replaces the simpler idx_appointments_tenant_time with better filtering
CREATE INDEX idx_appointments_tenant_status_time 
    ON appointments(tenant_id, status, starts_at, ends_at)
    WHERE status IN ('scheduled', 'completed');

-- Calendar view: Get doctor's schedule for date range
CREATE INDEX idx_appointments_doctor_calendar 
    ON appointments(doctor_id, starts_at, ends_at)
    WHERE status != 'cancelled';

-- Tenant-scoped queries
CREATE INDEX idx_appointments_tenant_created 
    ON appointments(tenant_id, created_at DESC);

-- Working hours with availability filter (CRITICAL for availability search)
-- This partial index dramatically speeds up working hours lookups
CREATE INDEX idx_working_hours_tenant_doctor_day_available 
    ON working_hours(tenant_id, doctor_id, day_of_week, is_available)
    WHERE is_available = true;

-- Breaks time range optimization - adds ends_at for better overlap detection
CREATE INDEX idx_breaks_tenant_time_range 
    ON breaks(tenant_id, starts_at, ends_at);

-- Device conflict detection optimization - reverse lookup for faster checks
CREATE INDEX idx_appointment_devices_device_appointment 
    ON appointment_devices(device_id, appointment_id);

-- Doctor-service lookup optimization - composite index for availability search
CREATE INDEX idx_doctor_services_service_doctor 
    ON doctor_services(service_id, doctor_id);

COMMENT ON TABLE appointments IS 'Booked appointments with indexes optimized for conflict detection and availability search';

-- ============================================
-- 11. JUNCTION TABLES
-- ============================================

-- Service-Device relationships (which devices a service requires)
CREATE TABLE service_devices (
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, device_id)
);

CREATE INDEX idx_service_devices_service ON service_devices(service_id);
CREATE INDEX idx_service_devices_device ON service_devices(device_id);

COMMENT ON TABLE service_devices IS 'Many-to-many: Services that require specific devices';

-- Appointment-Device relationships (which devices an appointment uses)
-- Note: Cannot add FK to appointments(id) due to partitioning with composite PK
-- Application layer ensures referential integrity
CREATE TABLE appointment_devices (
    appointment_id INTEGER NOT NULL,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    PRIMARY KEY (appointment_id, device_id)
);

CREATE INDEX idx_appointment_devices_appointment ON appointment_devices(appointment_id);
CREATE INDEX idx_appointment_devices_device ON appointment_devices(device_id);

COMMENT ON TABLE appointment_devices IS 'Many-to-many: Devices used by appointments for conflict detection';

-- Doctor-Service relationships (which doctors can perform which services)
CREATE TABLE doctor_services (
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, service_id)
);

CREATE INDEX idx_doctor_services_doctor ON doctor_services(doctor_id);
CREATE INDEX idx_doctor_services_service ON doctor_services(service_id);

COMMENT ON TABLE doctor_services IS 'Many-to-many: Services that each doctor is qualified to perform';

-- ============================================
-- 12. EXCLUSION CONSTRAINT FOR CONFLICT PREVENTION
-- ============================================
-- Database-level guard to prevent double-booking at the database level
-- This enforces concurrency safety even with concurrent requests
-- Note: With partitioning, exclusion constraints must be added to each partition
-- We'll create a template for this that gets applied to each partition

-- Function to add exclusion constraint to a partition
CREATE OR REPLACE FUNCTION add_appointment_exclusion_constraint(partition_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I 
         EXCLUDE USING gist (
             doctor_id WITH =,
             tstzrange(starts_at, ends_at) WITH &&
         ) WHERE (status = ''scheduled'')',
        partition_name,
        partition_name || '_no_overlap'
    );
END;
$$ LANGUAGE plpgsql;

-- Apply exclusion constraint to all existing partitions
SELECT add_appointment_exclusion_constraint('appointments_2025_12');
SELECT add_appointment_exclusion_constraint('appointments_2026_01');
SELECT add_appointment_exclusion_constraint('appointments_2026_02');

-- Note: Room and device conflicts are handled at application level
-- due to complexity of many-to-many relationships

-- ============================================
-- 13. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 14. PARTITION MANAGEMENT FUNCTIONS
-- ============================================
-- 
-- These functions help manage partitions over time:
-- - Create new partitions as needed
-- - List existing partitions
-- - Archive or drop old partitions
-- ============================================

-- Function: Create a single partition for a given month
CREATE OR REPLACE FUNCTION create_appointments_partition(
    partition_date DATE
)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date TIMESTAMPTZ;
    end_date TIMESTAMPTZ;
    result TEXT;
BEGIN
    -- Generate partition name (e.g., appointments_2025_01)
    partition_name := 'appointments_' || to_char(partition_date, 'YYYY_MM');
    
    -- Calculate partition boundaries
    start_date := date_trunc('month', partition_date AT TIME ZONE 'UTC');
    end_date := date_trunc('month', partition_date + INTERVAL '1 month') AT TIME ZONE 'UTC';
    
    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name AND n.nspname = 'public'
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;
    
    -- Create the partition
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF appointments
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    -- Add exclusion constraint
    PERFORM add_appointment_exclusion_constraint(partition_name);
    
    result := 'Created partition ' || partition_name;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Create partitions for the next N months
CREATE OR REPLACE FUNCTION create_future_partitions(
    months_ahead INTEGER DEFAULT 6
)
RETURNS TABLE(partition_info TEXT) AS $$
DECLARE
    i INTEGER;
    target_date DATE;
BEGIN
    FOR i IN 0..months_ahead-1 LOOP
        target_date := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
        RETURN QUERY SELECT create_appointments_partition(target_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: List all appointment partitions
CREATE OR REPLACE FUNCTION list_appointment_partitions()
RETURNS TABLE(
    partition_name TEXT,
    partition_range TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT,
        pg_get_expr(c.relpartbound, c.oid, true)::TEXT,
        COALESCE(
            (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = c.relname),
            0
        )
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'appointments' AND c.relkind = 'r'
    ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- Function: Drop old partitions (for archiving)
CREATE OR REPLACE FUNCTION drop_old_partitions(
    months_to_keep INTEGER DEFAULT 24
)
RETURNS TABLE(dropped_partition TEXT) AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    partition_year INTEGER;
    partition_month INTEGER;
    partition_date DATE;
BEGIN
    cutoff_date := date_trunc('month', CURRENT_DATE - (months_to_keep || ' months')::INTERVAL)::DATE;
    
    FOR partition_rec IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_inherits i ON i.inhrelid = c.oid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'appointments'
        AND c.relkind = 'r'
        AND c.relname ~ '^appointments_\d{4}_\d{2}$'
    LOOP
        -- Extract year and month from partition name
        partition_year := substring(partition_rec.relname from 'appointments_(\d{4})_\d{2}')::INTEGER;
        partition_month := substring(partition_rec.relname from 'appointments_\d{4}_(\d{2})')::INTEGER;
        partition_date := make_date(partition_year, partition_month, 1);
        
        IF partition_date < cutoff_date THEN
            EXECUTE format('DROP TABLE %I', partition_rec.relname);
            dropped_partition := partition_rec.relname || ' (date: ' || partition_date || ')';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_appointments_partition IS 
'Creates a single partition for a given month. Usage: SELECT create_appointments_partition(''2027-01-01''::DATE);';

COMMENT ON FUNCTION create_future_partitions IS 
'Creates partitions for the next N months. Usage: SELECT create_future_partitions(12);';

COMMENT ON FUNCTION list_appointment_partitions IS 
'Lists all partitions with row counts. Usage: SELECT * FROM list_appointment_partitions();';

COMMENT ON FUNCTION drop_old_partitions IS 
'Drops partitions older than N months. Usage: SELECT * FROM drop_old_partitions(24);';

-- ============================================
-- PARTITION MANAGEMENT USAGE EXAMPLES
-- ============================================
-- 
-- Monthly maintenance (recommended to automate):
--   SELECT create_future_partitions(6);
-- 
-- View all partitions:
--   SELECT * FROM list_appointment_partitions();
-- 
-- Archive old data (use with caution):
--   SELECT * FROM drop_old_partitions(24);
-- 
-- ============================================

-- ============================================
-- SCHEMA CREATION COMPLETE
-- ============================================
-- 
-- Performance Notes:
-- - All tenant_id columns indexed for multi-tenant isolation
-- - Composite indexes on (tenant_id, resource_id, time) for conflict detection
-- - Exclusion constraint on appointments prevents database-level double-booking
-- - Partial indexes with WHERE clauses reduce size (only active/scheduled records)
-- - SERIAL primary keys for simplicity and performance (4 bytes vs 16 bytes for UUID)
-- - Working hours index includes is_available for faster filtering
-- - Appointments index includes status for optimized range queries
-- - Device and doctor-service indexes optimized for availability search
-- 
-- Scale Considerations (50k bookings/day):
-- - Optimized indexes support <300ms availability search (local DB)
-- - Parallel query execution in application layer
-- - Exclusion constraints handle concurrent booking attempts
-- - Monthly partitioning implemented for appointments table
-- - Integer IDs provide better index performance and lower storage overhead
-- - Pre-indexed conflict detection for O(1) resource lookups
-- 
-- Partitioning Strategy:
-- - Appointments table partitioned by month (starts_at)
-- - Initial setup: 3 partitions (Dec 2025, Jan 2026, Feb 2026)
-- - Use create_future_partitions() function to add more as needed
-- - Queries for specific date ranges only scan relevant partitions
-- - Old partitions can be dropped/archived easily
-- - Each partition has its own exclusion constraint for conflict detection
-- ============================================

