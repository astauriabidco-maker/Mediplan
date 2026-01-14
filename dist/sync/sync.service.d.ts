import { SyncBatchDto } from './dto/sync-batch.dto';
export declare class SyncService {
    private readonly logger;
    processBatch(batch: SyncBatchDto): Promise<{
        processed: number;
        message: string;
    }>;
    private processAction;
}
