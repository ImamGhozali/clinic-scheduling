import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsISO8601, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AvailabilityQueryDto {
  @ApiProperty({
    description: 'Service ID to search availability for',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  service_id: string;

  @ApiProperty({
    description: 'Start of search range in ISO 8601 format',
    example: '2025-09-15T08:00:00+02:00',
  })
  @IsISO8601()
  from: string;

  @ApiProperty({
    description: 'End of search range in ISO 8601 format',
    example: '2025-09-16T18:00:00+02:00',
  })
  @IsISO8601()
  to: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of doctor IDs to search (optional)',
    example: '550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value) // Keep as string for now
  doctor_ids?: string;
}

