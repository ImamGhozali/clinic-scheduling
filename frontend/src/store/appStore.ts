import { create } from 'zustand';
import type { Doctor, Service, TimeSlot } from '../types';

interface AppState {
  selectedDoctor: Doctor | null;
  selectedService: Service | null;
  selectedDate: Date;
  selectedSlot: TimeSlot | null;
  tenantId: number;
  nextAvailableSlots: TimeSlot[];
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  setTenantId: (tenantId: number) => void;
  setNextAvailableSlots: (slots: TimeSlot[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDoctor: null,
  selectedService: null,
  selectedDate: new Date(),
  selectedSlot: null,
  tenantId: 1, // Downtown Clinic ID
  nextAvailableSlots: [],
  setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),
  setSelectedService: (service) => set({ selectedService: service }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  setTenantId: (tenantId) => set({ tenantId }),
  setNextAvailableSlots: (slots) => set({ nextAvailableSlots: slots }),
}));

