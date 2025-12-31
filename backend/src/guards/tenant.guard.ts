import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract tenant identifier from X-Tenant-Id header (can be ID or slug)
    const tenantIdentifier = request.headers['x-tenant-id'];

    if (!tenantIdentifier) {
      throw new BadRequestException(
        'Missing X-Tenant-Id header. Please provide a valid tenant identifier.',
      );
    }

    // Try to parse as integer ID first, otherwise treat as slug
    const tenantId = parseInt(tenantIdentifier, 10);
    let tenant;

    if (!isNaN(tenantId)) {
      // Lookup by integer ID
      tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });
    } else {
      // Lookup by slug
      tenant = await this.tenantRepository.findOne({
        where: { slug: tenantIdentifier },
      });
    }

    if (!tenant) {
      throw new NotFoundException(
        `Tenant not found with identifier: ${tenantIdentifier}`,
      );
    }

    // Attach tenant to request for use in controllers/services
    request.tenant = tenant;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Tenant validated: ${tenant.name} (ID: ${tenant.id}, Slug: ${tenant.slug})`);
    }

    return true;
  }
}

