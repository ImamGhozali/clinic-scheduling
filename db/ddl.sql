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

COMMENT ON TABLE breaks IS 'Scheduled breaks, holidays, and maintenance windows for any resource type';

-- ============================================
-- 9. APPOINTMENTS TABLE (Core table)
-- ============================================
CREATE TYPE appointment_status AS ENUM ('scheduled', 'cancelled', 'completed', 'no_show');

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id),
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    starts_at TIMESTAMPTZ NOT NULL,  -- Stored in UTC
    ends_at TIMESTAMPTZ NOT NULL,     -- Stored in UTC
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT appointments_time_check CHECK (ends_at > starts_at)
);

-- ============================================
-- 10. CRITICAL INDEXES FOR PERFORMANCE
-- ============================================

-- PRIMARY INDEX: Doctor conflict detection (most critical for 50k bookings/day)
CREATE INDEX idx_appointments_tenant_doctor_time 
    ON appointments(tenant_id, doctor_id, starts_at)
    WHERE status = 'scheduled';

-- Room conflict detection
CREATE INDEX idx_appointments_tenant_room_time 
    ON appointments(tenant_id, room_id, starts_at)
    WHERE status = 'scheduled';

-- Availability search optimization
CREATE INDEX idx_appointments_tenant_time 
    ON appointments(tenant_id, starts_at, ends_at)
    WHERE status = 'scheduled';

-- Calendar view: Get doctor's schedule for date range
CREATE INDEX idx_appointments_doctor_calendar 
    ON appointments(doctor_id, starts_at, ends_at)
    WHERE status != 'cancelled';

-- Tenant-scoped queries
CREATE INDEX idx_appointments_tenant_created 
    ON appointments(tenant_id, created_at DESC);

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
CREATE TABLE appointment_devices (
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
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
ALTER TABLE appointments 
ADD CONSTRAINT no_overlapping_doctor_appointments 
EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
) WHERE (status = 'scheduled');

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
-- SCHEMA CREATION COMPLETE
-- ============================================
-- 
-- Performance Notes:
-- - All tenant_id columns indexed for multi-tenant isolation
-- - Composite indexes on (tenant_id, resource_id, time) for conflict detection
-- - Exclusion constraint on appointments prevents database-level double-booking
-- - Indexes use WHERE clauses to reduce size (only active/scheduled records)
-- - SERIAL primary keys for simplicity and performance (4 bytes vs 16 bytes for UUID)
-- 
-- Scale Considerations (50k bookings/day):
-- - Indexes support sub-300ms availability search
-- - Exclusion constraints handle concurrent booking attempts
-- - Partitioning by month/tenant can be added if needed
-- - Integer IDs provide better index performance and lower storage overhead
-- ============================================

