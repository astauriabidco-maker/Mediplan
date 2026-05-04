import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async syncBatch(@Body() batch: SyncBatchDto) {
    return this.syncService.processBatch(batch);
  }
}
