import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TenantsService } from '../services/tenants.service';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all tenants',
    description: 'Retrieves a list of all available tenants/clinics',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenants',
  })
  async getTenants() {
    return await this.tenantsService.getTenants();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific tenant',
    description: 'Retrieves details of a specific tenant by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Tenant ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant details',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenant(@Param('id') id: string) {
    return await this.tenantsService.getTenant(parseInt(id, 10));
  }
}

