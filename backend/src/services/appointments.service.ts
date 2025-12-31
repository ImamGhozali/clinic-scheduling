import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
  Doctor,
  Service,
  Room,
  Device,
  Patient,
  Break,
  ResourceType,
} from '../entities';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import {
  AppointmentConflictException,
  ConflictDetails,
} from '../exceptions/appointment-conflict.exception';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Break)
    private breakRepository: Repository<Break>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new appointment with conflict detection
   * Uses database transaction for concurrency safety
   */
  async createAppointment(
    tenantId: string,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Validate doctor exists and belongs to tenant
      const doctor = await manager.findOne(Doctor, {
        where: { id: dto.doctor_id, tenantId, isActive: true },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor not found: ${dto.doctor_id}`);
      }

      // 2. Create or find patient (simplified - create new patient each time)
      const patient = manager.create(Patient, {
        tenantId,
        name: dto.patient_name,
        email: dto.patient_email,
        phone: dto.patient_phone,
      });
      await manager.save(patient);

      // 3. Find an available room (simplified - pick first available)
      const room = await manager.findOne(Room, {
        where: { tenantId, isActive: true },
      });
      if (!room) {
        throw new NotFoundException('No rooms available');
      }

      // 4. Calculate appointment times
      const startsAt = new Date(dto.starts_at);
      const endsAt = new Date(dto.ends_at);

      // Time range including buffers for conflict detection (use default 5 min buffers)
      const bufferBeforeMin = 5;
      const bufferAfterMin = 5;
      const bufferStartsAt = new Date(
        startsAt.getTime() - bufferBeforeMin * 60000,
      );
      const bufferEndsAt = new Date(
        endsAt.getTime() + bufferAfterMin * 60000,
      );

      // 5. Check for conflicts
      const conflicts = await this.detectConflicts(
        manager,
        tenantId,
        dto.doctor_id,
        room.id,
        [],
        bufferStartsAt,
        bufferEndsAt,
      );

      if (conflicts.length > 0) {
        throw new AppointmentConflictException(conflicts);
      }

      // 6. Check breaks
      await this.checkBreaks(
        manager,
        tenantId,
        dto.doctor_id,
        room.id,
        [],
        bufferStartsAt,
        bufferEndsAt,
      );

      // 7. Create appointment
      const newAppointment = manager.create(Appointment, {
        tenantId,
        doctorId: dto.doctor_id,
        patientId: patient.id,
        roomId: room.id,
        startsAt,
        endsAt,
        status: AppointmentStatus.SCHEDULED,
        notes: dto.notes,
      });

      const savedAppointment = await manager.save(Appointment, newAppointment);

      // Return with relations
      const appointment = await manager.findOne(Appointment, {
        where: { id: savedAppointment.id },
        relations: ['doctor', 'patient', 'room'],
      });
      
      if (!appointment) {
        throw new Error('Failed to retrieve created appointment');
      }
      
      return appointment;
    });
    
    return result;
  }

  /**
   * Detect conflicts with existing appointments
   * Returns array of conflict details
   */
  private async detectConflicts(
    manager: any,
    tenantId: string,
    doctorId: string,
    roomId: string,
    deviceIds: string[],
    startsAt: Date,
    endsAt: Date,
  ): Promise<ConflictDetails[]> {
    const conflicts: ConflictDetails[] = [];

    // Check doctor conflicts (using closed-open interval [start, end))
    const doctorConflicts = await manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.status != :cancelled', {
        cancelled: AppointmentStatus.CANCELLED,
      })
      .andWhere('a.startsAt < :endsAt', { endsAt })
      .andWhere('a.endsAt > :startsAt', { startsAt })
      .getMany();

    for (const conflict of doctorConflicts) {
      conflicts.push({
        resource: 'doctor',
        resourceId: doctorId,
        conflictingAppointmentId: conflict.id,
        conflictingTime: {
          starts_at: conflict.startsAt.toISOString(),
          ends_at: conflict.endsAt.toISOString(),
        },
      });
    }

    // Check room conflicts
    const roomConflicts = await manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.roomId = :roomId', { roomId })
      .andWhere('a.status != :cancelled', {
        cancelled: AppointmentStatus.CANCELLED,
      })
      .andWhere('a.startsAt < :endsAt', { endsAt })
      .andWhere('a.endsAt > :startsAt', { startsAt })
      .getMany();

    for (const conflict of roomConflicts) {
      conflicts.push({
        resource: 'room',
        resourceId: roomId,
        conflictingAppointmentId: conflict.id,
        conflictingTime: {
          starts_at: conflict.startsAt.toISOString(),
          ends_at: conflict.endsAt.toISOString(),
        },
      });
    }

    // Check device conflicts
    if (deviceIds.length > 0) {
      const deviceConflicts = await manager
        .createQueryBuilder(Appointment, 'a')
        .innerJoin('a.devices', 'd')
        .where('a.tenantId = :tenantId', { tenantId })
        .andWhere('d.id IN (:...deviceIds)', { deviceIds })
        .andWhere('a.status != :cancelled', {
          cancelled: AppointmentStatus.CANCELLED,
        })
        .andWhere('a.startsAt < :endsAt', { endsAt })
        .andWhere('a.endsAt > :startsAt', { startsAt })
        .getMany();

      for (const conflict of deviceConflicts) {
        // Find which device(s) conflicted
        const conflictingDevices = await manager
          .createQueryBuilder()
          .select('ad.device_id')
          .from('appointment_devices', 'ad')
          .where('ad.appointment_id = :appointmentId', {
            appointmentId: conflict.id,
          })
          .andWhere('ad.device_id IN (:...deviceIds)', { deviceIds })
          .getRawMany();

        for (const dev of conflictingDevices) {
          conflicts.push({
            resource: 'device',
            resourceId: dev.device_id,
            conflictingAppointmentId: conflict.id,
            conflictingTime: {
              starts_at: conflict.startsAt.toISOString(),
              ends_at: conflict.endsAt.toISOString(),
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if appointment falls within break times
   */
  private async checkBreaks(
    manager: any,
    tenantId: string,
    doctorId: string,
    roomId: string,
    deviceIds: string[],
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> {
    const resourceIds = [doctorId, roomId, ...deviceIds];
    const resourceTypes = [
      ResourceType.DOCTOR,
      ResourceType.ROOM,
      ...deviceIds.map(() => ResourceType.DEVICE),
    ];

    const breaks = await manager
      .createQueryBuilder(Break, 'b')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.resourceId IN (:...resourceIds)', { resourceIds })
      .andWhere('b.startsAt < :endsAt', { endsAt })
      .andWhere('b.endsAt > :startsAt', { startsAt })
      .getMany();

    if (breaks.length > 0) {
      const conflicts: ConflictDetails[] = breaks.map((brk: Break) => ({
        resource: brk.resourceType as any,
        resourceId: brk.resourceId,
        conflictingAppointmentId: `break-${brk.id}`,
        conflictingTime: {
          starts_at: brk.startsAt.toISOString(),
          ends_at: brk.endsAt.toISOString(),
        },
      }));

      throw new AppointmentConflictException(conflicts);
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    tenantId: string,
    appointmentId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['doctor', 'patient', 'service', 'room'],
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment not found: ${appointmentId}`,
      );
    }

    appointment.status = AppointmentStatus.CANCELLED;
    return await this.appointmentRepository.save(appointment);
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(
    tenantId: string,
    appointmentId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['doctor', 'patient', 'service', 'room', 'devices'],
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment not found: ${appointmentId}`,
      );
    }

    return appointment;
  }

  /**
   * List appointments with filters
   */
  async listAppointments(
    tenantId: string,
    filters: {
      doctorId?: string;
      patientId?: string;
      status?: AppointmentStatus;
      from?: string;
      to?: string;
    },
  ): Promise<Appointment[]> {
    const query = this.appointmentRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.service', 'service')
      .leftJoinAndSelect('a.room', 'room')
      .leftJoinAndSelect('a.devices', 'devices')
      .where('a.tenantId = :tenantId', { tenantId });

    if (filters.doctorId) {
      query.andWhere('a.doctorId = :doctorId', {
        doctorId: filters.doctorId,
      });
    }

    if (filters.patientId) {
      query.andWhere('a.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }

    if (filters.status) {
      query.andWhere('a.status = :status', { status: filters.status });
    }

    if (filters.from) {
      query.andWhere('a.startsAt >= :from', { from: new Date(filters.from) });
    }

    if (filters.to) {
      query.andWhere('a.endsAt <= :to', { to: new Date(filters.to) });
    }

    query.orderBy('a.startsAt', 'ASC');

    return await query.getMany();
  }

  /**
   * Get doctor's schedule for a date range
   */
  async getDoctorSchedule(
    tenantId: string,
    doctorId: string,
    from: string,
    to: string,
  ): Promise<Appointment[]> {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId, tenantId },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor not found: ${doctorId}`);
    }

    return await this.listAppointments(tenantId, {
      doctorId,
      from,
      to,
    });
  }
}

