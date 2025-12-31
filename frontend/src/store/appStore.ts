import { create } from 'zustand';
import type { Doctor, Service, TimeSlot } from '../types';

interface AppState {
  selectedDoctor: Doctor | null;
  selectedService: Service | null;
  selectedDate: Date;
  selectedSlot: TimeSlot | null;
  tenantId: string;
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  setTenantId: (tenantId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDoctor: null,
  selectedService: null,
  selectedDate: new Date(),
  selectedSlot: null,
  tenantId: 'downtown-clinic',
  setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),
  setSelectedService: (service) => set({ selectedService: service }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  setTenantId: (tenantId) => set({ tenantId }),
}));

