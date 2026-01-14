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
const agent_entity_1 = require("../agents/entities/agent.entity");
let LeavesService = class LeavesService {
    leavesRepository;
    agentRepository;
    constructor(leavesRepository, agentRepository) {
        this.leavesRepository = leavesRepository;
        this.agentRepository = agentRepository;
    }
    async requestLeave(tenantId, agentId, start, end, type, reason, requesterId) {
        if (end <= start) {
            throw new common_1.BadRequestException('End date must be after start date');
        }
        const agent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['manager']
        });
        if (!agent) {
            throw new common_1.NotFoundException('Agent not found');
        }
        if (requesterId && agent.id !== requesterId && agent.manager?.id !== requesterId) {
            throw new common_1.BadRequestException('You do not have authority to request leave for this agent');
        }
        const leave = this.leavesRepository.create({
            tenantId,
            agent,
            start,
            end,
            type,
            reason,
            status: leave_entity_1.LeaveStatus.PENDING
        });
        return this.leavesRepository.save(leave);
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
    async validateLeave(tenantId, managerId, leaveId, status, rejectionReason) {
        const leave = await this.leavesRepository.findOne({
            where: { id: leaveId, tenantId },
            relations: ['agent', 'agent.manager']
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.agent.manager?.id !== managerId) {
        }
        if (status === leave_entity_1.LeaveStatus.REJECTED && !rejectionReason) {
            throw new common_1.BadRequestException('Rejection reason is required');
        }
        const manager = await this.agentRepository.findOneBy({ id: managerId });
        if (!manager) {
            throw new common_1.NotFoundException('Manager not found');
        }
        leave.status = status;
        leave.approvedBy = manager;
        if (status === leave_entity_1.LeaveStatus.REJECTED) {
            leave.rejectionReason = rejectionReason || 'No reason provided';
        }
        return this.leavesRepository.save(leave);
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
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(1, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map