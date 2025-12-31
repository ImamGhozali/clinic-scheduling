import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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
} from './entities';
import { AppointmentsController } from './controllers/appointments.controller';
import { AvailabilityController } from './controllers/availability.controller';
import { DoctorsController } from './controllers/doctors.controller';
import { ServicesController } from './controllers/services.controller';
import { AppointmentsService } from './services/appointments.service';
import { AvailabilityService } from './services/availability.service';
import { DoctorsService } from './services/doctors.service';
import { ServicesService } from './services/services.service';
import { TenantGuard } from './guards/tenant.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    ]),
  ],
  controllers: [
    AppointmentsController,
    AvailabilityController,
    DoctorsController,
    ServicesController,
  ],
  providers: [
    AppointmentsService,
    AvailabilityService,
    DoctorsService,
    ServicesService,
    TenantGuard,
  ],
})
export class AppModule {}

