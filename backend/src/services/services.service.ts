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

  async getServices(tenantId: string): Promise<Service[]> {
    return await this.serviceRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async getService(tenantId: string, id: string): Promise<Service | null> {
    return await this.serviceRepository.findOne({
      where: { id, tenantId },
    });
  }
}

