import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Doctor } from './doctor.entity';

@Entity('working_hours')
@Index(['tenantId', 'doctorId', 'dayOfWeek'])
export class WorkingHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.workingHours)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: number; // 0-6 (Sunday-Saturday)

  @Column({ name: 'start_time', type: 'time' })
  startTime: string; // HH:MM format

  @Column({ name: 'end_time', type: 'time' })
  endTime: string; // HH:MM format

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

