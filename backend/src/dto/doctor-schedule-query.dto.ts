import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class DoctorScheduleQueryDto {
  @ApiProperty({
    description: 'Start of schedule range in ISO 8601 format',
    example: '2025-09-15T00:00:00+02:00',
  })
  @IsISO8601()
  from: string;

  @ApiProperty({
    description: 'End of schedule range in ISO 8601 format',
    example: '2025-09-22T23:59:59+02:00',
  })
  @IsISO8601()
  to: string;
}

