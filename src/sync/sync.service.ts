import { Injectable, Logger } from '@nestjs/common';
import { SyncBatchDto } from './dto/sync-batch.dto';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    async processBatch(batch: SyncBatchDto): Promise<{ processed: number; message: string }> {
        // 1. Sort actions chronologically (oldest first) to ensure history integrity
        const sortedActions = batch.actions.sort((a, b) => a.timestamp - b.timestamp);

        this.logger.log(`Processing batch of ${sortedActions.length} actions... (Sorted by timestamp)`);

        // 2. Process each action
        for (const action of sortedActions) {
            await this.processAction(action);
        }

        return {
            processed: sortedActions.length,
            message: 'Batch synchronized successfully',
        };
    }

    private async processAction(action: { type: string; timestamp: number; payload: any }) {
        const date = new Date(action.timestamp).toISOString();
        this.logger.log(`[${date}] Executing Action: ${action.type}`);

        // Simulate processing logic
        switch (action.type) {
            case 'CLOCK_IN':
                // Logic to clock in agent
                break;
            case 'REQUEST_LEAVE':
                // Logic to create leave request
                break;
            default:
                this.logger.warn(`Unknown action type: ${action.type}`);
        }
    }
}
