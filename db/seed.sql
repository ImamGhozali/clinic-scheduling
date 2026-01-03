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
(1, 'Berlin Medical Center', 'berlin-medical', 'Europe/Berlin'),
(2, 'Munich Family Clinic', 'munich-family', 'Europe/Berlin')
ON CONFLICT (slug) DO NOTHING;

-- Reset sequence to continue from 3
SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants));

-- ============================================
-- 2. DOCTORS
-- ============================================
INSERT INTO doctors (id, tenant_id, name, email, specialty, slot_duration_minutes, is_active) 
VALUES 
-- Tenant 1: Berlin Medical Center
(101, 1, 'Dr. Sarah Schmidt', 'sarah@berlin-medical.com', 'General Practice', 30, true),
(102, 1, 'Dr. Thomas Müller', 'thomas@berlin-medical.com', 'Cardiology', 45, true),
(103, 1, 'Dr. Emily Johnson', 'emily@berlin-medical.com', 'Pediatrics', 30, true),
(104, 1, 'Dr. Michael Weber', 'michael@berlin-medical.com', 'Orthopedics', 45, true),
-- Tenant 2: Munich Family Clinic
(105, 2, 'Dr. Anna Fischer', 'anna@munich-family.com', 'General Practice', 30, true),
(106, 2, 'Dr. Peter Schneider', 'peter@munich-family.com', 'Dermatology', 30, true),
(107, 2, 'Dr. Lisa Wagner', 'lisa@munich-family.com', 'Pediatrics', 30, true)
ON CONFLICT DO NOTHING;

SELECT setval('doctors_id_seq', (SELECT MAX(id) FROM doctors));

-- ============================================
-- 3. PATIENTS
-- ============================================
INSERT INTO patients (id, tenant_id, name, email, phone, date_of_birth) 
VALUES 
-- Tenant 1: Berlin Medical Center
(201, 1, 'Max Hoffmann', 'max@example.com', '+49 30 123 4567', '1985-03-15'),
(202, 1, 'Julia Becker', 'julia@example.com', '+49 30 234 5678', '1990-07-22'),
(203, 1, 'Hans Zimmermann', 'hans@example.com', '+49 30 345 6789', '1978-11-30'),
(204, 1, 'Sophie Klein', 'sophie@example.com', '+49 30 456 7890', '2010-05-12'),
-- Tenant 2: Munich Family Clinic
(205, 2, 'Lukas Meyer', 'lukas@example.com', '+49 89 111 2222', '1982-05-20'),
(206, 2, 'Emma Schulz', 'emma@example.com', '+49 89 222 3333', '1995-09-10'),
(207, 2, 'Felix Koch', 'felix@example.com', '+49 89 333 4444', '2015-12-05')
ON CONFLICT DO NOTHING;

SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));

-- ============================================
-- 4. ROOMS
-- ============================================
INSERT INTO rooms (id, tenant_id, name, location, is_active) 
VALUES 
-- Tenant 1: Berlin Medical Center
(301, 1, 'Exam Room 1', 'Ground Floor', true),
(302, 1, 'Exam Room 2', 'Ground Floor', true),
(303, 1, 'Cardiology Suite', 'First Floor', true),
(304, 1, 'Pediatrics Room', 'First Floor', true),
(305, 1, 'Orthopedics Room', 'Second Floor', true),
(306, 1, 'Imaging Room', 'Basement', true),
-- Tenant 2: Munich Family Clinic
(307, 2, 'Consultation Room A', 'Ground Floor', true),
(308, 2, 'Consultation Room B', 'Ground Floor', true),
(309, 2, 'Treatment Room', 'First Floor', true),
(310, 2, 'Children''s Room', 'First Floor', true)
ON CONFLICT DO NOTHING;

SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms));

-- ============================================
-- 5. DEVICES
-- ============================================
INSERT INTO devices (id, tenant_id, name, device_type, is_active) 
VALUES 
-- Tenant 1: Berlin Medical Center
(401, 1, 'ECG Machine', 'Cardiology', true),
(402, 1, 'Ultrasound Scanner', 'Imaging', true),
(403, 1, 'X-Ray Machine', 'Imaging', true),
(404, 1, 'Holter Monitor', 'Cardiology', true),
-- Tenant 2: Munich Family Clinic
(405, 2, 'Ultrasound Scanner', 'Imaging', true),
(406, 2, 'Dermatoscope', 'Dermatology', true),
(407, 2, 'Spirometer', 'Respiratory', true)
ON CONFLICT DO NOTHING;

SELECT setval('devices_id_seq', (SELECT MAX(id) FROM devices));

-- ============================================
-- 6. SERVICES
-- ============================================
INSERT INTO services (id, tenant_id, name, description, duration_min, buffer_before_min, buffer_after_min, requires_room, requires_device) 
VALUES 
-- Tenant 1: Berlin Medical Center
(501, 1, 'General Checkup', 'Routine health examination', 30, 5, 10, true, false),
(502, 1, 'Cardiology Consultation', 'Heart health consultation', 45, 10, 15, true, false),
(503, 1, 'ECG Test', 'Electrocardiogram test', 30, 5, 10, true, true),
(504, 1, 'Ultrasound Examination', 'Diagnostic ultrasound imaging', 60, 15, 15, true, true),
(505, 1, 'Pediatric Checkup', 'Child health examination', 30, 5, 10, true, false),
(506, 1, 'Orthopedic Consultation', 'Bone and joint consultation', 45, 10, 15, true, false),
(507, 1, 'X-Ray Imaging', 'Diagnostic X-ray', 20, 5, 10, true, true),
(508, 1, 'Follow-up Visit', 'Post-treatment follow-up', 20, 5, 5, true, false),
-- Tenant 2: Munich Family Clinic
(509, 2, 'General Checkup', 'Routine health examination', 30, 5, 10, true, false),
(510, 2, 'Skin Examination', 'Dermatological examination', 30, 5, 10, true, true),
(511, 2, 'Pediatric Visit', 'Child health consultation', 30, 5, 10, true, false),
(512, 2, 'Vaccination', 'Immunization service', 15, 5, 10, true, false),
(513, 2, 'Ultrasound Scan', 'Diagnostic ultrasound', 45, 10, 15, true, true),
(514, 2, 'Minor Procedure', 'Small medical procedure', 30, 10, 15, true, false)
ON CONFLICT DO NOTHING;

SELECT setval('services_id_seq', (SELECT MAX(id) FROM services));

-- ============================================
-- Link services to required devices
-- ============================================
INSERT INTO service_devices (service_id, device_id) 
VALUES 
-- Tenant 1: Berlin Medical Center
(503, 401),  -- ECG Test needs ECG Machine
(504, 402),  -- Ultrasound needs Ultrasound Scanner
(507, 403),  -- X-Ray needs X-Ray Machine
-- Tenant 2: Munich Family Clinic
(510, 406),  -- Skin Examination needs Dermatoscope
(513, 405)   -- Ultrasound Scan needs Ultrasound Scanner
ON CONFLICT DO NOTHING;

-- Link doctors to services they can perform
INSERT INTO doctor_services (doctor_id, service_id) 
VALUES 
-- Tenant 1: Berlin Medical Center
-- Dr. Sarah Schmidt (General Practice)
(101, 501),  -- General Checkup
(101, 508),  -- Follow-up Visit
-- Dr. Thomas Müller (Cardiology)
(102, 501),  -- General Checkup
(102, 502),  -- Cardiology Consultation
(102, 503),  -- ECG Test
(102, 508),  -- Follow-up Visit
-- Dr. Emily Johnson (Pediatrics)
(103, 501),  -- General Checkup
(103, 505),  -- Pediatric Checkup
(103, 504),  -- Ultrasound (pediatric imaging)
(103, 508),  -- Follow-up Visit
-- Dr. Michael Weber (Orthopedics)
(104, 501),  -- General Checkup
(104, 506),  -- Orthopedic Consultation
(104, 507),  -- X-Ray Imaging
(104, 508),  -- Follow-up Visit
-- Tenant 2: Munich Family Clinic
-- Dr. Anna Fischer (General Practice)
(105, 509),  -- General Checkup
(105, 512),  -- Vaccination
-- Dr. Peter Schneider (Dermatology)
(106, 509),  -- General Checkup
(106, 510),  -- Skin Examination
(106, 514),  -- Minor Procedure
-- Dr. Lisa Wagner (Pediatrics)
(107, 509),  -- General Checkup
(107, 511),  -- Pediatric Visit
(107, 512),  -- Vaccination
(107, 513)   -- Ultrasound Scan
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. WORKING HOURS (Monday=1 to Sunday=7)
-- ============================================
-- Realistic doctor schedules with varied hours, including some weekend coverage
INSERT INTO working_hours (tenant_id, doctor_id, day_of_week, start_time, end_time, is_available) 
VALUES 
-- Tenant 1: Berlin Medical Center
-- Dr. Sarah Schmidt (General Practice) - Mon-Fri 08:00-16:00
(1, 101, 1, '08:00', '16:00', true),
(1, 101, 2, '08:00', '16:00', true),
(1, 101, 3, '08:00', '16:00', true),
(1, 101, 4, '08:00', '16:00', true),
(1, 101, 5, '08:00', '16:00', true),

-- Dr. Thomas Müller (Cardiology) - Mon-Thu 09:00-17:00, Fri 09:00-14:00
(1, 102, 1, '09:00', '17:00', true),
(1, 102, 2, '09:00', '17:00', true),
(1, 102, 3, '09:00', '17:00', true),
(1, 102, 4, '09:00', '17:00', true),
(1, 102, 5, '09:00', '14:00', true),

-- Dr. Emily Johnson (Pediatrics) - Mon-Wed 08:00-18:00, Thu-Fri 08:00-15:00, Sat 09:00-13:00
(1, 103, 1, '08:00', '18:00', true),
(1, 103, 2, '08:00', '18:00', true),
(1, 103, 3, '08:00', '18:00', true),
(1, 103, 4, '08:00', '15:00', true),
(1, 103, 5, '08:00', '15:00', true),
(1, 103, 6, '09:00', '13:00', true),

-- Dr. Michael Weber (Orthopedics) - Mon-Fri 10:00-18:00
(1, 104, 1, '10:00', '18:00', true),
(1, 104, 2, '10:00', '18:00', true),
(1, 104, 3, '10:00', '18:00', true),
(1, 104, 4, '10:00', '18:00', true),
(1, 104, 5, '10:00', '18:00', true),

-- Tenant 2: Munich Family Clinic
-- Dr. Anna Fischer (General Practice) - Mon-Fri 07:30-15:30, Sat 08:00-12:00
(2, 105, 1, '07:30', '15:30', true),
(2, 105, 2, '07:30', '15:30', true),
(2, 105, 3, '07:30', '15:30', true),
(2, 105, 4, '07:30', '15:30', true),
(2, 105, 5, '07:30', '15:30', true),
(2, 105, 6, '08:00', '12:00', true),

-- Dr. Peter Schneider (Dermatology) - Mon-Thu 10:00-19:00, Fri 10:00-16:00
(2, 106, 1, '10:00', '19:00', true),
(2, 106, 2, '10:00', '19:00', true),
(2, 106, 3, '10:00', '19:00', true),
(2, 106, 4, '10:00', '19:00', true),
(2, 106, 5, '10:00', '16:00', true),

-- Dr. Lisa Wagner (Pediatrics) - Mon-Fri 08:00-16:00, Sat 09:00-14:00
(2, 107, 1, '08:00', '16:00', true),
(2, 107, 2, '08:00', '16:00', true),
(2, 107, 3, '08:00', '16:00', true),
(2, 107, 4, '08:00', '16:00', true),
(2, 107, 5, '08:00', '16:00', true),
(2, 107, 6, '09:00', '14:00', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. SAMPLE APPOINTMENTS (Optional - for testing)
-- ============================================
-- Note: Using dates in Jan-Feb 2026 for testing
-- All times are in UTC (subtract 1 hour from Europe/Berlin local time in winter)
-- 
-- Example: Local time 09:00 Berlin = 08:00 UTC
-- ============================================

-- Some sample appointments to test conflict detection
INSERT INTO appointments (
  id, tenant_id, doctor_id, patient_id, service_id, room_id,
  starts_at, ends_at, status, notes
) 
VALUES 
-- Tenant 1: Berlin Medical Center
-- Dr. Sarah Schmidt - Monday Jan 6, 2026
(10001, 1, 101, 201, 501, 301, '2026-01-06 07:00:00+00', '2026-01-06 07:30:00+00', 'scheduled', 'Regular checkup'),
(10002, 1, 101, 202, 508, 301, '2026-01-06 08:45:00+00', '2026-01-06 09:05:00+00', 'scheduled', 'Follow-up after treatment'),

-- Dr. Thomas Müller - Tuesday Jan 7, 2026
(10003, 1, 102, 203, 502, 303, '2026-01-07 08:00:00+00', '2026-01-07 08:45:00+00', 'scheduled', 'Heart consultation'),
(10004, 1, 102, 201, 503, 303, '2026-01-07 09:50:00+00', '2026-01-07 10:20:00+00', 'scheduled', 'ECG test'),

-- Dr. Emily Johnson - Wednesday Jan 8, 2026
(10005, 1, 103, 204, 505, 304, '2026-01-08 07:00:00+00', '2026-01-08 07:30:00+00', 'scheduled', 'Child checkup'),
(10006, 1, 103, 204, 504, 304, '2026-01-08 08:45:00+00', '2026-01-08 09:45:00+00', 'scheduled', 'Pediatric ultrasound'),

-- Dr. Michael Weber - Thursday Jan 9, 2026
(10007, 1, 104, 202, 506, 305, '2026-01-09 09:00:00+00', '2026-01-09 09:45:00+00', 'scheduled', 'Knee pain consultation'),
(10008, 1, 104, 203, 507, 305, '2026-01-09 11:10:00+00', '2026-01-09 11:30:00+00', 'scheduled', 'X-ray for back pain'),

-- Tenant 2: Munich Family Clinic
-- Dr. Anna Fischer - Monday Jan 6, 2026
(10009, 2, 105, 205, 509, 307, '2026-01-06 06:30:00+00', '2026-01-06 07:00:00+00', 'scheduled', 'Annual checkup'),
(10010, 2, 105, 206, 512, 307, '2026-01-06 08:15:00+00', '2026-01-06 08:30:00+00', 'scheduled', 'Flu vaccination'),

-- Dr. Peter Schneider - Tuesday Jan 7, 2026
(10011, 2, 106, 206, 510, 308, '2026-01-07 09:00:00+00', '2026-01-07 09:30:00+00', 'scheduled', 'Skin check'),
(10012, 2, 106, 205, 514, 309, '2026-01-07 10:45:00+00', '2026-01-07 11:15:00+00', 'scheduled', 'Mole removal'),

-- Dr. Lisa Wagner - Wednesday Jan 8, 2026
(10013, 2, 107, 207, 511, 310, '2026-01-08 07:00:00+00', '2026-01-08 07:30:00+00', 'scheduled', 'Child wellness visit'),
(10014, 2, 107, 207, 512, 310, '2026-01-08 08:45:00+00', '2026-01-08 09:00:00+00', 'scheduled', 'Childhood vaccination')
ON CONFLICT DO NOTHING;

SELECT setval('appointments_id_seq', (SELECT MAX(id) FROM appointments));

-- ============================================
-- 9. RECURRING BREAKS (Regular breaks that repeat)
-- ============================================
-- day_of_week: NULL = daily, 0 = Sunday, 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
INSERT INTO recurring_breaks (
  id, tenant_id, resource_type, resource_id,
  day_of_week, start_time, end_time, reason, is_active
)
VALUES
-- Tenant 1: Berlin Medical Center
-- Dr. Sarah Schmidt - Daily lunch break
(9001, 1, 'doctor', 101, NULL, '12:00', '13:00', 'Lunch break', true),

-- Dr. Thomas Müller - Daily lunch break
(9002, 1, 'doctor', 102, NULL, '12:30', '13:30', 'Lunch break', true),

-- Dr. Emily Johnson - Daily lunch break
(9003, 1, 'doctor', 103, NULL, '12:00', '13:00', 'Lunch break', true),
-- Dr. Emily Johnson - Wednesday afternoon admin time
(9004, 1, 'doctor', 103, 3, '15:00', '16:00', 'Administrative duties', true),

-- Dr. Michael Weber - Daily lunch break
(9005, 1, 'doctor', 104, NULL, '13:00', '14:00', 'Lunch break', true),
-- Dr. Michael Weber - Friday morning team meeting
(9006, 1, 'doctor', 104, 5, '10:00', '11:00', 'Weekly team meeting', true),

-- Tenant 2: Munich Family Clinic
-- Dr. Anna Fischer - Daily lunch break
(9007, 2, 'doctor', 105, NULL, '11:30', '12:30', 'Lunch break', true),

-- Dr. Peter Schneider - Daily lunch break
(9008, 2, 'doctor', 106, NULL, '13:00', '14:00', 'Lunch break', true),
-- Dr. Peter Schneider - Monday morning staff meeting
(9009, 2, 'doctor', 106, 1, '10:00', '10:30', 'Staff meeting', true),

-- Dr. Lisa Wagner - Daily lunch break
(9010, 2, 'doctor', 107, NULL, '12:00', '13:00', 'Lunch break', true),

-- Room maintenance breaks
-- Cardiology Suite - Daily cleaning
(9011, 1, 'room', 303, NULL, '13:00', '13:30', 'Daily cleaning and sterilization', true),
-- Imaging Room - Weekly deep cleaning on Sundays
(9012, 1, 'room', 306, 0, '10:00', '14:00', 'Weekly deep cleaning', true),

-- Device maintenance breaks
-- Ultrasound Scanner (Berlin) - Weekly calibration on Mondays
(9013, 1, 'device', 402, 1, '08:00', '09:00', 'Weekly calibration and maintenance', true),
-- X-Ray Machine - Weekly quality assurance on Mondays
(9014, 1, 'device', 403, 1, '07:00', '08:00', 'Quality assurance check', true)

ON CONFLICT DO NOTHING;

SELECT setval('recurring_breaks_id_seq', (SELECT MAX(id) FROM recurring_breaks));

-- ============================================
-- 10. ONE-TIME BREAKS (Specific date/time breaks)
-- ============================================
-- For vacations, special events, equipment repairs, etc.
INSERT INTO breaks (
  id, tenant_id, resource_type, resource_id,
  starts_at, ends_at, reason
)
VALUES
-- Tenant 1: Berlin Medical Center
-- Dr. Sarah Schmidt - Vacation Jan 13-17, 2026
(8001, 1, 'doctor', 101, '2026-01-13 07:00:00+00', '2026-01-17 23:59:59+00', 'Annual leave'),

-- Dr. Thomas Müller - Conference attendance Feb 10-12, 2026
(8002, 1, 'doctor', 102, '2026-02-10 08:00:00+00', '2026-02-12 17:00:00+00', 'Medical conference in Frankfurt'),

-- Dr. Emily Johnson - Training day Jan 15, 2026
(8003, 1, 'doctor', 103, '2026-01-15 08:00:00+00', '2026-01-15 17:00:00+00', 'Pediatric emergency training'),

-- Dr. Michael Weber - Surgery at partner hospital Jan 9, 2026 afternoon
(8004, 1, 'doctor', 104, '2026-01-09 13:00:00+00', '2026-01-09 18:00:00+00', 'Surgery at partner hospital'),

-- Equipment maintenance
-- Ultrasound Scanner - Repair Jan 10, 2026
(8005, 1, 'device', 402, '2026-01-10 09:00:00+00', '2026-01-10 12:00:00+00', 'Scheduled maintenance and software update'),

-- X-Ray Machine - Calibration Jan 8, 2026
(8006, 1, 'device', 403, '2026-01-08 16:00:00+00', '2026-01-08 18:00:00+00', 'Annual calibration'),

-- Room unavailability
-- Cardiology Suite - Deep cleaning Jan 11, 2026
(8007, 1, 'room', 303, '2026-01-11 08:00:00+00', '2026-01-11 10:00:00+00', 'Deep cleaning and repainting'),

-- Tenant 2: Munich Family Clinic
-- Dr. Anna Fischer - Family emergency Jan 20, 2026
(8008, 2, 'doctor', 105, '2026-01-20 06:30:00+00', '2026-01-20 14:30:00+00', 'Personal leave'),

-- Dr. Peter Schneider - Conference Jan 28-29, 2026
(8009, 2, 'doctor', 106, '2026-01-28 09:00:00+00', '2026-01-29 18:00:00+00', 'Dermatology conference in Berlin'),

-- Dr. Lisa Wagner - Sick leave Jan 14, 2026
(8010, 2, 'doctor', 107, '2026-01-14 07:00:00+00', '2026-01-14 16:00:00+00', 'Sick leave'),

-- Equipment maintenance
-- Ultrasound Scanner (Munich) - Repair Feb 5, 2026
(8011, 2, 'device', 405, '2026-02-05 09:00:00+00', '2026-02-05 14:00:00+00', 'Sensor replacement'),

-- Dermatoscope - Calibration Jan 22, 2026
(8012, 2, 'device', 406, '2026-01-22 10:00:00+00', '2026-01-22 11:00:00+00', 'Routine calibration'),

-- Room unavailability
-- Treatment Room - Renovation Feb 3-7, 2026
(8013, 2, 'room', 309, '2026-02-03 00:00:00+00', '2026-02-07 23:59:59+00', 'Room renovation and equipment upgrade'),

-- Children''s Room - Painting Jan 16, 2026
(8014, 2, 'room', 310, '2026-01-16 07:00:00+00', '2026-01-16 12:00:00+00', 'Wall painting and decoration')

ON CONFLICT DO NOTHING;

SELECT setval('breaks_id_seq', (SELECT MAX(id) FROM breaks));

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Uncomment these to verify the seed data after insertion

-- SELECT 'Tenants' as entity, COUNT(*) as count FROM tenants
-- UNION ALL
-- SELECT 'Doctors', COUNT(*) FROM doctors
-- UNION ALL
-- SELECT 'Patients', COUNT(*) FROM patients
-- UNION ALL
-- SELECT 'Rooms', COUNT(*) FROM rooms
-- UNION ALL
-- SELECT 'Devices', COUNT(*) FROM devices
-- UNION ALL
-- SELECT 'Services', COUNT(*) FROM services
-- UNION ALL
-- SELECT 'Working Hours', COUNT(*) FROM working_hours
-- UNION ALL
-- SELECT 'Appointments', COUNT(*) FROM appointments
-- UNION ALL
-- SELECT 'Recurring Breaks', COUNT(*) FROM recurring_breaks
-- UNION ALL
-- SELECT 'One-time Breaks', COUNT(*) FROM breaks;

-- View doctor schedules
-- SELECT 
--   d.name as doctor,
--   d.specialty,
--   wh.day_of_week,
--   wh.start_time,
--   wh.end_time
-- FROM doctors d
-- JOIN working_hours wh ON d.id = wh.doctor_id
-- ORDER BY d.name, wh.day_of_week;
