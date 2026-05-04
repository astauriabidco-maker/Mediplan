import { Repository } from 'typeorm';
import { Leave, LeaveStatus, LeaveType } from './entities/leave.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Agent } from '../agents/entities/agent.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export interface LeaveRequesterContext {
    id: number;
    canManageAll?: boolean;
}
export declare class LeavesService {
    private leavesRepository;
    private leaveBalanceRepository;
    private agentRepository;
    private readonly notificationsService;
    private readonly auditService;
    constructor(leavesRepository: Repository<Leave>, leaveBalanceRepository: Repository<LeaveBalance>, agentRepository: Repository<Agent>, notificationsService: NotificationsService, auditService: AuditService);
    requestLeave(tenantId: string, agentId: number, start: Date, end: Date, type: LeaveType, reason: string, requester?: number | LeaveRequesterContext): Promise<Leave>;
    getMyLeaves(tenantId: string, agentId: number): Promise<Leave[]>;
    getTeamRequests(tenantId: string, managerId: number): Promise<Leave[]>;
    validateLeave(tenantId: string, managerId: number, leaveId: number, status: LeaveStatus.APPROVED | LeaveStatus.REJECTED, rejectionReason?: string, requesterCanManageAll?: boolean): Promise<Leave>;
    checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean>;
    getMyBalances(tenantId: string, agentId: number, year: number): Promise<LeaveBalance[]>;
    private normalizeRequester;
    private isValidDate;
    private assertNoOverlappingLeave;
}
