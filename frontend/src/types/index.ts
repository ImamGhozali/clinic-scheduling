export interface Doctor {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  specialty: string | null;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  doctor_id: string;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'cancelled' | 'completed' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  requires_room: boolean;
  requires_device: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  doctor_id: string;
  doctor_name: string;
  room_id: string;
  room_name: string;
  device_ids: string[];
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  slots: TimeSlot[];
  limit: number;
}

export interface CreateAppointmentRequest {
  doctor_id: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

