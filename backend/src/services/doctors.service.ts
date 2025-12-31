import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../entities';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
  ) {}

  /**
   * Get all doctors for a tenant, optionally filtered by service
   */
  async getDoctors(tenantId: number, serviceId?: number): Promise<Doctor[]> {
    const query = this.doctorRepository
      .createQueryBuilder('doctor')
      .where('doctor.tenant_id = :tenantId', { tenantId })
      .andWhere('doctor.is_active = :isActive', { isActive: true });

    // If serviceId is provided, filter doctors who can perform this service
    if (serviceId) {
      query
        .innerJoin('doctor_services', 'ds', 'ds.doctor_id = doctor.id')
        .andWhere('ds.service_id = :serviceId', { serviceId });
    }

    query.orderBy('doctor.name', 'ASC');

    return await query.getMany();
  }

  /**
   * Get a single doctor by ID
   */
  async getDoctor(tenantId: number, doctorId: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { id: doctorId, tenantId, isActive: true },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor not found: ${doctorId}`);
    }

    return doctor;
  }
}

