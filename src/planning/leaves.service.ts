import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leave, LeaveStatus, LeaveType } from './entities/leave.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { Agent } from '../agents/entities/agent.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

export interface LeaveRequesterContext {
    id: number;
    canManageAll?: boolean;
}

@Injectable()
export class LeavesService {
    constructor(
        @InjectRepository(Leave)
        private leavesRepository: Repository<Leave>,
        @InjectRepository(LeaveBalance)
        private leaveBalanceRepository: Repository<LeaveBalance>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        private readonly notificationsService: NotificationsService,
        private readonly auditService: AuditService,
    ) { }

    async requestLeave(
        tenantId: string,
        agentId: number,
        start: Date,
        end: Date,
        type: LeaveType,
        reason: string,
        requester?: number | LeaveRequesterContext
    ): Promise<Leave> {
        const requesterContext = this.normalizeRequester(agentId, requester);

        // Basic validation
        if (!this.isValidDate(start) || !this.isValidDate(end)) {
            throw new BadRequestException('Invalid leave dates');
        }

        if (start > end) {
            throw new BadRequestException('Start date must be before or equal to end date');
        }

        const agent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['manager']
        });

        if (!agent) {
            throw new NotFoundException('Agent not found');
        }

        // Authority check: if requester is not the agent, must be their manager or an HR/admin actor.
        if (
            requesterContext.id !== agent.id &&
            agent.manager?.id !== requesterContext.id &&
            !requesterContext.canManageAll
        ) {
            throw new BadRequestException('You do not have authority to request leave for this agent');
        }

        await this.assertNoOverlappingLeave(tenantId, agentId, start, end);

        const leave = this.leavesRepository.create({
            tenantId,
            agent,
            start,
            end,
            type,
            reason,
            status: LeaveStatus.PENDING
        });

        const savedLeave = await this.leavesRepository.save(leave);

        await this.auditService.log(
            tenantId,
            requesterContext.id,
            AuditAction.CREATE,
            AuditEntityType.LEAVE,
            savedLeave.id,
            {
                action: 'REQUEST_LEAVE',
                agentId: agent.id,
                requestedBy: requesterContext.id,
                type: savedLeave.type,
                start: savedLeave.start,
                end: savedLeave.end,
                reason: savedLeave.reason,
                status: savedLeave.status,
            }
        );

        // Notify manager
        if (agent.managerId) {
            await this.notificationsService.notifyLeaveRequested(agent.managerId, {
                leaveId: savedLeave.id,
                agentName: agent.nom,
                type: savedLeave.type,
                start: savedLeave.start,
                end: savedLeave.end,
            });
        }

        return savedLeave;
    }

    async getMyLeaves(tenantId: string, agentId: number): Promise<Leave[]> {
        return this.leavesRepository.find({
            where: {
                tenantId,
                agent: { id: agentId }
            },
            relations: ['agent'],
            order: { start: 'DESC' }
        });
    }

    async getTeamRequests(tenantId: string, managerId: number): Promise<Leave[]> {
        // Find agents managed by this manager (N+1)
        // In a real scenario, we might want recursive N+2 checks using a CTE or closure table
        // For now, we stick to direct reports as per plan
        return this.leavesRepository.find({
            where: {
                tenantId,
                status: LeaveStatus.PENDING,
                agent: {
                    manager: { id: managerId }
                }
            },
            relations: ['agent', 'agent.hospitalService'],
            order: { start: 'ASC' }
        });
    }

    async validateLeave(
        tenantId: string,
        managerId: number,
        leaveId: number,
        status: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
        rejectionReason?: string,
        requesterCanManageAll = false,
    ): Promise<Leave> {
        const leave = await this.leavesRepository.findOne({
            where: { id: leaveId, tenantId },
            relations: ['agent', 'agent.manager']
        });

        if (!leave) {
            throw new NotFoundException('Leave request not found');
        }

        // Check authority (must be the manager of the agent, unless HR/admin override).
        if (leave.agent.manager?.id !== managerId && !requesterCanManageAll) {
            throw new BadRequestException('You do not have authority to validate this leave');
        }

        if (leave.status !== LeaveStatus.PENDING) {
            throw new BadRequestException('Only pending leave requests can be validated');
        }

        if (status === LeaveStatus.REJECTED && !rejectionReason) {
            throw new BadRequestException('Rejection reason is required');
        }

        const manager = await this.agentRepository.findOneBy({ id: managerId, tenantId });
        if (!manager) {
            throw new NotFoundException('Manager not found');
        }

        const previousStatus = leave.status;
        leave.status = status;
        leave.approvedBy = manager;
        if (status === LeaveStatus.REJECTED) {
            leave.rejectionReason = rejectionReason || 'No reason provided';
        }

        const savedLeave = await this.leavesRepository.save(leave);

        // Debit LeaveBalance if approved
        if (status === LeaveStatus.APPROVED) {
            const year = leave.start.getFullYear();
            const daysToDebit = Math.floor((leave.end.getTime() - leave.start.getTime()) / (1000 * 3600 * 24)) + 1;

            let balance = await this.leaveBalanceRepository.findOne({
                where: { agent: { id: leave.agent.id }, type: leave.type, year, tenantId }
            });

            // If balance doesn't exist, we create a default one for the sake of continuity, or we could reject.
            if (!balance) {
                balance = this.leaveBalanceRepository.create({
                    agent: leave.agent,
                    type: leave.type,
                    year,
                    tenantId,
                    allowance: 30, // Default allowance if none setup
                    consumed: 0
                });
            }

            balance.consumed += daysToDebit;
            await this.leaveBalanceRepository.save(balance);
        }

        await this.auditService.log(
            tenantId,
            managerId,
            status === LeaveStatus.APPROVED ? AuditAction.VALIDATE : AuditAction.REJECT,
            AuditEntityType.LEAVE,
            savedLeave.id,
            {
                previousStatus,
                status: savedLeave.status,
                reason: savedLeave.rejectionReason,
                agentId: savedLeave.agent.id,
                validatedBy: managerId,
            }
        );

        // Notify agent
        await this.notificationsService.notifyLeaveProcessed(savedLeave.agent.id, {
            leaveId: savedLeave.id,
            status: savedLeave.status,
            rejectionReason: savedLeave.rejectionReason,
        });

        return savedLeave;
    }

    async checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean> {
        const count = await this.leavesRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status = :status', { status: LeaveStatus.APPROVED })
            .andWhere(':date BETWEEN leave.start AND leave.end', { date })
            .getCount();

        return count === 0;
    }

    async getMyBalances(tenantId: string, agentId: number, year: number): Promise<LeaveBalance[]> {
        const agent = await this.agentRepository.findOneBy({ id: agentId, tenantId });
        if (!agent) throw new NotFoundException('Agent non trouvé');

        let balances = await this.leaveBalanceRepository.find({
            where: { tenantId, agent: { id: agentId }, year },
            order: { type: 'ASC' }
        });

        // Initialize default "CONGE_ANNUEL" if it doesn't exist
        if (!balances.find(b => b.type === LeaveType.CONGE_ANNUEL)) {
            const defaultBalance = this.leaveBalanceRepository.create({
                agent,
                type: LeaveType.CONGE_ANNUEL,
                year,
                tenantId,
                allowance: 30, // Default allocation
                consumed: 0
            });
            await this.leaveBalanceRepository.save(defaultBalance);
            balances.push(defaultBalance);
        }

        return balances;
    }

    private normalizeRequester(agentId: number, requester?: number | LeaveRequesterContext): LeaveRequesterContext {
        if (!requester) {
            return { id: agentId };
        }

        if (typeof requester === 'number') {
            return { id: requester };
        }

        return requester;
    }

    private isValidDate(date: Date): boolean {
        return date instanceof Date && !Number.isNaN(date.getTime());
    }

    private async assertNoOverlappingLeave(tenantId: string, agentId: number, start: Date, end: Date) {
        const count = await this.leavesRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status IN (:...statuses)', { statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED] })
            .andWhere('leave.start <= :end', { end })
            .andWhere('leave.end >= :start', { start })
            .getCount();

        if (count > 0) {
            throw new BadRequestException('Leave request overlaps an existing pending or approved leave');
        }
    }
}
