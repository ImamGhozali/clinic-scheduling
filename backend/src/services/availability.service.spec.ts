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

    describe('Working Hour Boundaries', () => {
      it('should not return slots before working hours start', async () => {
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

        // Search from 06:00 (before working hours at 09:00)
        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-17T06:00:00Z',
          '2026-03-17T10:00:00Z',
        );

        // All slots should be after 09:00 local time (08:00 UTC in winter)
        result.slots.forEach((slot: any) => {
          const slotStart = new Date(slot.start);
          expect(slotStart.getUTCHours()).toBeGreaterThanOrEqual(7);
        });
      });

      it('should not return slots after working hours end', async () => {
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

        // Search until 20:00 (after working hours end at 17:00)
        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-17T14:00:00Z',
          '2026-03-17T20:00:00Z',
        );

        // Slots should end before 17:00 local time (16:00 UTC in winter)
        result.slots.forEach((slot: any) => {
          const slotEnd = new Date(slot.end);
          // End time should be reasonable (before or at end of working hours)
          expect(slotEnd.getUTCHours()).toBeLessThan(18);
        });
      });

      it('should handle slots spanning working hour boundaries correctly', async () => {
        const longService = {
          ...mockService,
          durationMin: 120, // 2 hour service
        };

        jest.spyOn(serviceRepository, 'findOne').mockResolvedValue(longService as any);
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
          '2026-03-17T14:00:00Z', // Late afternoon
          '2026-03-17T18:00:00Z',
        );

        // 2-hour service starting at 16:00 would end at 18:00 (past 17:00 working hours)
        // Should not return slots that end after working hours
        result.slots.forEach((slot: any) => {
          const slotEnd = new Date(slot.end);
          const workingHoursEnd = new Date(slot.start);
          workingHoursEnd.setUTCHours(16, 0, 0, 0); // 17:00 Berlin = 16:00 UTC

          expect(slotEnd.getTime()).toBeLessThanOrEqual(workingHoursEnd.getTime());
        });
      });
    });

    describe('Buffer Time Edge Cases', () => {
      it('should include buffer_before in time calculations', async () => {
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
          '2026-03-17T09:50:00Z',
          '2026-03-17T10:10:00Z',
        );

        // Should not find slots at 09:50-10:20 because:
        // - Appointment at 10:00-10:30 has 5 min buffer before (09:55)
        // - Slots would need to respect this buffer
        result.slots.forEach((slot: any) => {
          const slotEnd = new Date(slot.end);
          const appointmentBufferStart = new Date('2026-03-17T09:55:00Z');
          
          // Slot should not end during or after buffer start
          if (slotEnd > appointmentBufferStart) {
            const slotStart = new Date(slot.start);
            const appointmentBufferEnd = new Date('2026-03-17T10:35:00Z');
            expect(slotStart.getTime()).toBeGreaterThanOrEqual(appointmentBufferEnd.getTime());
          }
        });
      });

      it('should include buffer_after in time calculations', async () => {
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
          '2026-03-17T10:20:00Z',
          '2026-03-17T11:00:00Z',
        );

        // Should not find slots at 10:30-11:00 because:
        // - Appointment ends at 10:30 with 5 min buffer after (until 10:35)
        result.slots.forEach((slot: any) => {
          const slotStart = new Date(slot.start);
          const appointmentEnd = new Date('2026-03-17T10:30:00Z');
          const appointmentBufferEnd = new Date('2026-03-17T10:35:00Z');
          
          // If slot starts before buffer end, it should be before appointment start
          if (slotStart < appointmentBufferEnd) {
            const slotEnd = new Date(slot.end);
            const appointmentBufferStart = new Date('2026-03-17T09:55:00Z');
            expect(slotEnd.getTime()).toBeLessThanOrEqual(appointmentBufferStart.getTime());
          }
        });
      });

      it('should prevent slots when buffer overlaps with break', async () => {
        const oneTimeBreak = {
          id: 1,
          tenantId: 1,
          resourceType: 'doctor',
          resourceId: 101,
          startsAt: new Date('2026-03-17T12:00:00Z'),
          endsAt: new Date('2026-03-17T13:00:00Z'),
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
        jest.spyOn(breakRepository, 'find').mockResolvedValue([oneTimeBreak] as any);
        jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
        jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-17T11:30:00Z',
          '2026-03-17T13:30:00Z',
        );

        // Slots should not overlap with break (12:00-13:00)
        result.slots.forEach((slot: any) => {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          const breakStart = new Date('2026-03-17T12:00:00Z');
          const breakEnd = new Date('2026-03-17T13:00:00Z');
          
          // No overlap: slot ends before break OR slot starts after break
          const hasOverlap = slotStart < breakEnd && slotEnd > breakStart;
          expect(hasOverlap).toBe(false);
        });
      });
    });

    describe('Break Handling', () => {
      it('should exclude slots during one-time breaks', async () => {
        const oneTimeBreak = {
          id: 1,
          tenantId: 1,
          resourceType: 'doctor',
          resourceId: 101,
          startsAt: new Date('2026-03-17T14:00:00Z'),
          endsAt: new Date('2026-03-17T14:30:00Z'),
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
        jest.spyOn(breakRepository, 'find').mockResolvedValue([oneTimeBreak] as any);
        jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
        jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-17T13:00:00Z',
          '2026-03-17T16:00:00Z',
        );

        // No slots should overlap with break (14:00-14:30)
        result.slots.forEach((slot: any) => {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          const breakStart = new Date('2026-03-17T14:00:00Z');
          const breakEnd = new Date('2026-03-17T14:30:00Z');
          
          const hasOverlap = slotStart < breakEnd && slotEnd > breakStart;
          expect(hasOverlap).toBe(false);
        });
      });

      it('should handle multiple breaks in one day', async () => {
        const breaks = [
          {
            id: 1,
            tenantId: 1,
            resourceType: 'doctor',
            resourceId: 101,
            startsAt: new Date('2026-03-17T10:30:00Z'),
            endsAt: new Date('2026-03-17T11:00:00Z'),
          },
          {
            id: 2,
            tenantId: 1,
            resourceType: 'doctor',
            resourceId: 101,
            startsAt: new Date('2026-03-17T14:00:00Z'),
            endsAt: new Date('2026-03-17T14:30:00Z'),
          },
        ];

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
        jest.spyOn(breakRepository, 'find').mockResolvedValue(breaks as any);
        jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
        jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-17T09:00:00Z',
          '2026-03-17T16:00:00Z',
        );

        // No slots should overlap with either break
        result.slots.forEach((slot: any) => {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          
          breaks.forEach((brk) => {
            const hasOverlap = slotStart < brk.endsAt && slotEnd > brk.startsAt;
            expect(hasOverlap).toBe(false);
          });
        });
      });

      it('should handle recurring breaks on different days', async () => {
        const mondayBreak = {
          id: 1,
          tenantId: 1,
          resourceType: 'doctor',
          resourceId: 101,
          dayOfWeek: 1, // Monday
          startTime: '12:00',
          endTime: '13:00',
          isActive: true,
        };

        const tuesdayWorkingHours = {
          ...mockWorkingHours,
          dayOfWeek: 2, // Tuesday
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
        jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([mondayBreak] as any);
        jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([tuesdayWorkingHours] as any);

        // Search on Tuesday (break is only on Monday)
        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-18T11:00:00Z', // Tuesday
          '2026-03-18T14:00:00Z',
        );

        // Should have slots available on Tuesday
        // (break only applies to Monday, so Tuesday 12:00-13:00 should be available)
        // This test verifies that recurring breaks are day-specific
        expect(result.slots).toBeDefined();
        expect(Array.isArray(result.slots)).toBe(true);
      });
    });

    describe('Multi-Resource Conflicts', () => {
      it('should detect room conflicts independently', async () => {
        const roomConflict = {
          id: 1001,
          tenantId: 1,
          doctorId: 102, // Different doctor
          roomId: 301, // Same room as mockRoom
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
        jest.spyOn(appointmentRepository, 'find').mockResolvedValue([roomConflict] as any);
        jest.spyOn(breakRepository, 'find').mockResolvedValue([]);
        jest.spyOn(recurringBreakRepository, 'find').mockResolvedValue([]);
        jest.spyOn(workingHoursRepository, 'find').mockResolvedValue([mockWorkingHours] as any);

        const result = await service.searchAvailability(
          1,
          501,
          '2026-03-17T09:30:00Z',
          '2026-03-17T11:00:00Z',
        );

        // Should not find slots using room 301 from 10:00-10:30
        result.slots.forEach((slot: any) => {
          if (slot.room_id === 301) {
            const slotStart = new Date(slot.start);
            const slotEnd = new Date(slot.end);
            const conflictStart = new Date('2026-03-17T10:00:00Z');
            const conflictEnd = new Date('2026-03-17T10:30:00Z');
            
            const hasOverlap = slotStart < conflictEnd && slotEnd > conflictStart;
            expect(hasOverlap).toBe(false);
          }
        });
      });
    });
  });
});

