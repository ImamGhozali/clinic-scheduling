import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsISO8601, IsOptional, IsArray, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Doctor ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  doctor_id: string;

  @ApiProperty({
    description: 'Patient name',
    example: 'John Doe',
  })
  @IsString()
  patient_name: string;

  @ApiPropertyOptional({
    description: 'Patient email',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  patient_email?: string;

  @ApiPropertyOptional({
    description: 'Patient phone',
    example: '+1 (555) 123-4567',
  })
  @IsOptional()
  @IsString()
  patient_phone?: string;

  @ApiProperty({
    description: 'Start time in ISO 8601 format with timezone',
    example: '2025-09-15T09:30:00+02:00',
  })
  @IsISO8601()
  starts_at: string;

  @ApiProperty({
    description: 'End time in ISO 8601 format with timezone',
    example: '2025-09-15T10:00:00+02:00',
  })
  @IsISO8601()
  ends_at: string;

  @ApiPropertyOptional({
    description: 'Optional notes for the appointment',
    example: 'Patient requires wheelchair access',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

