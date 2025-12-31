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
    
    // Extract tenant slug from X-Tenant-Id header
    const tenantSlug = request.headers['x-tenant-id'];

    if (!tenantSlug) {
      throw new BadRequestException(
        'Missing X-Tenant-Id header. Please provide a valid tenant identifier.',
      );
    }

    // Lookup tenant by slug
    const tenant = await this.tenantRepository.findOne({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant not found with slug: ${tenantSlug}`,
      );
    }

    // Attach tenant to request for use in controllers/services
    request.tenant = tenant;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Tenant validated: ${tenant.name} (${tenant.slug})`);
    }

    return true;
  }
}

