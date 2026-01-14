"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
let SyncService = SyncService_1 = class SyncService {
    logger = new common_1.Logger(SyncService_1.name);
    async processBatch(batch) {
        const sortedActions = batch.actions.sort((a, b) => a.timestamp - b.timestamp);
        this.logger.log(`Processing batch of ${sortedActions.length} actions... (Sorted by timestamp)`);
        for (const action of sortedActions) {
            await this.processAction(action);
        }
        return {
            processed: sortedActions.length,
            message: 'Batch synchronized successfully',
        };
    }
    async processAction(action) {
        const date = new Date(action.timestamp).toISOString();
        this.logger.log(`[${date}] Executing Action: ${action.type}`);
        switch (action.type) {
            case 'CLOCK_IN':
                break;
            case 'REQUEST_LEAVE':
                break;
            default:
                this.logger.warn(`Unknown action type: ${action.type}`);
        }
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)()
], SyncService);
//# sourceMappingURL=sync.service.js.map