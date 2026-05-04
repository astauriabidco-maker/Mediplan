"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const leave_entity_1 = require("./entities/leave.entity");
const leave_balance_entity_1 = require("./entities/leave-balance.entity");
const agent_entity_1 = require("../agents/entities/agent.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
let LeavesService = class LeavesService {
    leavesRepository;
    leaveBalanceRepository;
    agentRepository;
    notificationsService;
    auditService;
    constructor(leavesRepository, leaveBalanceRepository, agentRepository, notificationsService, auditService) {
        this.leavesRepository = leavesRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.agentRepository = agentRepository;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async requestLeave(tenantId, agentId, start, end, type, reason, requester) {
        const requesterContext = this.normalizeRequester(agentId, requester);
        if (!this.isValidDate(start) || !this.isValidDate(end)) {
            throw new common_1.BadRequestException('Invalid leave dates');
        }
        if (start > end) {
            throw new common_1.BadRequestException('Start date must be before or equal to end date');
        }
        const agent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['manager']
        });
        if (!agent) {
            throw new common_1.NotFoundException('Agent not found');
        }
        if (requesterContext.id !== agent.id &&
            agent.manager?.id !== requesterContext.id &&
            !requesterContext.canManageAll) {
            throw new common_1.BadRequestException('You do not have authority to request leave for this agent');
        }
        await this.assertNoOverlappingLeave(tenantId, agentId, start, end);
        const leave = this.leavesRepository.create({
            tenantId,
            agent,
            start,
            end,
            type,
            reason,
            status: leave_entity_1.LeaveStatus.PENDING
        });
        const savedLeave = await this.leavesRepository.save(leave);
        await this.auditService.log(tenantId, requesterContext.id, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.LEAVE, savedLeave.id, {
            action: 'REQUEST_LEAVE',
            agentId: agent.id,
            requestedBy: requesterContext.id,
            type: savedLeave.type,
            start: savedLeave.start,
            end: savedLeave.end,
            reason: savedLeave.reason,
            status: savedLeave.status,
        });
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
    async getMyLeaves(tenantId, agentId) {
        return this.leavesRepository.find({
            where: {
                tenantId,
                agent: { id: agentId }
            },
            relations: ['agent'],
            order: { start: 'DESC' }
        });
    }
    async getTeamRequests(tenantId, managerId) {
        return this.leavesRepository.find({
            where: {
                tenantId,
                status: leave_entity_1.LeaveStatus.PENDING,
                agent: {
                    manager: { id: managerId }
                }
            },
            relations: ['agent', 'agent.hospitalService'],
            order: { start: 'ASC' }
        });
    }
    async validateLeave(tenantId, managerId, leaveId, status, rejectionReason, requesterCanManageAll = false) {
        const leave = await this.leavesRepository.findOne({
            where: { id: leaveId, tenantId },
            relations: ['agent', 'agent.manager']
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.agent.manager?.id !== managerId && !requesterCanManageAll) {
            throw new common_1.BadRequestException('You do not have authority to validate this leave');
        }
        if (leave.status !== leave_entity_1.LeaveStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending leave requests can be validated');
        }
        if (status === leave_entity_1.LeaveStatus.REJECTED && !rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required');
        }
        const manager = await this.agentRepository.findOneBy({ id: managerId, tenantId });
        if (!manager) {
            throw new common_1.NotFoundException('Manager not found');
        }
        const previousStatus = leave.status;
        leave.status = status;
        leave.approvedBy = manager;
        if (status === leave_entity_1.LeaveStatus.REJECTED) {
            leave.rejectionReason = rejectionReason || 'No reason provided';
        }
        const savedLeave = await this.leavesRepository.save(leave);
        if (status === leave_entity_1.LeaveStatus.APPROVED) {
            const year = leave.start.getFullYear();
            const daysToDebit = Math.floor((leave.end.getTime() - leave.start.getTime()) / (1000 * 3600 * 24)) + 1;
            let balance = await this.leaveBalanceRepository.findOne({
                where: { agent: { id: leave.agent.id }, type: leave.type, year, tenantId }
            });
            if (!balance) {
                balance = this.leaveBalanceRepository.create({
                    agent: leave.agent,
                    type: leave.type,
                    year,
                    tenantId,
                    allowance: 30,
                    consumed: 0
                });
            }
            balance.consumed += daysToDebit;
            await this.leaveBalanceRepository.save(balance);
        }
        await this.auditService.log(tenantId, managerId, status === leave_entity_1.LeaveStatus.APPROVED ? audit_log_entity_1.AuditAction.VALIDATE : audit_log_entity_1.AuditAction.REJECT, audit_log_entity_1.AuditEntityType.LEAVE, savedLeave.id, {
            previousStatus,
            status: savedLeave.status,
            reason: savedLeave.rejectionReason,
            agentId: savedLeave.agent.id,
            validatedBy: managerId,
        });
        await this.notificationsService.notifyLeaveProcessed(savedLeave.agent.id, {
            leaveId: savedLeave.id,
            status: savedLeave.status,
            rejectionReason: savedLeave.rejectionReason,
        });
        return savedLeave;
    }
    async checkAvailability(tenantId, agentId, date) {
        const count = await this.leavesRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status = :status', { status: leave_entity_1.LeaveStatus.APPROVED })
            .andWhere(':date BETWEEN leave.start AND leave.end', { date })
            .getCount();
        return count === 0;
    }
    async getMyBalances(tenantId, agentId, year) {
        const agent = await this.agentRepository.findOneBy({ id: agentId, tenantId });
        if (!agent)
            throw new common_1.NotFoundException('Agent non trouvé');
        let balances = await this.leaveBalanceRepository.find({
            where: { tenantId, agent: { id: agentId }, year },
            order: { type: 'ASC' }
        });
        if (!balances.find(b => b.type === leave_entity_1.LeaveType.CONGE_ANNUEL)) {
            const defaultBalance = this.leaveBalanceRepository.create({
                agent,
                type: leave_entity_1.LeaveType.CONGE_ANNUEL,
                year,
                tenantId,
                allowance: 30,
                consumed: 0
            });
            await this.leaveBalanceRepository.save(defaultBalance);
            balances.push(defaultBalance);
        }
        return balances;
    }
    normalizeRequester(agentId, requester) {
        if (!requester) {
            return { id: agentId };
        }
        if (typeof requester === 'number') {
            return { id: requester };
        }
        return requester;
    }
    isValidDate(date) {
        return date instanceof Date && !Number.isNaN(date.getTime());
    }
    async assertNoOverlappingLeave(tenantId, agentId, start, end) {
        const count = await this.leavesRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status IN (:...statuses)', { statuses: [leave_entity_1.LeaveStatus.PENDING, leave_entity_1.LeaveStatus.APPROVED] })
            .andWhere('leave.start <= :end', { end })
            .andWhere('leave.end >= :start', { start })
            .getCount();
        if (count > 0) {
            throw new common_1.BadRequestException('Leave request overlaps an existing pending or approved leave');
        }
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(1, (0, typeorm_1.InjectRepository)(leave_balance_entity_1.LeaveBalance)),
    __param(2, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map