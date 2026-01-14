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
var OptimizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationService = void 0;
const common_1 = require("@nestjs/common");
const planning_service_1 = require("./planning.service");
const locale_module_1 = require("../core/config/locale.module");
let OptimizationService = OptimizationService_1 = class OptimizationService {
    planningService;
    localeRules;
    logger = new common_1.Logger(OptimizationService_1.name);
    constructor(planningService, localeRules) {
        this.planningService = planningService;
        this.localeRules = localeRules;
    }
    async compute(shiftsToFill, agentsPool, tenantId) {
        const result = { assigned: [], unassigned: [] };
        const virtualHours = new Map();
        for (const shift of shiftsToFill) {
            let assigned = false;
            const qualifiedAgents = agentsPool.filter((agent) => agent.agentCompetencies?.some((ac) => ac.competency.name === shift.requiredSkill && ac.expirationDate > new Date()));
            if (qualifiedAgents.length === 0) {
                result.unassigned.push({ shiftId: shift.id, reason: 'No qualified agents found' });
                continue;
            }
            const shiftDuration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
            for (const agent of qualifiedAgents) {
                const isAvailable = await this.planningService.checkAvailability(tenantId, agent.id, shift.start);
                if (!isAvailable) {
                    continue;
                }
                const dbHours = await this.planningService.getWeeklyHours(tenantId, agent.id, shift.start);
                const currentVirtual = virtualHours.get(agent.id) || 0;
                const totalHours = dbHours + currentVirtual;
                const weeklyLimit = this.localeRules.getWeeklyWorkLimit();
                if (totalHours + shiftDuration <= weeklyLimit) {
                    result.assigned.push({ shiftId: shift.id, agentId: agent.id });
                    virtualHours.set(agent.id, currentVirtual + shiftDuration);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                result.unassigned.push({ shiftId: shift.id, reason: 'Qualified agents reached work limit' });
            }
        }
        return result;
    }
};
exports.OptimizationService = OptimizationService;
exports.OptimizationService = OptimizationService = OptimizationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [planning_service_1.PlanningService, Object])
], OptimizationService);
//# sourceMappingURL=optimization.service.js.map