import { ConflictException } from '@nestjs/common';

export interface ConflictDetails {
  resource: 'doctor' | 'room' | 'device';
  resourceId: number;
  conflictingAppointmentId: number;
  conflictingTime: {
    starts_at: string;
    ends_at: string;
  };
}

export class AppointmentConflictException extends ConflictException {
  constructor(conflicts: ConflictDetails[]) {
    super({
      statusCode: 409,
      message: 'Appointment conflict detected',
      conflicts,
    });
  }
}

