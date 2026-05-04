import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { SeedService } from './seed.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seedService: SeedService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('health/live')
  getLiveness() {
    return {
      status: 'UP',
      service: 'mediplan-api',
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  @Get('health/ready')
  async getReadiness() {
    const checkedAt = new Date().toISOString();

    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'UP',
        service: 'mediplan-api',
        checkedAt,
        dependencies: {
          database: 'UP',
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'DOWN',
        service: 'mediplan-api',
        checkedAt,
        dependencies: {
          database: 'DOWN',
        },
        error: error instanceof Error ? error.message : 'Database unavailable',
      });
    }
  }

  @Get('dev/seed')
  async seed() {
    return this.seedService.seed();
  }

  @Get()
  getConfig() {
    return this.appService.getConfig();
  }
}
