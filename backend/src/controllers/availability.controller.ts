import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { AvailabilityService } from '../services/availability.service';
import { TenantGuard } from '../guards/tenant.guard';
import { GetTenant } from '../decorators/tenant.decorator';
import { Tenant } from '../entities';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';

@ApiTags('Availability')
@Controller('availability')
@UseGuards(TenantGuard)
@ApiSecurity('X-Tenant-Id')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'Search for available appointment slots',
    description:
      'Returns the next 3 available time slots for a service that satisfy resource requirements, duration, buffers, working hours, and breaks',
  })
  @ApiResponse({
    status: 200,
    description: 'Available time slots',
    schema: {
      example: {
        slots: [
          {
            doctor_id: '550e8400-e29b-41d4-a716-446655440000',
            doctor_name: 'Dr. Smith',
            room_id: '550e8400-e29b-41d4-a716-446655440003',
            room_name: 'Room 101',
            device_ids: ['550e8400-e29b-41d4-a716-446655440004'],
            start: '2025-09-15T09:30:00+02:00',
            end: '2025-09-15T10:15:00+02:00',
          },
          {
            doctor_id: '550e8400-e29b-41d4-a716-446655440000',
            doctor_name: 'Dr. Smith',
            room_id: '550e8400-e29b-41d4-a716-446655440003',
            room_name: 'Room 101',
            device_ids: ['550e8400-e29b-41d4-a716-446655440004'],
            start: '2025-09-15T10:30:00+02:00',
            end: '2025-09-15T11:15:00+02:00',
          },
          {
            doctor_id: '550e8400-e29b-41d4-a716-446655440001',
            doctor_name: 'Dr. Jones',
            room_id: '550e8400-e29b-41d4-a716-446655440005',
            room_name: 'Room 102',
            device_ids: [],
            start: '2025-09-15T11:00:00+02:00',
            end: '2025-09-15T11:30:00+02:00',
          },
        ],
        limit: 3,
        service: {
          id: 501,
          name: 'General Consultation',
          duration_min: 30,
          buffer_before_min: 5,
          buffer_after_min: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async searchAvailability(
    @GetTenant() tenant: Tenant,
    @Query() query: AvailabilityQueryDto,
  ) {
    // Parse doctor_ids if provided (convert strings to numbers)
    const doctorIds = query.doctor_ids
      ? query.doctor_ids.split(',').map((id) => parseInt(id.trim(), 10))
      : undefined;

    return await this.availabilityService.searchAvailability(
      tenant.id,
      query.service_id,
      query.from,
      query.to,
      doctorIds,
    );
  }
}

