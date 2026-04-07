import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { PlanningService } from './planning.service';
import { AuditService } from '../audit/audit.service';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { ShiftProposal } from './entities/shift-proposal.entity';
import { SettingsService } from '../settings/settings.service';
export interface ShiftNeed {
    start: Date;
    end: Date;
    postId: string;
    count: number;
    requiredSkills?: string[];
    facilityId?: number;
    serviceId?: number;
    serviceName?: string;
}
export declare class AutoSchedulerService {
    private agentRepository;
    private shiftRepository;
    private leaveRepository;
    private serviceRepository;
    private proposalRepository;
    private localeRules;
    private planningService;
    private auditService;
    private settingsService;
    constructor(agentRepository: Repository<Agent>, shiftRepository: Repository<Shift>, leaveRepository: Repository<Leave>, serviceRepository: Repository<HospitalService>, proposalRepository: Repository<ShiftProposal>, localeRules: ILocaleRules, planningService: PlanningService, auditService: AuditService, settingsService: SettingsService);
    generateSmartSchedule(tenantId: string, startDate: Date, endDate: Date): Promise<Shift[]>;
    generateSchedule(tenantId: string, startDate: Date, endDate: Date, needs: ShiftNeed[]): Promise<Shift[]>;
    private calculateAgentScore;
    scanForProblems(tenantId: string): Promise<any[]>;
    private generateResolutionProposal;
    private checkAvailability;
    private calculatePendingHours;
    findReplacements(tenantId: string, start: Date, end: Date, competency?: string): Promise<Agent[]>;
    private checkDailyRest;
}
