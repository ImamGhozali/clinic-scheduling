-- ============================================
-- Seed Data for Multi-Tenant Clinic Scheduling
-- ============================================
-- 
-- This seed data provides a realistic test dataset for:
-- - Manual QA testing
-- - API endpoint verification
-- - Frontend development
-- - Conflict detection testing
-- ============================================

-- ============================================
-- 1. TENANTS (Clinics)
-- ============================================
INSERT INTO tenants (id, name, slug, timezone) 
VALUES 
(1, 'Downtown Clinic', 'downtown-clinic', 'Europe/Berlin')
ON CONFLICT (slug) DO NOTHING;

-- Reset sequence to continue from 2
SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants));

-- ============================================
-- 2. DOCTORS
-- ============================================
INSERT INTO doctors (id, tenant_id, name, email, specialty, slot_duration_minutes, is_active) 
VALUES 
(101, 1, 'Dr. Sarah Smith', 'sarah@clinic.com', 'General Practice', 30, true),
(102, 1, 'Dr. John Doe', 'john@clinic.com', 'Cardiology', 45, true),
(103, 1, 'Dr. Emily Johnson', 'emily@clinic.com', 'Pediatrics', 30, true)
ON CONFLICT DO NOTHING;

SELECT setval('doctors_id_seq', (SELECT MAX(id) FROM doctors));

-- ============================================
-- 3. PATIENTS
-- ============================================
INSERT INTO patients (id, tenant_id, name, email, phone, date_of_birth) 
VALUES 
(201, 1, 'Alice Williams', 'alice@example.com', '+49 123 456 789', '1985-03-15'),
(202, 1, 'Bob Miller', 'bob@example.com', '+49 987 654 321', '1990-07-22'),
(203, 1, 'Carol Davis', 'carol@example.com', '+49 555 123 456', '1978-11-30')
ON CONFLICT DO NOTHING;

SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));

-- ============================================
-- 4. ROOMS
-- ============================================
INSERT INTO rooms (id, tenant_id, name, location, is_active) 
VALUES 
(301, 1, 'Room 101', 'First Floor', true),
(302, 1, 'Room 102', 'First Floor', true),
(303, 1, 'Room 201', 'Second Floor', true),
(304, 1, 'Room 202', 'Second Floor', true)
ON CONFLICT DO NOTHING;

SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms));

-- ============================================
-- 5. DEVICES
-- ============================================
INSERT INTO devices (id, tenant_id, name, device_type, is_active) 
VALUES 
(401, 1, 'ECG Machine', 'Cardiology', true),
(402, 1, 'Ultrasound Scanner', 'Imaging', true),
(403, 1, 'X-Ray Machine', 'Imaging', true)
ON CONFLICT DO NOTHING;

SELECT setval('devices_id_seq', (SELECT MAX(id) FROM devices));

-- ============================================
-- 6. SERVICES
-- ============================================
INSERT INTO services (id, tenant_id, name, description, duration_min, buffer_before_min, buffer_after_min, requires_room, requires_device) 
VALUES 
(501, 1, 'General Checkup', 'Routine health examination', 30, 5, 5, true, false),
(502, 1, 'Cardiology Consultation', 'Heart health consultation with ECG', 45, 10, 10, true, true),
(503, 1, 'Pediatric Visit', 'Child health checkup', 30, 5, 5, true, false),
(504, 1, 'Ultrasound Examination', 'Medical imaging procedure', 60, 15, 15, true, true)
ON CONFLICT DO NOTHING;

SELECT setval('services_id_seq', (SELECT MAX(id) FROM services));

-- Link services to required devices
INSERT INTO service_devices (service_id, device_id) 
VALUES 
(502, 401),  -- Cardiology needs ECG
(504, 402)   -- Ultrasound needs scanner
ON CONFLICT DO NOTHING;

-- Link doctors to services they can perform
INSERT INTO doctor_services (doctor_id, service_id) 
VALUES 
-- Dr. Sarah Smith (General Practice) - can do general checkups and pediatric visits
(101, 501),  -- General Checkup
(101, 503),  -- Pediatric Visit
-- Dr. John Doe (Cardiology) - can do general checkups and cardiology consultations
(102, 501),  -- General Checkup
(102, 502),  -- Cardiology Consultation
-- Dr. Emily Johnson (Pediatrics) - can do pediatric visits and general checkups
(103, 501),  -- General Checkup
(103, 503),  -- Pediatric Visit
(103, 504)   -- Ultrasound (pediatric imaging)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. WORKING HOURS (Monday=1 to Friday=5)
-- ============================================
INSERT INTO working_hours (tenant_id, doctor_id, day_of_week, start_time, end_time, is_available) 
VALUES 
-- Dr. Sarah Smith - Mon-Fri 9-5
(1, 101, 1, '09:00', '17:00', true),
(1, 101, 2, '09:00', '17:00', true),
(1, 101, 3, '09:00', '17:00', true),
(1, 101, 4, '09:00', '17:00', true),
(1, 101, 5, '09:00', '17:00', true),
-- Dr. John Doe - Mon-Fri 10-6
(1, 102, 1, '10:00', '18:00', true),
(1, 102, 2, '10:00', '18:00', true),
(1, 102, 3, '10:00', '18:00', true),
(1, 102, 4, '10:00', '18:00', true),
(1, 102, 5, '10:00', '18:00', true),
-- Dr. Emily Johnson - Mon-Fri 8-4
(1, 103, 1, '08:00', '16:00', true),
(1, 103, 2, '08:00', '16:00', true),
(1, 103, 3, '08:00', '16:00', true),
(1, 103, 4, '08:00', '16:00', true),
(1, 103, 5, '08:00', '16:00', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. SAMPLE APPOINTMENTS (Optional - for testing)
-- ============================================
-- Note: Using fixed dates across Dec 2025, Jan 2026, Feb 2026 to test 3-partition setup
-- All times are in UTC
-- 
-- IMPORTANT: With partitioned tables, appointments must fall within existing partition ranges.
-- The DDL creates partitions for Dec 2025, Jan 2026, Feb 2026. Use create_future_partitions() to add more.

-- Dr. Sarah Smith - General checkup on Dec 15, 2025 at 10:00 AM Berlin time (09:00 UTC)
INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, room_id, starts_at, ends_at, status) 
VALUES 
(
    1001,
    1,
    101,
    201,
    501,
    301,
    '2025-12-15 09:00:00+00'::TIMESTAMPTZ,
    '2025-12-15 09:30:00+00'::TIMESTAMPTZ,
    'scheduled'
)
ON CONFLICT DO NOTHING;

-- Add more sample appointments across different months for testing
INSERT INTO appointments (tenant_id, doctor_id, patient_id, service_id, room_id, starts_at, ends_at, status) 
VALUES 
-- Dr. John Doe - Cardiology consultation on Jan 15, 2026 at 3:00 PM Berlin time (14:00 UTC)
(
    1,
    102,
    202,
    502,
    302,
    '2026-01-15 14:00:00+00'::TIMESTAMPTZ,
    '2026-01-15 14:45:00+00'::TIMESTAMPTZ,
    'scheduled'
),
-- Dr. Emily Johnson - Pediatric visit on Feb 10, 2026 at 10:00 AM Berlin time (09:00 UTC)
(
    1,
    103,
    203,
    503,
    303,
    '2026-02-10 09:00:00+00'::TIMESTAMPTZ,
    '2026-02-10 09:30:00+00'::TIMESTAMPTZ,
    'scheduled'
)
ON CONFLICT DO NOTHING;

SELECT setval('appointments_id_seq', (SELECT MAX(id) FROM appointments));

-- ============================================
-- SEED DATA COMPLETE
-- ============================================
-- 
-- Summary:
-- - 1 tenant: downtown-clinic (ID: 1)
-- - 3 doctors with different specialties (IDs: 101-103)
-- - 3 patients (IDs: 201-203)
-- - 4 rooms (IDs: 301-304)
-- - 3 devices (IDs: 401-403)
-- - 4 services (IDs: 501-504)
-- - Doctor-service relationships (which doctors can perform which services)
-- - Working hours for all doctors (Mon-Fri)
-- - 3 sample appointments (IDs: 1001+)
-- 
-- ID Ranges:
-- - Tenants: 1-99
-- - Doctors: 100-199
-- - Patients: 200-299
-- - Rooms: 300-399
-- - Devices: 400-499
-- - Services: 500-599
-- - Appointments: 1000+
-- 
-- Doctor-Service Mapping:
-- - Dr. Sarah Smith (General Practice): General Checkup, Pediatric Visit
-- - Dr. John Doe (Cardiology): General Checkup, Cardiology Consultation
-- - Dr. Emily Johnson (Pediatrics): General Checkup, Pediatric Visit, Ultrasound
-- 
-- To test:
-- 1. Use tenant slug: 'downtown-clinic' in X-Tenant-Id header
-- 2. Test GET /api/services endpoint
-- 3. Test GET /api/doctors?service_id={id} to get qualified doctors
-- 4. Test GET /api/availability with service_id
-- 5. Test POST /api/appointments to create bookings
-- ============================================

SELECT 
    'Seed data inserted successfully!' as status,
    (SELECT COUNT(*) FROM tenants) as tenants,
    (SELECT COUNT(*) FROM doctors) as doctors,
    (SELECT COUNT(*) FROM patients) as patients,
    (SELECT COUNT(*) FROM rooms) as rooms,
    (SELECT COUNT(*) FROM devices) as devices,
    (SELECT COUNT(*) FROM services) as services,
    (SELECT COUNT(*) FROM working_hours) as working_hours,
    (SELECT COUNT(*) FROM appointments) as appointments;

-- Show partition distribution
SELECT 
    'Partition Distribution:' as info;
    
SELECT 
    tableoid::regclass AS partition,
    COUNT(*) AS appointments
FROM appointments
GROUP BY tableoid
ORDER BY partition;
