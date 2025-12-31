import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsArray, IsString, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Doctor ID',
    example: 101,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  doctor_id: number;

  @ApiProperty({
    description: 'Service ID',
    example: 501,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  service_id: number;

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

