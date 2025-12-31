import axios, { AxiosInstance } from 'axios';
import type {
  Doctor,
  Service,
  Appointment,
  AvailabilityResponse,
  CreateAppointmentRequest,
  ApiResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private api: AxiosInstance;
  private tenantId: string = 'downtown-clinic'; // Default tenant

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add tenant header to all requests
    this.api.interceptors.request.use((config) => {
      config.headers['X-Tenant-Id'] = this.tenantId;
      return config;
    });
  }

  setTenant(tenantId: string) {
    this.tenantId = tenantId;
  }

  getTenant() {
    return this.tenantId;
  }

  // ============================================
  // Doctors
  // ============================================

  async getDoctors(serviceId?: string): Promise<Doctor[]> {
    const params = serviceId ? { service_id: serviceId } : {};
    const response = await this.api.get<Doctor[]>('/api/doctors', { params });
    return response.data;
  }

  async getDoctor(id: string): Promise<Doctor> {
    const response = await this.api.get<Doctor>(`/api/doctors/${id}`);
    return response.data;
  }

  async getDoctorSchedule(
    doctorId: string,
    from: string,
    to: string
  ): Promise<Appointment[]> {
    const response = await this.api.get<Appointment[]>(
      `/api/doctors/${doctorId}/schedule`,
      { params: { from, to } }
    );
    return response.data;
  }

  // ============================================
  // Services
  // ============================================

  async getServices(): Promise<Service[]> {
    const response = await this.api.get<Service[]>('/api/services');
    return response.data;
  }

  async getService(id: string): Promise<Service> {
    const response = await this.api.get<Service>(`/api/services/${id}`);
    return response.data;
  }

  // ============================================
  // Availability
  // ============================================

  async getAvailability(
    serviceId: string,
    from: string,
    to: string,
    doctorIds?: string[]
  ): Promise<AvailabilityResponse> {
    const params: any = {
      service_id: serviceId,
      from,
      to,
    };
    
    if (doctorIds && doctorIds.length > 0) {
      params.doctor_ids = doctorIds.join(',');
    }
    
    const response = await this.api.get<AvailabilityResponse>(
      '/api/availability',
      { params }
    );
    return response.data;
  }

  // ============================================
  // Appointments
  // ============================================

  async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    const response = await this.api.post<Appointment>(
      '/api/appointments',
      data
    );
    return response.data;
  }

  async getAppointments(filters?: {
    doctor_id?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<Appointment[]> {
    const response = await this.api.get<Appointment[]>(
      '/api/appointments',
      { params: filters }
    );
    return response.data;
  }

  async getAppointment(id: string): Promise<Appointment> {
    const response = await this.api.get<Appointment>(
      `/api/appointments/${id}`
    );
    return response.data;
  }

  async cancelAppointment(id: string): Promise<Appointment> {
    const response = await this.api.delete<Appointment>(
      `/api/appointments/${id}`
    );
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;

