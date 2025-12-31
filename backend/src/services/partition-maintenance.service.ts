import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PartitionMaintenanceService {
  private readonly logger = new Logger(PartitionMaintenanceService.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  /**
   * Scheduled job: Runs on 1st of each month at 2 AM
   * Creates partitions for the next 6 months
   */
  @Cron('0 2 1 * *', {
    name: 'create-partitions-monthly',
  })
  async createFuturePartitionsScheduled() {
    this.logger.log('🕐 Scheduled partition creation started');
    await this.createFuturePartitions();
  }

  /**
   * Manual method: Can be called via API endpoint for testing
   * Creates partitions for the next N months
   */
  async createFuturePartitions(months: number = 6) {
    try {
      this.logger.log(`Creating future partitions (${months} months ahead)...`);
      
      const result = await this.dataSource.query(
        'SELECT create_future_partitions($1)',
        [months]
      );
      
      this.logger.log(`✓ Partition creation completed: ${JSON.stringify(result)}`);
      
      return {
        success: true,
        message: `Created partitions for next ${months} months`,
        details: result,
      };
    } catch (error) {
      this.logger.error('❌ Failed to create partitions', error);
      throw error;
    }
  }

  /**
   * List all existing partitions
   */
  async listPartitions() {
    try {
      this.logger.log('Listing all partitions...');
      
      const result = await this.dataSource.query(
        'SELECT * FROM list_appointment_partitions()'
      );
      
      this.logger.log(`✓ Found ${result.length} partitions`);
      
      return {
        success: true,
        count: result.length,
        partitions: result,
      };
    } catch (error) {
      this.logger.error('❌ Failed to list partitions', error);
      throw error;
    }
  }

  /**
   * Optional: Clean up old partitions
   * Scheduled to run yearly on January 1st at 3 AM
   */
  @Cron('0 3 1 1 *', {
    name: 'cleanup-partitions-yearly', // <-- Add explicit name
  })
  async cleanupOldPartitionsScheduled() {
    this.logger.log('🕐 Scheduled partition cleanup started');
    await this.cleanupOldPartitions(24); // Keep last 2 years
  }

  /**
   * Manual method: Drop partitions older than N months
   * USE WITH CAUTION - This deletes data!
   */
  async cleanupOldPartitions(monthsToKeep: number = 24) {
    try {
      this.logger.warn(`⚠️  Cleaning up partitions older than ${monthsToKeep} months...`);
      
      const result = await this.dataSource.query(
        'SELECT * FROM drop_old_partitions($1)',
        [monthsToKeep]
      );
      
      if (result.length > 0) {
        this.logger.log(`✓ Dropped ${result.length} old partitions: ${JSON.stringify(result)}`);
      } else {
        this.logger.log('✓ No old partitions to drop');
      }
      
      return {
        success: true,
        message: `Dropped ${result.length} partitions`,
        dropped: result,
      };
    } catch (error) {
      this.logger.error('❌ Failed to cleanup partitions', error);
      throw error;
    }
  }
}

