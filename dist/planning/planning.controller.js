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
const leave_entity_1 = require("./entities/leave.entity");
let PlanningController = class PlanningController {
    planningService;
    optimizationService;
    autoSchedulerService;
    agentRepository;
    leaveRepository;
    constructor(planningService, optimizationService, autoSchedulerService, agentRepository, leaveRepository) {
        this.planningService = planningService;
        this.optimizationService = optimizationService;
        this.autoSchedulerService = autoSchedulerService;
        this.agentRepository = agentRepository;
        this.leaveRepository = leaveRepository;
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
        const tenantId = req.user.tenantId;
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
    async getLeaves(req) {
        return this.leaveRepository.find({
            where: { tenantId: req.user.tenantId },
            relations: ['agent']
        });
    }
    async getShifts(req, start, end) {
        const tenantId = req.user.tenantId;
        return this.planningService.getShifts(tenantId, new Date(start), new Date(end));
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
        const needs = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            const dayStart = new Date(current);
            dayStart.setHours(7, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(19, 0, 0, 0);
            needs.push({
                start: dayStart,
                end: dayEnd,
                postId: 'infirmier',
                count: 2
            });
            needs.push({
                start: dayStart,
                end: dayEnd,
                postId: 'medecin',
                count: 1
            });
            const nightStart = new Date(current);
            nightStart.setHours(19, 0, 0, 0);
            const nightEnd = new Date(current);
            nightEnd.setDate(nightEnd.getDate() + 1);
            nightEnd.setHours(7, 0, 0, 0);
            needs.push({
                start: nightStart,
                end: nightEnd,
                postId: 'infirmier',
                count: 1
            });
            needs.push({
                start: nightStart,
                end: nightEnd,
                postId: 'medecin',
                count: 1
            });
            current.setDate(current.getDate() + 1);
        }
        return this.autoSchedulerService.generateSchedule(tenantId, startDate, endDate, needs);
    }
    async assignReplacement(body, req) {
        return this.planningService.assignReplacement(req.user.tenantId, body.agentId, new Date(body.start), new Date(body.end), body.postId);
    }
};
exports.PlanningController = PlanningController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('leaves'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "createLeave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('replacements'),
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
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getLeaves", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('shifts'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getShifts", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('validate'),
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
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('shifts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "optimize", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('auto-schedule'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "autoSchedule", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "generate", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('assign-replacement'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "assignReplacement", null);
exports.PlanningController = PlanningController = __decorate([
    (0, common_1.Controller)('planning'),
    __param(3, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(4, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __metadata("design:paramtypes", [planning_service_1.PlanningService,
        optimization_service_1.OptimizationService,
        auto_scheduler_service_1.AutoSchedulerService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PlanningController);
//# sourceMappingURL=planning.controller.js.map