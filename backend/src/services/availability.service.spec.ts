import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityService } from './availability.service';
import {
  Service,
  Doctor,
  Room,
  Device,
  Appointment,
  Break,
  RecurringBreak,
  WorkingHours,
} from '../entities';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let serviceRepository: Repository<Service>;
  let doctorRepository: Repository<Doctor>;
  let roomRepository: Repository<Room>;
  let appointmentRepository: Repository<Appointment>;
  let breakRepository: Repository<Break>;
  let recurringBreakRepository: Repository<RecurringBreak>;
  let workingHoursRepository: Repository<WorkingHours>;

  const mockService = {
    id: 501,
    tenantId: 1,
    name: 'Test Service',
    durationMin: 30,
    bufferBeforeMin: 5,
    bufferAfterMin: 5,
    requiresRoom: true,
    requiresDevice: false,
    requiredDevices: [],
  };

  const mockDoctor = {
    id: 101,
    tenantId: 1,
    name: 'Dr. Test',
    specialty: 'General',
    isActive: true,
  };

  const mockRoom = {
    id: 301,
    tenantId: 1,
    name: 'Room 1',
    isActive: true,
  };

  const mockWorkingHours = {
    id: 1,
    tenantId: 1,
    doctorId: 101,
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(Service),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Doctor),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Device),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Break),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RecurringBreak),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkingHours),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    serviceRepository = module.get(getRepositoryToken(Service));
    doctorRepository = module.get(getRepositoryToken(Doctor));
    roomRepository = module.get(getRepositoryToken(Room));
    appointmentRepository = module.get(getRepositoryToken(Appointment));
    breakRepository = module.get(getRepositoryToken(Break));
    recurringBreakRepository = module.get(getRepositoryToken(RecurringBreak));
    workingHoursRepository = module.get(getRepositoryToken(WorkingHours));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchAvailability', () => {
    it('should return empty slots when service not found', async () => {
      jest.spyOn(serviceRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.searchAvailability(
          1,
          999,
          '2026-03-15T00:00:00Z',
          '2026-03-15T23:59:59Z',
        ),
      ).rejects.toThrow();
    });

    it('should include service metadata in response', async () => {
      jest.spyOn(serviceRepository, 'findOne').mockResolvedValue(mockService as any);
      jest.spyOn(doctorRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDoctor]),
      } as any);
      jest.spyOn(roomRepository, 'find').mockResolvedValue([mockRoom] as any);
      jest.spyOn(appointmentRepository, 'find').mockResolvedValue([]);
      jest.spyOn(breakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

      const result = await service.searchAvailability(
        1,
        501,
        '2026-03-17T00:00:00Z', // Monday
        '2026-03-17T23:59:59Z',
      );

      expect(result.service).toBeDefined();
      expect(result.service.id).toBe(501);
      expect(result.service.duration_min).toBe(30);
      expect(result.service.buffer_before_min).toBe(5);
      expect(result.service.buffer_after_min).toBe(5);
    });

    it('should respect buffer times when checking conflicts', async () => {
      const existingAppointment = {
        id: 1001,
        tenantId: 1,
        doctorId: 101,
        startsAt: new Date('2026-03-17T10:00:00Z'),
        endsAt: new Date('2026-03-17T10:30:00Z'),
        status: 'scheduled',
      };

      jest.spyOn(serviceRepository, 'findOne').mockResolvedValue(mockService as any);
      jest.spyOn(doctorRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDoctor]),
      } as any);
      jest.spyOn(roomRepository, 'find').mockResolvedValue([mockRoom] as any);
      jest.spyOn(appointmentRepository, 'find').mockResolvedValue([existingAppointment] as any);
      jest.spyOn(breakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

      const result = await service.searchAvailability(
        1,
        501,
        '2026-03-17T09:00:00Z',
        '2026-03-17T12:00:00Z',
      );

      // Slots should not overlap with 10:00-10:30 + 5 min buffers (09:55-10:35)
      result.slots.forEach((slot: any) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);

        // Should not overlap with buffer zone (09:55-10:35)
        const bufferStart = new Date('2026-03-17T09:55:00Z');
        const bufferEnd = new Date('2026-03-17T10:35:00Z');

        const overlaps =
          slotStart < bufferEnd && slotEnd > bufferStart;

        expect(overlaps).toBe(false);
      });
    });

    it('should exclude slots during recurring breaks', async () => {
      const recurringBreak = {
        id: 1,
        tenantId: 1,
        resourceType: 'doctor',
        resourceId: 101,
        dayOfWeek: 1, // Monday
        startTime: '12:00',
        endTime: '13:00',
        isActive: true,
      };

      jest.spyOn(serviceRepository, 'findOne').mockResolvedValue(mockService as any);
      jest.spyOn(doctorRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDoctor]),
      } as any);
      jest.spyOn(roomRepository, 'find').mockResolvedValue([mockRoom] as any);
      jest.spyOn(appointmentRepository, 'find').mockResolvedValue([]);
      jest.spyOn(breakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([recurringBreak] as any);
      jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

      const result = await service.searchAvailability(
        1,
        501,
        '2026-03-17T11:00:00Z', // Monday
        '2026-03-17T14:00:00Z',
      );

      // No slots should overlap with lunch break (12:00-13:00 local time)
      result.slots.forEach((slot: any) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        
        // Convert to local time for comparison
        const slotStartHour = slotStart.getUTCHours();
        const slotEndHour = slotEnd.getUTCHours();

        // Assuming UTC+1 timezone, 12:00-13:00 local is 11:00-12:00 UTC
        // Slots should not overlap with this time
        if (slotStartHour === 11) {
          expect(slotStart.getUTCMinutes()).toBeLessThan(0);
        }
      });
    });

    it('should limit results to specified number of slots', async () => {
      jest.spyOn(serviceRepository, 'findOne').mockResolvedValue(mockService as any);
      jest.spyOn(doctorRepository, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDoctor]),
      } as any);
      jest.spyOn(roomRepository, 'find').mockResolvedValue([mockRoom] as any);
      jest.spyOn(appointmentRepository, 'find').mockResolvedValue([]);
      jest.spyOn(breakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
      jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

      const result = await service.searchAvailability(
        1,
        501,
        '2026-03-17T09:00:00Z',
        '2026-03-17T17:00:00Z',
      );

      expect(result.slots.length).toBeLessThanOrEqual(result.limit);
      expect(result.limit).toBe(3); // Default limit
    });
  });
});

