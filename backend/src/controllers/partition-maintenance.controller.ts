import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PartitionMaintenanceService } from '../services/partition-maintenance.service';
import { TenantGuard } from '../guards/tenant.guard';

/**
 * Controller for partition maintenance operations
 * Endpoints for testing and manual partition management
 * Hidden from Swagger - admin/maintenance endpoints only
 */
@Controller('partitions')
@ApiExcludeController() // Hidden from Swagger - internal maintenance endpoints
export class PartitionMaintenanceController {
  constructor(
    private readonly partitionService: PartitionMaintenanceService,
  ) {}

  /**
   * GET /partitions
   * List all existing appointment partitions
   * 
   * Example: GET http://localhost:3000/partitions
   */
  @Get()
  async listPartitions() {
    return this.partitionService.listPartitions();
  }

  /**
   * POST /partitions/create
   * Manually trigger partition creation
   * 
   * Query params:
   *   - months: Number of months ahead to create (default: 6)
   * 
   * Example: POST http://localhost:3000/partitions/create?months=12
   */
  @Post('create')
  async createPartitions(@Query('months') months?: string) {
    const monthsAhead = months ? parseInt(months, 10) : 6;
    return this.partitionService.createFuturePartitions(monthsAhead);
  }

  /**
   * POST /partitions/cleanup
   * Manually trigger cleanup of old partitions
   * ⚠️  USE WITH CAUTION - This deletes data!
   * 
   * Query params:
   *   - keep: Number of months to keep (default: 24)
   * 
   * Example: POST http://localhost:3000/partitions/cleanup?keep=24
   */
  @Post('cleanup')
  async cleanupPartitions(@Query('keep') keep?: string) {
    const monthsToKeep = keep ? parseInt(keep, 10) : 24;
    return this.partitionService.cleanupOldPartitions(monthsToKeep);
  }
}

