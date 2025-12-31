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
('550e8400-e29b-41d4-a716-446655440000', 'Downtown Clinic', 'downtown-clinic', 'Europe/Berlin')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. DOCTORS
-- ============================================
INSERT INTO doctors (id, tenant_id, name, email, specialty, slot_duration_minutes, is_active) 
VALUES 
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Dr. Sarah Smith', 'sarah@clinic.com', 'General Practice', 30, true),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Dr. John Doe', 'john@clinic.com', 'Cardiology', 45, true),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Dr. Emily Johnson', 'emily@clinic.com', 'Pediatrics', 30, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. PATIENTS
-- ============================================
INSERT INTO patients (id, tenant_id, name, email, phone, date_of_birth) 
VALUES 
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Alice Williams', 'alice@example.com', '+49 123 456 789', '1985-03-15'),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Bob Miller', 'bob@example.com', '+49 987 654 321', '1990-07-22'),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Carol Davis', 'carol@example.com', '+49 555 123 456', '1978-11-30')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. ROOMS
-- ============================================
INSERT INTO rooms (id, tenant_id, name, location, is_active) 
VALUES 
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Room 101', 'First Floor', true),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Room 102', 'First Floor', true),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Room 201', 'Second Floor', true),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Room 202', 'Second Floor', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. DEVICES
-- ============================================
INSERT INTO devices (id, tenant_id, name, device_type, is_active) 
VALUES 
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'ECG Machine', 'Cardiology', true),
('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Ultrasound Scanner', 'Imaging', true),
('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'X-Ray Machine', 'Imaging', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. SERVICES
-- ============================================
INSERT INTO services (id, tenant_id, name, description, duration_min, buffer_before_min, buffer_after_min, requires_room, requires_device) 
VALUES 
('850e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'General Checkup', 'Routine health examination', 30, 5, 5, true, false),
('850e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Cardiology Consultation', 'Heart health consultation with ECG', 45, 10, 10, true, true),
('850e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Pediatric Visit', 'Child health checkup', 30, 5, 5, true, false),
('850e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Ultrasound Examination', 'Medical imaging procedure', 60, 15, 15, true, true)
ON CONFLICT DO NOTHING;

-- Link services to required devices
INSERT INTO service_devices (service_id, device_id) 
VALUES 
('850e8400-e29b-41d4-a716-446655440011', '850e8400-e29b-41d4-a716-446655440001'),  -- Cardiology needs ECG
('850e8400-e29b-41d4-a716-446655440013', '850e8400-e29b-41d4-a716-446655440002')   -- Ultrasound needs scanner
ON CONFLICT DO NOTHING;

-- Link doctors to services they can perform
INSERT INTO doctor_services (doctor_id, service_id) 
VALUES 
-- Dr. Sarah Smith (General Practice) - can do general checkups and pediatric visits
('650e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440010'),  -- General Checkup
('650e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440012'),  -- Pediatric Visit
-- Dr. John Doe (Cardiology) - can do general checkups and cardiology consultations
('650e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440010'),  -- General Checkup
('650e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440011'),  -- Cardiology Consultation
-- Dr. Emily Johnson (Pediatrics) - can do pediatric visits and general checkups
('650e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440010'),  -- General Checkup
('650e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440012'),  -- Pediatric Visit
('650e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440013')   -- Ultrasound (pediatric imaging)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. WORKING HOURS (Monday=1 to Friday=5)
-- ============================================
INSERT INTO working_hours (tenant_id, doctor_id, day_of_week, start_time, end_time, is_available) 
VALUES 
-- Dr. Sarah Smith - Mon-Fri 9-5
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001', 1, '09:00', '17:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001', 2, '09:00', '17:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001', 3, '09:00', '17:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001', 4, '09:00', '17:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440001', 5, '09:00', '17:00', true),
-- Dr. John Doe - Mon-Fri 10-6
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 1, '10:00', '18:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 2, '10:00', '18:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 3, '10:00', '18:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 4, '10:00', '18:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440002', 5, '10:00', '18:00', true),
-- Dr. Emily Johnson - Mon-Fri 8-4
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440003', 1, '08:00', '16:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440003', 2, '08:00', '16:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440003', 3, '08:00', '16:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440003', 4, '08:00', '16:00', true),
('550e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440003', 5, '08:00', '16:00', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. SAMPLE APPOINTMENTS (Optional - for testing)
-- ============================================
-- Note: These are example appointments. Adjust dates to current/future dates for testing.
-- All times are in UTC - convert to Europe/Berlin timezone for display

-- Example: Appointment tomorrow at 10:00 AM Berlin time (09:00 UTC in winter, 08:00 UTC in summer)
-- Adjust these dates based on when you're running the seed
INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, room_id, starts_at, ends_at, status) 
VALUES 
(
    'a1000000-0000-0000-0000-000000000001',
    '550e8400-e29b-41d4-a716-446655440000',
    '650e8400-e29b-41d4-a716-446655440001',
    '950e8400-e29b-41d4-a716-446655440001',
    '850e8400-e29b-41d4-a716-446655440010',
    '750e8400-e29b-41d4-a716-446655440001',
    (CURRENT_DATE + INTERVAL '1 day')::date + TIME '09:00:00' AT TIME ZONE 'Europe/Berlin' AT TIME ZONE 'UTC',
    (CURRENT_DATE + INTERVAL '1 day')::date + TIME '09:30:00' AT TIME ZONE 'Europe/Berlin' AT TIME ZONE 'UTC',
    'scheduled'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA COMPLETE
-- ============================================
-- 
-- Summary:
-- - 1 tenant: downtown-clinic
-- - 3 doctors with different specialties
-- - 3 patients
-- - 4 rooms
-- - 3 devices
-- - 4 services (with device requirements and doctor qualifications)
-- - Doctor-service relationships (which doctors can perform which services)
-- - Working hours for all doctors (Mon-Fri)
-- - 1 sample appointment
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
    (SELECT COUNT(*) FROM services) as services,
    (SELECT COUNT(*) FROM working_hours) as working_hours;

