import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentsService } from '../services/appointments.service';
import { DoctorsService } from '../services/doctors.service';
import { TenantGuard } from '../guards/tenant.guard';
import { GetTenant } from '../decorators/tenant.decorator';
import { Tenant } from '../entities';
import { DoctorScheduleQueryDto } from '../dto/doctor-schedule-query.dto';

@ApiTags('Doctors')
@Controller('doctors')
@UseGuards(TenantGuard)
@ApiSecurity('X-Tenant-Id')
export class DoctorsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly doctorsService: DoctorsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all doctors for the tenant',
    description: 'Retrieves a list of all active doctors, optionally filtered by service qualification',
  })
  @ApiQuery({
    name: 'service_id',
    required: false,
    description: 'Filter doctors by service they can perform',
    example: '850e8400-e29b-41d4-a716-446655440010',
  })
  @ApiResponse({
    status: 200,
    description: 'List of doctors',
  })
  async getDoctors(
    @GetTenant() tenant: Tenant,
    @Query('service_id') serviceId?: string,
  ) {
    return await this.doctorsService.getDoctors(tenant.id, serviceId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single doctor by ID',
    description: 'Retrieves details of a specific doctor',
  })
  @ApiParam({
    name: 'id',
    description: 'Doctor ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor details',
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
  })
  async getDoctor(@GetTenant() tenant: Tenant, @Param('id') doctorId: string) {
    return await this.doctorsService.getDoctor(tenant.id, doctorId);
  }

  @Get(':id/schedule')
  @ApiOperation({
    summary: "Get doctor's schedule for calendar view",
    description:
      "Retrieves all appointments for a doctor within a date range for displaying in a calendar",
  })
  @ApiParam({
    name: 'id',
    description: 'Doctor ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: "Doctor's appointments for the specified date range",
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found',
  })
  async getDoctorSchedule(
    @GetTenant() tenant: Tenant,
    @Param('id') doctorId: string,
    @Query() query: DoctorScheduleQueryDto,
  ) {
    return await this.appointmentsService.getDoctorSchedule(
      tenant.id,
      doctorId,
      query.from,
      query.to,
    );
  }
}

