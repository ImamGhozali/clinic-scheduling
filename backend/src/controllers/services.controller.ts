import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ServicesService } from '../services/services.service';
import { TenantGuard } from '../guards/tenant.guard';
import { GetTenant } from '../decorators/tenant.decorator';
import { Tenant } from '../entities';

@ApiTags('Services')
@Controller('services')
@UseGuards(TenantGuard)
@ApiSecurity('X-Tenant-Id')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all services for the tenant',
    description: 'Returns list of all medical services offered by the clinic',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services',
  })
  async getServices(@GetTenant() tenant: Tenant) {
    return await this.servicesService.getServices(tenant.id);
  }

  @Get(':id')
  @ApiExcludeEndpoint() // Hidden from Swagger - not currently used in frontend
  @ApiOperation({
    summary: 'Get a specific service by ID',
    description: 'Returns details of a single service',
  })
  @ApiParam({
    name: 'id',
    description: 'Service UUID',
    example: '850e8400-e29b-41d4-a716-446655440010',
  })
  @ApiResponse({
    status: 200,
    description: 'Service details',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async getService(@GetTenant() tenant: Tenant, @Param('id') id: string) {
    const service = await this.servicesService.getService(tenant.id, parseInt(id, 10));
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }
}

