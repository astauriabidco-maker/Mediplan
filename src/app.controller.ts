import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SeedService } from './seed.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly seedService: SeedService,
  ) { }

  @Get('dev/seed')
  async seed() {
    return this.seedService.seed();
  }

  @Get()
  getConfig() {
    return this.appService.getConfig();
  }
}
