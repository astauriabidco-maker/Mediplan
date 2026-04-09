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
exports.PlanningController = void 0;
const common_1 = require("@nestjs/common");
const planning_service_1 = require("./planning.service");
const optimization_service_1 = require("./optimization.service");
const typeorm_1 = require("@nestjs/typeorm");
const agent_entity_1 = require("../agents/entities/agent.entity");
const typeorm_2 = require("typeorm");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const auto_scheduler_service_1 = require("./auto-scheduler.service");
const documents_service_1 = require("../documents/documents.service");
const shift_entity_1 = require("./entities/shift.entity");
const leave_entity_1 = require("./entities/leave.entity");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let PlanningController = class PlanningController {
    planningService;
    optimizationService;
    autoSchedulerService;
    agentRepository;
    leaveRepository;
    shiftRepository;
    documentsService;
    constructor(planningService, optimizationService, autoSchedulerService, agentRepository, leaveRepository, shiftRepository, documentsService) {
        this.planningService = planningService;
        this.optimizationService = optimizationService;
        this.autoSchedulerService = autoSchedulerService;
        this.agentRepository = agentRepository;
        this.leaveRepository = leaveRepository;
        this.shiftRepository = shiftRepository;
        this.documentsService = documentsService;
    }
    async createLeave(req, body) {
        const leave = this.leaveRepository.create({
            agent: { id: body.agentId },
            start: new Date(body.start),
            end: new Date(body.end),
            type: body.type || leave_entity_1.LeaveType.CONGE_ANNUEL,
            reason: body.reason,
            status: leave_entity_1.LeaveStatus.APPROVED,
            tenantId: req.user.tenantId
        });
        return this.leaveRepository.save(leave);
    }
    async getReplacements(req, start, end, competency) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const tenantId = (req.user.role === 'SUPER_ADMIN' && req.query.tenantId)
            ? req.query.tenantId
            : req.user.tenantId;
        const agents = await this.agentRepository.find({
            where: { tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });
        const availableAgents = [];
        for (const agent of agents) {
            if (competency) {
                const target = competency.toLowerCase();
                const skills = agent.agentCompetencies?.map(ac => ac.competency.name.toLowerCase()) || [];
                const hasSkill = skills.some(s => s.includes(target));
                const job = (agent.jobTitle || '').toLowerCase();
                const matchesJob = job.includes(target);
                if (!hasSkill && !matchesJob)
                    continue;
            }
            const hasShift = await this.planningService.getWeeklyHours(tenantId, agent.id, startDate) > 45;
        }
        return this.autoSchedulerService.findReplacements(tenantId, startDate, endDate, competency);
    }
    async getLeaves(req, queryTenantId) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId)
            ? queryTenantId
            : req.user.tenantId;
        return this.leaveRepository.find({
            where: { tenantId },
            relations: ['agent']
        });
    }
    async getShifts(req, start, end, facilityId, serviceId, queryTenantId) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId)
            ? queryTenantId
            : req.user.tenantId;
        return this.planningService.getShifts(tenantId, new Date(start), new Date(end), facilityId ? parseInt(facilityId, 10) : undefined, serviceId ? parseInt(serviceId, 10) : undefined);
    }
    async validate(req, agentId, start, end) {
        const isValid = await this.planningService.validateShift(req.user.tenantId, agentId, new Date(start), new Date(end));
        return { isValid };
    }
    async optimize(req, shifts) {
        const agents = await this.agentRepository.find({
            where: { tenantId: req.user.tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });
        const parsedShifts = shifts.map(s => ({
            ...s,
            start: new Date(s.start),
            end: new Date(s.end),
        }));
        return this.optimizationService.compute(parsedShifts, agents, req.user.tenantId);
    }
    async autoSchedule(req, body) {
        const tenantId = req.user.tenantId;
        return this.autoSchedulerService.generateSchedule(tenantId, new Date(body.start), new Date(body.end), body.needs.map(n => ({
            ...n,
            start: new Date(n.start),
            end: new Date(n.end)
        })));
    }
    async generate(req, body) {
        const tenantId = req.user.tenantId;
        const startDate = new Date(body.start);
        const endDate = new Date(body.end);
        return this.autoSchedulerService.generateSmartSchedule(tenantId, startDate, endDate);
    }
    async publish(req, body) {
        const tenantId = req.user.tenantId;
        const startDate = new Date(body.start);
        const endDate = new Date(body.end);
        await this.shiftRepository.createQueryBuilder()
            .update(shift_entity_1.Shift)
            .set({ status: 'VALIDATED' })
            .where('tenantId = :tenantId', { tenantId })
            .andWhere('status = :status', { status: 'PENDING' })
            .andWhere('start >= :startDate', { startDate })
            .andWhere('end <= :endDate', { endDate })
            .execute();
        return { message: 'Planning publié avec succès' };
    }
    async getShiftApplications(req) {
        return this.planningService.getShiftApplications(req.user.tenantId);
    }
    async approveGhtApplication(req, id) {
        return this.planningService.approveGhtApplication(req.user.tenantId, id, req.user.id);
    }
    async rejectGhtApplication(req, id) {
        return this.planningService.rejectGhtApplication(req.user.tenantId, id, req.user.id);
    }
    async assignReplacement(req, data) {
        return this.planningService.assignReplacement(req.user.tenantId, data.agentId, new Date(data.start), new Date(data.end), data.postId);
    }
    async updateShift(req, id, data) {
        try {
            return await this.planningService.updateShift(req.user.tenantId, id, new Date(data.start), new Date(data.end), req.user.id);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async generateContract(req, id) {
        const shift = await this.shiftRepository.findOne({
            where: { id: parseInt(id, 10), tenantId: req.user.tenantId },
            relations: ['agent', 'hospitalService']
        });
        if (!shift) {
            throw new common_1.BadRequestException('Shift not found');
        }
        if (!shift.agent) {
            throw new common_1.BadRequestException('Cannot generate contract for an unassigned shift');
        }
        return this.documentsService.generateContractForShift(req.user.tenantId, shift, shift.agent);
    }
};
exports.PlanningController = PlanningController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('leaves'),
    (0, permissions_decorator_1.Permissions)('leaves:request'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "createLeave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('replacements'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __param(3, (0, common_1.Query)('competency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getReplacements", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('leaves'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getLeaves", null);
__decorate([
    (0, common_1.Get)('shifts'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __param(3, (0, common_1.Query)('facilityId')),
    __param(4, (0, common_1.Query)('serviceId')),
    __param(5, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getShifts", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('validate'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('agentId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('start')),
    __param(3, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "validate", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('optimize'),
    (0, permissions_decorator_1.Permissions)('planning:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('shifts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "optimize", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('auto-schedule'),
    (0, permissions_decorator_1.Permissions)('planning:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "autoSchedule", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('generate'),
    (0, permissions_decorator_1.Permissions)('planning:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "generate", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('publish'),
    (0, permissions_decorator_1.Permissions)('planning:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "publish", null);
__decorate([
    (0, common_1.Get)('shift-applications'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getShiftApplications", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('shift-applications/:id/approve'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "approveGhtApplication", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('shift-applications/:id/reject'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "rejectGhtApplication", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('assign-replacement'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "assignReplacement", null);
__decorate([
    (0, common_1.Patch)('shifts/:id'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "updateShift", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('shifts/:id/generate-contract'),
    (0, permissions_decorator_1.Permissions)('documents:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "generateContract", null);
exports.PlanningController = PlanningController = __decorate([
    (0, common_1.Controller)('planning'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __param(3, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(4, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(5, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __metadata("design:paramtypes", [planning_service_1.PlanningService,
        optimization_service_1.OptimizationService,
        auto_scheduler_service_1.AutoSchedulerService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        documents_service_1.DocumentsService])
], PlanningController);
//# sourceMappingURL=planning.controller.js.map