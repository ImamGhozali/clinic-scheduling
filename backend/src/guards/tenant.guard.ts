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
    
    // Extract tenant ID from X-Tenant-Id header (should be numeric ID)
    const tenantIdentifier = request.headers['x-tenant-id'];

    if (!tenantIdentifier) {
      throw new BadRequestException(
        'Missing X-Tenant-Id header. Please provide a valid tenant ID.',
      );
    }

    // Parse as integer ID (preferred), fallback to slug for backward compatibility
    const tenantId = parseInt(tenantIdentifier, 10);
    let tenant;

    if (!isNaN(tenantId)) {
      // Lookup by integer ID (preferred method)
      tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });
    } else {
      // Fallback: Lookup by slug for backward compatibility
      tenant = await this.tenantRepository.findOne({
        where: { slug: tenantIdentifier },
      });
    }

    if (!tenant) {
      throw new NotFoundException(
        `Tenant not found with identifier: ${tenantIdentifier}. Please use tenant ID (e.g., 1).`,
      );
    }

    // Attach tenant to request for use in controllers/services
    request.tenant = tenant;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Tenant validated: ${tenant.name} (ID: ${tenant.id})`);
    }

    return true;
  }
}

