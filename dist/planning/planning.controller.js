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
const swagger_1 = require("@nestjs/swagger");
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
const tenant_context_1 = require("../auth/tenant-context");
const compliance_api_dto_1 = require("./dto/compliance-api.dto");
const shift_mutation_dto_1 = require("./dto/shift-mutation.dto");
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
            tenantId: req.user.tenantId,
        });
        return this.leaveRepository.save(leave);
    }
    async getReplacements(req, start, end, competency, queryTenantId) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const tenantId = (0, tenant_context_1.resolveTenantId)(req, queryTenantId);
        return this.autoSchedulerService.findReplacements(tenantId, startDate, endDate, competency);
    }
    async getLeaves(req, queryTenantId) {
        const tenantId = (0, tenant_context_1.resolveTenantId)(req, queryTenantId);
        return this.leaveRepository.find({
            where: { tenantId },
            relations: ['agent'],
        });
    }
    async getShifts(req, start, end, facilityId, serviceId, queryTenantId) {
        return this.planningService.getShifts((0, tenant_context_1.resolveTenantId)(req, queryTenantId), new Date(start), new Date(end), facilityId ? parseInt(facilityId, 10) : undefined, serviceId ? parseInt(serviceId, 10) : undefined);
    }
    async validate(req, agentId, start, end) {
        const validation = await this.planningService.validateShift(req.user.tenantId, agentId, new Date(start), new Date(end));
        return validation;
    }
    async optimize(req, shifts) {
        const agents = await this.agentRepository.find({
            where: { tenantId: req.user.tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency'],
        });
        const parsedShifts = shifts.map((s) => ({
            ...s,
            start: new Date(s.start),
            end: new Date(s.end),
        }));
        return this.optimizationService.compute(parsedShifts, agents, req.user.tenantId);
    }
    async autoSchedule(req, body) {
        const tenantId = req.user.tenantId;
        return this.autoSchedulerService.generateSchedule(tenantId, new Date(body.start), new Date(body.end), body.needs.map((n) => ({
            ...n,
            start: new Date(n.start),
            end: new Date(n.end),
        })));
    }
    async generate(req, body) {
        const tenantId = req.user.tenantId;
        const startDate = new Date(body.start);
        const endDate = new Date(body.end);
        return this.autoSchedulerService.generateSmartSchedule(tenantId, startDate, endDate);
    }
    async getManagerCockpit(req, query) {
        return this.planningService.getManagerCockpit((0, tenant_context_1.resolveTenantId)(req, query.tenantId), this.toCompliancePeriodFilters(query));
    }
    async getProductionObservabilityHealth(req, query) {
        return this.planningService.getProductionObservabilityHealth((0, tenant_context_1.resolveTenantId)(req, query.tenantId), this.toCompliancePeriodFilters(query));
    }
    async getServiceComplianceIndicators(req, query) {
        return this.planningService.getServiceComplianceIndicators((0, tenant_context_1.resolveTenantId)(req, query.tenantId), this.toCompliancePeriodFilters(query));
    }
    async getManagerWorklist(req, query) {
        return this.planningService.getManagerWorklist((0, tenant_context_1.resolveTenantId)(req, query.tenantId), this.toCompliancePeriodFilters(query));
    }
    async getDecisionRecommendations(req, query) {
        return this.planningService.getDecisionRecommendations((0, tenant_context_1.resolveTenantId)(req, query.tenantId), this.toCompliancePeriodFilters(query));
    }
    async getComplianceSummary(req, query) {
        return this.planningService.getComplianceSummary((0, tenant_context_1.resolveTenantId)(req, query.tenantId), this.toCompliancePeriodFilters(query));
    }
    async getComplianceReports(req, query) {
        return this.planningService.getComplianceReports((0, tenant_context_1.resolveTenantId)(req, query.tenantId), {
            ...this.toCompliancePeriodFilters(query),
            limit: this.toOptionalLimit(query.limit),
        });
    }
    async getPlanningComplianceTimeline(req, query) {
        return this.planningService.getPlanningComplianceTimeline((0, tenant_context_1.resolveTenantId)(req, query.tenantId), {
            ...this.toCompliancePeriodFilters(query),
            limit: this.toOptionalLimit(query.limit),
            agentId: query.agentId,
            shiftId: query.shiftId,
        });
    }
    async explainShiftCompliance(req, id) {
        return this.planningService.explainShiftCompliance(req.user.tenantId, id);
    }
    async getShiftCorrectionGuidance(req, id) {
        return this.planningService.getShiftCorrectionGuidance(req.user.tenantId, id);
    }
    async getShiftDecisionSuggestions(req, id) {
        const shift = await this.planningService.getShiftSuggestionContext(req.user.tenantId, id);
        const replacements = await this.autoSchedulerService.findReplacements(req.user.tenantId, shift.start, shift.end, shift.postId);
        return this.planningService.getShiftDecisionSuggestions(req.user.tenantId, id, replacements);
    }
    async revalidateShift(req, id) {
        return this.planningService.revalidateShift(req.user.tenantId, req.user.id, id);
    }
    async reassignShift(req, id, data) {
        return this.planningService.reassignShift(req.user.tenantId, req.user.id, id, data.agentId);
    }
    async requestReplacement(req, id, data) {
        return this.planningService.requestReplacement(req.user.tenantId, req.user.id, id, data.reason);
    }
    async resolvePlanningAlert(req, id, data) {
        return this.planningService.resolvePlanningAlert(req.user.tenantId, req.user.id, id, data.reason);
    }
    async getAlertCorrectionGuidance(req, id) {
        return this.planningService.getAlertCorrectionGuidance(req.user.tenantId, id);
    }
    async approveShiftException(req, id, data) {
        return this.planningService.approveShiftException(req.user.tenantId, req.user.id, id, data.reason);
    }
    async previewPublish(req, body) {
        return this.planningService.previewPublishPlanning(req.user.tenantId, new Date(body.start), new Date(body.end));
    }
    async publish(req, body) {
        return this.planningService.publishPlanning(req.user.tenantId, req.user.id, new Date(body.start), new Date(body.end));
    }
    async getShiftApplications(req) {
        return this.planningService.getShiftApplications(req.user.tenantId);
    }
    async approveGhtApplication(req, id) {
        return this.planningService.approveGhtApplication(req.user.tenantId, id, req.user.id);
    }
    async getAvailableSwaps(req) {
        return this.planningService.getAvailableSwaps(req.user.tenantId, req.user.id);
    }
    async requestSwap(req, id) {
        return this.planningService.requestSwap(req.user.tenantId, id, req.user.id);
    }
    async applyForSwap(req, id) {
        return this.planningService.applyForSwap(req.user.tenantId, id, req.user.id);
    }
    async rejectGhtApplication(req, id) {
        return this.planningService.rejectGhtApplication(req.user.tenantId, id, req.user.id);
    }
    async createShift(req, data) {
        return this.planningService.createShift(req.user.tenantId, req.user.id, {
            agentId: data.agentId,
            start: new Date(data.start),
            end: new Date(data.end),
            postId: data.postId,
            type: data.type,
            facilityId: data.facilityId,
        });
    }
    async assignReplacement(req, data) {
        return this.planningService.assignReplacement(req.user.tenantId, req.user.id, data.agentId, new Date(data.start), new Date(data.end), data.postId);
    }
    async updateShift(req, id, data) {
        return this.planningService.updateShift(req.user.tenantId, id, new Date(data.start), new Date(data.end), req.user.id);
    }
    async generateContract(req, id) {
        const shift = await this.shiftRepository.findOne({
            where: { id: parseInt(id, 10), tenantId: req.user.tenantId },
            relations: ['agent', 'hospitalService'],
        });
        if (!shift) {
            throw new common_1.BadRequestException('Shift not found');
        }
        if (!shift.agent) {
            throw new common_1.BadRequestException('Cannot generate contract for an unassigned shift');
        }
        return this.documentsService.generateContractForShift(req.user.tenantId, shift, shift.agent);
    }
    toCompliancePeriodFilters(query) {
        return {
            from: this.toOptionalDate(query.from, 'from'),
            to: this.toOptionalDate(query.to, 'to'),
        };
    }
    toOptionalDate(value, field) {
        if (!value)
            return undefined;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new common_1.BadRequestException(`Invalid ${field} date`);
        }
        return date;
    }
    toOptionalLimit(value) {
        if (value === undefined)
            return undefined;
        if (!Number.isInteger(value) || value < 1 || value > 1000) {
            throw new common_1.BadRequestException('Invalid report limit');
        }
        return value;
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
    __param(4, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
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
    (0, common_1.Get)('manager/cockpit'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ManagerCockpitResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.CompliancePeriodQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getManagerCockpit", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('observability/health'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ProductionObservabilityHealthResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.CompliancePeriodQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getProductionObservabilityHealth", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('compliance/service-indicators'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ServiceComplianceIndicatorsResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.CompliancePeriodQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getServiceComplianceIndicators", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('compliance/worklist'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ManagerWorklistResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.CompliancePeriodQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getManagerWorklist", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('compliance/recommendations'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.DecisionRecommendationsResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.CompliancePeriodQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getDecisionRecommendations", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('compliance/summary'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ComplianceSummaryResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.CompliancePeriodQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getComplianceSummary", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('compliance/reports'),
    (0, permissions_decorator_1.Permissions)('audit:read'),
    (0, swagger_1.ApiOkResponse)({ type: [compliance_api_dto_1.ComplianceReportResponseDto] }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.ComplianceReportsQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getComplianceReports", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('compliance/timeline'),
    (0, permissions_decorator_1.Permissions)('audit:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.PlanningComplianceTimelineResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compliance_api_dto_1.PlanningComplianceTimelineQueryDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getPlanningComplianceTimeline", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('shifts/:id/compliance'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ShiftComplianceResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "explainShiftCompliance", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('shifts/:id/correction-guidance'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.CorrectionGuidanceResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getShiftCorrectionGuidance", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('shifts/:id/suggestions'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ShiftDecisionSuggestionsResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getShiftDecisionSuggestions", null);
__decorate([
    (0, common_1.Post)('shifts/:id/revalidate'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.RevalidateShiftResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "revalidateShift", null);
__decorate([
    (0, common_1.Post)('shifts/:id/reassign'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ReassignShiftResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, shift_mutation_dto_1.ReassignShiftDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "reassignShift", null);
__decorate([
    (0, common_1.Post)('shifts/:id/request-replacement'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.RequestReplacementResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, shift_mutation_dto_1.RequestReplacementDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "requestReplacement", null);
__decorate([
    (0, common_1.Patch)('alerts/:id/resolve'),
    (0, permissions_decorator_1.Permissions)('planning:write', 'alerts:manage'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ResolvePlanningAlertResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, shift_mutation_dto_1.ResolvePlanningAlertDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "resolvePlanningAlert", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('alerts/:id/correction-guidance'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.CorrectionGuidanceResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getAlertCorrectionGuidance", null);
__decorate([
    (0, common_1.Post)('shifts/:id/exception'),
    (0, permissions_decorator_1.Permissions)('planning:exception'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.ApproveShiftExceptionResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, shift_mutation_dto_1.ApproveShiftExceptionDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "approveShiftException", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('publish/preview'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    (0, swagger_1.ApiOkResponse)({ type: compliance_api_dto_1.PublishPlanningPreviewResponseDto }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shift_mutation_dto_1.PublishPlanningDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "previewPublish", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('publish'),
    (0, permissions_decorator_1.Permissions)('planning:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shift_mutation_dto_1.PublishPlanningDto]),
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
    (0, common_1.Get)('swaps/available'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getAvailableSwaps", null);
__decorate([
    (0, common_1.Post)('shifts/:id/request-swap'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "requestSwap", null);
__decorate([
    (0, common_1.Post)('shifts/:id/apply-swap'),
    (0, permissions_decorator_1.Permissions)('planning:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "applyForSwap", null);
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
    (0, common_1.Post)('shifts'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shift_mutation_dto_1.CreateShiftDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "createShift", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('assign-replacement'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shift_mutation_dto_1.CreateShiftDto]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "assignReplacement", null);
__decorate([
    (0, common_1.Patch)('shifts/:id'),
    (0, permissions_decorator_1.Permissions)('planning:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shift_mutation_dto_1.UpdateShiftDto]),
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