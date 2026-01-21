import { Repository } from 'typeorm';
import { Leave, LeaveStatus, LeaveType } from './entities/leave.entity';
import { Agent } from '../agents/entities/agent.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export declare class LeavesService {
    private leavesRepository;
    private agentRepository;
    private readonly notificationsService;
    private readonly auditService;
    constructor(leavesRepository: Repository<Leave>, agentRepository: Repository<Agent>, notificationsService: NotificationsService, auditService: AuditService);
    requestLeave(tenantId: string, agentId: number, start: Date, end: Date, type: LeaveType, reason: string, requesterId?: number): Promise<Leave>;
    getMyLeaves(tenantId: string, agentId: number): Promise<Leave[]>;
    getTeamRequests(tenantId: string, managerId: number): Promise<Leave[]>;
    validateLeave(tenantId: string, managerId: number, leaveId: number, status: LeaveStatus.APPROVED | LeaveStatus.REJECTED, rejectionReason?: string): Promise<Leave>;
    checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean>;
}
