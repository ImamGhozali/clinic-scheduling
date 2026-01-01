import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../entities';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  private transformService(service: Service) {
    return {
      id: service.id,
      tenant_id: service.tenantId,
      name: service.name,
      description: service.description,
      duration_min: service.durationMin,
      buffer_before_min: service.bufferBeforeMin,
      buffer_after_min: service.bufferAfterMin,
      requires_room: service.requiresRoom,
      requires_device: service.requiresDevice,
      created_at: service.createdAt,
      updated_at: service.updatedAt,
    };
  }

  async getServices(tenantId: number) {
    const services = await this.serviceRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
    return services.map(s => this.transformService(s));
  }

  async getService(tenantId: number, id: number) {
    const service = await this.serviceRepository.findOne({
      where: { id, tenantId },
    });
    return service ? this.transformService(service) : null;
  }
}

