import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentsService } from '../services/appointments.service';
import { TenantGuard } from '../guards/tenant.guard';
import { GetTenant } from '../decorators/tenant.decorator';
import { Tenant, AppointmentStatus } from '../entities';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { DoctorScheduleQueryDto } from '../dto/doctor-schedule-query.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(TenantGuard)
@ApiSecurity('X-Tenant-Id')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new appointment',
    description:
      'Creates an appointment with conflict detection for doctor, room, and devices. Returns 409 if conflicts detected.',
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Resource not found (doctor, patient, service, room, or device)',
  })
  @ApiResponse({
    status: 409,
    description: 'Appointment conflict detected',
    schema: {
      example: {
        statusCode: 409,
        message: 'Appointment conflict detected',
        conflicts: [
          {
            resource: 'doctor',
            resourceId: '550e8400-e29b-41d4-a716-446655440000',
            conflictingAppointmentId: '650e8400-e29b-41d4-a716-446655440099',
            conflictingTime: {
              starts_at: '2025-09-15T09:00:00.000Z',
              ends_at: '2025-09-15T10:00:00.000Z',
            },
          },
        ],
      },
    },
  })
  async createAppointment(
    @GetTenant() tenant: Tenant,
    @Body() dto: CreateAppointmentDto,
  ) {
    return await this.appointmentsService.createAppointment(tenant.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an appointment',
    description: 'Changes appointment status to cancelled',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
  async cancelAppointment(
    @GetTenant() tenant: Tenant,
    @Param('id') id: string,
  ) {
    return await this.appointmentsService.cancelAppointment(tenant.id, parseInt(id, 10));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get appointment by ID',
    description: 'Retrieves a single appointment with all relations',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment details',
  })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found',
  })
  async getAppointment(
    @GetTenant() tenant: Tenant,
    @Param('id') id: string,
  ) {
    return await this.appointmentsService.getAppointment(tenant.id, parseInt(id, 10));
  }

  @Get()
  @ApiOperation({
    summary: 'List appointments with filters',
    description: 'Retrieves appointments for the tenant with optional filters',
  })
  @ApiQuery({
    name: 'doctor_id',
    required: false,
    description: 'Filter by doctor ID',
  })
  @ApiQuery({
    name: 'patient_id',
    required: false,
    description: 'Filter by patient ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AppointmentStatus,
    description: 'Filter by appointment status',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start of date range (ISO 8601)',
    example: '2025-09-15T00:00:00+02:00',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End of date range (ISO 8601)',
    example: '2025-09-22T23:59:59+02:00',
  })
  @ApiResponse({
    status: 200,
    description: 'List of appointments',
  })
  async listAppointments(
    @GetTenant() tenant: Tenant,
    @Query('doctor_id') doctorId?: string,
    @Query('patient_id') patientId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return await this.appointmentsService.listAppointments(tenant.id, {
      doctorId: doctorId ? parseInt(doctorId, 10) : undefined,
      patientId: patientId ? parseInt(patientId, 10) : undefined,
      status,
      from,
      to,
    });
  }
}

