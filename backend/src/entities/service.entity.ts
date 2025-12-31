import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Device } from './device.entity';

@Entity('services')
@Index(['tenantId'])
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'int' })
  @Index()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'duration_min', type: 'int' })
  durationMin: number;

  @Column({ name: 'buffer_before_min', type: 'int', default: 0 })
  bufferBeforeMin: number;

  @Column({ name: 'buffer_after_min', type: 'int', default: 0 })
  bufferAfterMin: number;

  @Column({ name: 'requires_room', default: true })
  requiresRoom: boolean;

  @Column({ name: 'requires_device', default: false })
  requiresDevice: boolean;

  @ManyToMany(() => Device)
  @JoinTable({
    name: 'service_devices',
    joinColumn: { name: 'service_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'device_id', referencedColumnName: 'id' },
  })
  requiredDevices: Device[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

