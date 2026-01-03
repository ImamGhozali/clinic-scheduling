import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Appointment,
  Doctor,
  Service,
  Room,
  Device,
  Patient,
  Break,
  ResourceType,
  AppointmentStatus,
} from '../entities';
import { AppointmentConflictException } from '../exceptions/appointment-conflict.exception';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let mockDataSource: any;
  let mockManager: any;

  const mockAppointmentRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockDoctorRepository = {
    findOne: jest.fn(),
  };

  const mockServiceRepository = {
    findOne: jest.fn(),
  };

  const mockRoomRepository = {
    findOne: jest.fn(),
  };

  const mockDeviceRepository = {
    findByIds: jest.fn(),
  };

  const mockPatientRepository = {
    save: jest.fn(),
  };

  const mockBreakRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn((callback) => callback(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Appointment),
          useValue: mockAppointmentRepository,
        },
        {
          provide: getRepositoryToken(Doctor),
          useValue: mockDoctorRepository,
        },
        {
          provide: getRepositoryToken(Service),
          useValue: mockServiceRepository,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: mockRoomRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: getRepositoryToken(Patient),
          useValue: mockPatientRepository,
        },
        {
          provide: getRepositoryToken(Break),
          useValue: mockBreakRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Conflict Detection', () => {
    const mockDoctor = {
      id: 101,
      tenantId: 1,
      name: 'Dr. Test',
      isActive: true,
    };

    const mockService = {
      id: 501,
      tenantId: 1,
      name: 'Test Service',
      durationMin: 30,
      bufferBeforeMin: 5,
      bufferAfterMin: 10,
    };

    const mockRoom = {
      id: 201,
      tenantId: 1,
      name: 'Room 1',
      isActive: true,
    };

    const mockPatient = {
      id: 301,
      tenantId: 1,
      name: 'Test Patient',
      email: 'test@example.com',
    };

    beforeEach(() => {
      // Default mocks for successful booking
      mockManager.findOne.mockImplementation((entity: any, options: any) => {
        if (entity === Doctor) return Promise.resolve(mockDoctor);
        if (entity === Service) return Promise.resolve(mockService);
        if (entity === Room) return Promise.resolve(mockRoom);
        if (entity === Appointment && options?.relations) {
          // Return appointment with relations after save
          return Promise.resolve({
            id: 100,
            tenantId: 1,
            doctorId: 101,
            patientId: 301,
            serviceId: 501,
            roomId: 201,
            startsAt: new Date('2026-03-15T10:00:00Z'),
            endsAt: new Date('2026-03-15T10:30:00Z'),
            status: 'scheduled',
            bufferBeforeMin: 5,
            bufferAfterMin: 10,
            doctor: mockDoctor,
            patient: mockPatient,
            room: mockRoom,
          });
        }
        return Promise.resolve(null);
      });

      mockManager.create.mockImplementation((entity: any, data: any) => ({
        ...data,
        id: 301,
      }));

      mockManager.save.mockImplementation((entity: any, data?: any) => {
        if (entity === Patient || (data && !data.doctorId)) {
          return Promise.resolve({ ...mockPatient, ...(data || entity) });
        }
        return Promise.resolve({
          ...mockPatient,
          ...(data || entity),
          id: 100,
        });
      });
    });

    it('should detect doctor time overlap conflict', async () => {
      const existingAppointment = {
        id: 1,
        doctorId: 101,
        roomId: 201,
        startsAt: new Date('2026-03-15T10:00:00Z'),
        endsAt: new Date('2026-03-15T10:30:00Z'),
        bufferBeforeMin: 5,
        bufferAfterMin: 10,
      };

      // Mock query builder for conflict detection
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAppointment]),
      };

      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T10:15:00Z', // Overlaps with existing
      };

      await expect(service.createAppointment(1, dto)).rejects.toThrow(
        AppointmentConflictException,
      );
    });

    it('should detect room conflict', async () => {
      const existingAppointment = {
        id: 1,
        doctorId: 102, // Different doctor
        roomId: 201, // Same room
        startsAt: new Date('2026-03-15T10:00:00Z'),
        endsAt: new Date('2026-03-15T10:30:00Z'),
        bufferBeforeMin: 5,
        bufferAfterMin: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAppointment]),
      };

      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T10:15:00Z',
      };

      await expect(service.createAppointment(1, dto)).rejects.toThrow(
        AppointmentConflictException,
      );
    });

    it('should respect buffer times in conflict detection', async () => {
      // Existing appointment: 10:00-10:30 with 5 min before, 10 min after
      // Total blocked time: 09:55-10:40
      const existingAppointment = {
        id: 1,
        doctorId: 101,
        roomId: 201,
        startsAt: new Date('2026-03-15T10:00:00Z'),
        endsAt: new Date('2026-03-15T10:30:00Z'),
        bufferBeforeMin: 5,
        bufferAfterMin: 10,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAppointment]),
      };

      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Try to book at 10:35 (30 min service + 5 min before = 10:30-11:05)
      // Buffer of existing ends at 10:40, so 10:35 start is within buffer zone
      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T10:35:00Z',
      };

      await expect(service.createAppointment(1, dto)).rejects.toThrow(
        AppointmentConflictException,
      );
    });

    it('should allow back-to-back appointments with exact buffer timing', async () => {
      // No conflicts expected
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Book at 10:45 (after buffer ends at 10:40 + new buffer before 5 min)
      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T10:45:00Z',
      };

      const result = await service.createAppointment(1, dto);
      
      // Should succeed without conflicts
      expect(result).toBeDefined();
      expect(result.id).toBe(100);
    });

    it('should detect conflicts with breaks', async () => {
      const mockBreak = {
        id: 1,
        tenantId: 1,
        resourceType: ResourceType.DOCTOR,
        resourceId: 101,
        startsAt: new Date('2026-03-15T12:00:00Z'),
        endsAt: new Date('2026-03-15T13:00:00Z'),
        reason: 'Lunch',
      };

      // No appointment conflicts
      const mockAppointmentQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      // Break conflicts
      const mockBreakQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBreak]),
      };

      mockManager.createQueryBuilder.mockImplementation((entity: any) => {
        if (entity.name === 'Break') return mockBreakQueryBuilder;
        return mockAppointmentQueryBuilder;
      });

      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T12:15:00Z', // During lunch break
      };

      await expect(service.createAppointment(1, dto)).rejects.toThrow(
        AppointmentConflictException,
      );
    });

    it('should allow appointments when no conflicts exist', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No conflicts
      };

      mockManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T10:00:00Z',
      };

      const result = await service.createAppointment(1, dto);

      expect(result).toBeDefined();
      expect(result.id).toBe(100);
      expect(result.doctorId).toBe(101);
    });

    it('should validate that ends_at matches service duration', async () => {
      const dto = {
        doctor_id: 101,
        service_id: 501,
        patient_name: 'New Patient',
        patient_email: 'new@example.com',
        starts_at: '2026-03-15T10:00:00Z',
        ends_at: '2026-03-15T11:00:00Z', // 60 min instead of 30 min
      };

      await expect(service.createAppointment(1, dto)).rejects.toThrow(
        /End time must be/i,
      );
    });
  });
});

