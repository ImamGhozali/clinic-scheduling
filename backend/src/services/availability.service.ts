import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import {
  Service,
  Doctor,
  Room,
  Device,
  Appointment,
  WorkingHours,
  Break,
  ResourceType,
  AppointmentStatus,
} from '../entities';
import { addMinutes, parseISO, format, getDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export interface AvailabilitySlot {
  doctor_id: string;
  doctor_name: string;
  room_id: string;
  room_name: string;
  device_ids: string[];
  start: string; // ISO 8601
  end: string; // ISO 8601
}

export interface AvailabilitySearchResult {
  slots: AvailabilitySlot[];
  limit: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(WorkingHours)
    private workingHoursRepository: Repository<WorkingHours>,
    @InjectRepository(Break)
    private breakRepository: Repository<Break>,
  ) {}

  /**
   * Search for next 3 available time slots for a service
   * This is the core availability algorithm per the assessment requirements
   */
  async searchAvailability(
    tenantId: string,
    serviceId: string,
    from: string,
    to: string,
    doctorIds?: string[],
  ): Promise<AvailabilitySearchResult> {
    // 1. Get service details
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId, tenantId },
      relations: ['requiredDevices'],
    });

    if (!service) {
      throw new NotFoundException(`Service not found: ${serviceId}`);
    }

    // 2. Get doctors qualified for this service
    let doctors: Doctor[];
    if (doctorIds && doctorIds.length > 0) {
      // Filter by provided doctor IDs AND service qualification
      doctors = await this.doctorRepository
        .createQueryBuilder('doctor')
        .innerJoin('doctor_services', 'ds', 'ds.doctor_id = doctor.id')
        .where('doctor.id IN (:...doctorIds)', { doctorIds })
        .andWhere('doctor.tenant_id = :tenantId', { tenantId })
        .andWhere('doctor.is_active = :isActive', { isActive: true })
        .andWhere('ds.service_id = :serviceId', { serviceId })
        .getMany();
    } else {
      // Get all doctors qualified for this service
      doctors = await this.doctorRepository
        .createQueryBuilder('doctor')
        .innerJoin('doctor_services', 'ds', 'ds.doctor_id = doctor.id')
        .where('doctor.tenant_id = :tenantId', { tenantId })
        .andWhere('doctor.is_active = :isActive', { isActive: true })
        .andWhere('ds.service_id = :serviceId', { serviceId })
        .getMany();
    }

    if (doctors.length === 0) {
      return { slots: [], limit: 3 };
    }

    // 3. Get available rooms
    const rooms = await this.roomRepository.find({
      where: { tenantId, isActive: true },
    });

    if (rooms.length === 0) {
      return { slots: [], limit: 3 };
    }

    // 4. Get required devices if any
    let devices: Device[] = [];
    if (service.requiresDevice && service.requiredDevices.length > 0) {
      const deviceIds = service.requiredDevices.map((d) => d.id);
      devices = await this.deviceRepository.find({
        where: { id: In(deviceIds), tenantId, isActive: true },
      });
    }

    // 5. Parse time range
    const startDate = parseISO(from);
    const endDate = parseISO(to);

    // 6. Get all appointments in range for conflict checking
    const appointments = await this.appointmentRepository.find({
      where: {
        tenantId,
        startsAt: Between(startDate, endDate) as any,
        status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]),
      },
      relations: ['devices'],
    });

    // 7. Get all breaks in range
    const breaks = await this.breakRepository.find({
      where: {
        tenantId,
        startsAt: Between(startDate, endDate) as any,
      },
    });

    // 8. Search for slots
    const slots: AvailabilitySlot[] = [];
    const slotDuration = service.durationMin;
    const bufferBefore = service.bufferBeforeMin;
    const bufferAfter = service.bufferAfterMin;
    const totalDuration = slotDuration + bufferBefore + bufferAfter;

    // Iterate through time slots (15-minute increments for efficiency)
    let currentTime = startDate;
    const increment = 15; // minutes

    while (currentTime < endDate && slots.length < 3) {
      // Check each doctor
      for (const doctor of doctors) {
        if (slots.length >= 3) break;

        // Check if within working hours
        const dayOfWeek = getDay(currentTime);
        const isWithinWorkingHours = await this.isWithinWorkingHours(
          tenantId,
          doctor.id,
          currentTime,
          totalDuration,
        );

        if (!isWithinWorkingHours) continue;

        // Check each room (find first available room, not all rooms)
        for (const room of rooms) {
          // Calculate slot end time
          const slotStart = currentTime;
          const slotEnd = addMinutes(slotStart, slotDuration);
          const bufferStart = addMinutes(slotStart, -bufferBefore);
          const bufferEnd = addMinutes(slotEnd, bufferAfter);

          // Check for conflicts
          const hasConflict = this.hasConflict(
            appointments,
            breaks,
            doctor.id,
            room.id,
            devices.map((d) => d.id),
            bufferStart,
            bufferEnd,
          );

          if (!hasConflict) {
            // Found an available slot! Add it and move to next time slot
            slots.push({
              doctor_id: doctor.id,
              doctor_name: doctor.name,
              room_id: room.id,
              room_name: room.name,
              device_ids: devices.map((d) => d.id),
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });

            // Break out of room loop to move to next time slot
            break;
          }
        }

        // If we found a slot for this doctor at this time, break to next time
        if (slots.length > 0 && slots[slots.length - 1].start === currentTime.toISOString()) {
          break;
        }
      }

      currentTime = addMinutes(currentTime, increment);
    }

    return {
      slots,
      limit: 3,
    };
  }

  /**
   * Check if a time slot is within doctor's working hours
   */
  private async isWithinWorkingHours(
    tenantId: string,
    doctorId: string,
    slotStart: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    const dayOfWeek = getDay(slotStart);
    const slotEnd = addMinutes(slotStart, durationMinutes);

    const workingHours = await this.workingHoursRepository.findOne({
      where: {
        tenantId,
        doctorId,
        dayOfWeek,
        isAvailable: true,
      },
    });

    if (!workingHours) return false;

    // Parse working hours time strings (HH:MM format)
    const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number);

    const workStart = new Date(slotStart);
    workStart.setHours(startHour, startMin, 0, 0);

    const workEnd = new Date(slotStart);
    workEnd.setHours(endHour, endMin, 0, 0);

    return slotStart >= workStart && slotEnd <= workEnd;
  }

  /**
   * Check if there's a conflict with existing appointments or breaks
   */
  private hasConflict(
    appointments: Appointment[],
    breaks: Break[],
    doctorId: string,
    roomId: string,
    deviceIds: string[],
    slotStart: Date,
    slotEnd: Date,
  ): boolean {
    // Check doctor conflicts
    const doctorConflict = appointments.some(
      (apt) =>
        apt.doctorId === doctorId &&
        apt.startsAt < slotEnd &&
        apt.endsAt > slotStart,
    );

    if (doctorConflict) return true;

    // Check room conflicts
    const roomConflict = appointments.some(
      (apt) =>
        apt.roomId === roomId &&
        apt.startsAt < slotEnd &&
        apt.endsAt > slotStart,
    );

    if (roomConflict) return true;

    // Check device conflicts
    if (deviceIds.length > 0) {
      const deviceConflict = appointments.some((apt) => {
        if (apt.startsAt >= slotEnd || apt.endsAt <= slotStart) return false;

        const aptDeviceIds = apt.devices?.map((d) => d.id) || [];
        return aptDeviceIds.some((id) => deviceIds.includes(id));
      });

      if (deviceConflict) return true;
    }

    // Check breaks
    const breakConflict = breaks.some((brk) => {
      if (brk.startsAt >= slotEnd || brk.endsAt <= slotStart) return false;

      if (brk.resourceType === ResourceType.DOCTOR && brk.resourceId === doctorId) {
        return true;
      }
      if (brk.resourceType === ResourceType.ROOM && brk.resourceId === roomId) {
        return true;
      }
      if (
        brk.resourceType === ResourceType.DEVICE &&
        deviceIds.includes(brk.resourceId)
      ) {
        return true;
      }

      return false;
    });

    return breakConflict;
  }
}

