import { Controller, Post, Body } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';

@Controller('sync')
export class SyncController {
    constructor(private readonly syncService: SyncService) { }

    @Post('batch')
    async syncBatch(@Body() batch: SyncBatchDto) {
        return this.syncService.processBatch(batch);
    }
}
