import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    syncBatch(batch: SyncBatchDto): Promise<{
        processed: number;
        message: string;
    }>;
}
