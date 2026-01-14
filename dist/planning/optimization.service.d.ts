import { PlanningService } from './planning.service';
import { Agent } from '../agents/entities/agent.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
export interface OptimizationResult {
    assigned: {
        shiftId: string;
        agentId: number;
    }[];
    unassigned: {
        shiftId: string;
        reason: string;
    }[];
}
export declare class OptimizationService {
    private readonly planningService;
    private readonly localeRules;
    private readonly logger;
    constructor(planningService: PlanningService, localeRules: ILocaleRules);
    compute(shiftsToFill: {
        id: string;
        start: Date;
        end: Date;
        requiredSkill: string;
    }[], agentsPool: Agent[], tenantId: string): Promise<OptimizationResult>;
}
