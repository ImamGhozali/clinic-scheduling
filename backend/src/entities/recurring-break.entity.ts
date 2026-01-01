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
import { ResourceType } from './break.entity';

@Entity('recurring_breaks')
@Index(['tenantId', 'resourceType', 'resourceId'])
@Index(['tenantId', 'dayOfWeek'])
export class RecurringBreak {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'int' })
  @Index()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({
    name: 'resource_type',
    type: 'enum',
    enum: ResourceType,
  })
  resourceType: ResourceType;

  @Column({ name: 'resource_id', type: 'int' })
  resourceId: number;

  @Column({ name: 'day_of_week', type: 'int', nullable: true })
  dayOfWeek: number | null; // NULL = daily, 0-6 = specific weekday (0=Sunday)

  @Column({ name: 'start_time', type: 'time' })
  startTime: string; // HH:MM format

  @Column({ name: 'end_time', type: 'time' })
  endTime: string; // HH:MM format

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom: Date;

  @Column({ name: 'effective_until', type: 'date', nullable: true })
  effectiveUntil: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

