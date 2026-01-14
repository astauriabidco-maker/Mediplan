import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { PlanningService } from './planning.service';
export interface ShiftNeed {
    start: Date;
    end: Date;
    postId: string;
    count: number;
    requiredSkills?: string[];
}
export declare class AutoSchedulerService {
    private agentRepository;
    private shiftRepository;
    private leaveRepository;
    private localeRules;
    private planningService;
    constructor(agentRepository: Repository<Agent>, shiftRepository: Repository<Shift>, leaveRepository: Repository<Leave>, localeRules: ILocaleRules, planningService: PlanningService);
    generateSchedule(tenantId: string, startDate: Date, endDate: Date, needs: ShiftNeed[]): Promise<Shift[]>;
    private checkAvailability;
    private calculatePendingHours;
    findReplacements(tenantId: string, start: Date, end: Date, competency?: string): Promise<Agent[]>;
    private checkDailyRest;
}
