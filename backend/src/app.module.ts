import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  Tenant,
  Doctor,
  Patient,
  Service,
  Room,
  Device,
  Appointment,
  WorkingHours,
  Break,
  RecurringBreak,
  IdempotencyKey,
} from './entities';
import { AppointmentsController } from './controllers/appointments.controller';
import { AvailabilityController } from './controllers/availability.controller';
import { DoctorsController } from './controllers/doctors.controller';
import { ServicesController } from './controllers/services.controller';
import { PartitionMaintenanceController } from './controllers/partition-maintenance.controller';
import { AppointmentsService } from './services/appointments.service';
import { AvailabilityService } from './services/availability.service';
import { DoctorsService } from './services/doctors.service';
import { ServicesService } from './services/services.service';
import { PartitionMaintenanceService } from './services/partition-maintenance.service';
import { TenantGuard } from './guards/tenant.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      // Use DATABASE_URL if available (Neon connection string), otherwise use individual params
      url: process.env.DATABASE_URL,
      // Fallback to individual params if DATABASE_URL not set
      ...(process.env.DATABASE_URL
        ? {}
        : {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            username: process.env.POSTGRES_USER || 'clinic_user',
            password: process.env.POSTGRES_PASSWORD || 'clinic_password',
            database: process.env.POSTGRES_DB || 'clinic_scheduling',
          }),
      entities: [
        Tenant,
        Doctor,
        Patient,
        Service,
        Room,
        Device,
        Appointment,
        WorkingHours,
        Break,
        RecurringBreak,
        IdempotencyKey,
      ],
      synchronize: false, // Use migrations in production
      // SSL configuration for Neon (required for secure connections)
      ssl: process.env.DATABASE_URL
        ? {
            rejectUnauthorized: false, // Required for Neon.tech
          }
        : false,
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([
      Tenant,
      Doctor,
      Patient,
      Service,
      Room,
      Device,
      Appointment,
      WorkingHours,
      Break,
      RecurringBreak,
      IdempotencyKey,
    ]),
  ],
  controllers: [
    AppointmentsController,
    AvailabilityController,
    DoctorsController,
    ServicesController,
    PartitionMaintenanceController,
  ],
  providers: [
    AppointmentsService,
    AvailabilityService,
    DoctorsService,
    ServicesService,
    PartitionMaintenanceService,
    TenantGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}

