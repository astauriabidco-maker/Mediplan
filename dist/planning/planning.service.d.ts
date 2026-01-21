import { Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { Agent } from '../agents/entities/agent.entity';
import { WorkPolicy } from './entities/work-policy.entity';
import { AuditService } from '../audit/audit.service';
export declare class PlanningService {
    private shiftRepository;
    private leaveRepository;
    private agentRepository;
    private workPolicyRepository;
    private localeRules;
    private auditService;
    constructor(shiftRepository: Repository<Shift>, leaveRepository: Repository<Leave>, agentRepository: Repository<Agent>, workPolicyRepository: Repository<WorkPolicy>, localeRules: ILocaleRules, auditService: AuditService);
    validateShift(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean>;
    private getConstraintsForAgent;
    checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean>;
    private checkLeaveAvailability;
    getWeeklyHours(tenantId: string, agentId: number, date: Date): Promise<number>;
    getShifts(tenantId: string, start: Date, end: Date): Promise<Shift[]>;
    assignReplacement(tenantId: string, agentId: number, start: Date, end: Date, postId: string): Promise<Shift>;
}
