import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AvailabilityQueryDto {
  @ApiProperty({
    description: 'Service ID to search availability for',
    example: 501,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  service_id: number;

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
    example: '101,102,103',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value) // Keep as string, will be parsed in service
  doctor_ids?: string;
}

