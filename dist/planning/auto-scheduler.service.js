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
exports.AutoSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_entity_1 = require("../agents/entities/agent.entity");
const shift_entity_1 = require("./entities/shift.entity");
const leave_entity_1 = require("./entities/leave.entity");
const locale_module_1 = require("../core/config/locale.module");
const planning_service_1 = require("./planning.service");
let AutoSchedulerService = class AutoSchedulerService {
    agentRepository;
    shiftRepository;
    leaveRepository;
    localeRules;
    planningService;
    constructor(agentRepository, shiftRepository, leaveRepository, localeRules, planningService) {
        this.agentRepository = agentRepository;
        this.shiftRepository = shiftRepository;
        this.leaveRepository = leaveRepository;
        this.localeRules = localeRules;
        this.planningService = planningService;
    }
    async generateSchedule(tenantId, startDate, endDate, needs) {
        const generatedShifts = [];
        const agents = await this.agentRepository.find({
            where: { tenantId: tenantId || 'DEFAULT_TENANT' },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });
        for (const need of needs) {
            let assignedCount = 0;
            const eligibleAgents = [];
            for (const agent of agents) {
                let matchesRole = true;
                if (need.requiredSkills && need.requiredSkills.length > 0) {
                    const agentSkills = agent.agentCompetencies?.map(ac => ac.competency.name) || [];
                    matchesRole = need.requiredSkills.every(skill => agentSkills.includes(skill));
                }
                else if (need.postId) {
                    const target = need.postId.toLowerCase();
                    const job = (agent.jobTitle || '').toLowerCase();
                    const dept = (agent.department || '').toLowerCase();
                    matchesRole = job.includes(target) || dept.includes(target);
                    if (!matchesRole && target.includes('medecin') && job.includes('docteur'))
                        matchesRole = true;
                    if (!matchesRole && target.includes('infirmier') && job.includes('infirmier'))
                        matchesRole = true;
                    if (!matchesRole && target.includes('garde') && job.includes('garde'))
                        matchesRole = true;
                }
                if (!matchesRole)
                    continue;
                const isAvailable = await this.checkAvailability(tenantId, agent.id, need.start, need.end);
                if (!isAvailable)
                    continue;
                const respectsDailyRest = await this.checkDailyRest(tenantId, agent.id, need.start);
                if (!respectsDailyRest)
                    continue;
                const currentWeeklyHours = await this.planningService.getWeeklyHours(tenantId, agent.id, need.start);
                const pendingHours = this.calculatePendingHours(generatedShifts, agent.id, need.start);
                const shiftDuration = (need.end.getTime() - need.start.getTime()) / (1000 * 60 * 60);
                const totalHours = currentWeeklyHours + pendingHours + shiftDuration;
                if (totalHours > this.localeRules.getWeeklyWorkLimit()) {
                    continue;
                }
                eligibleAgents.push({ agent, totalHours });
            }
            eligibleAgents.sort((a, b) => a.totalHours - b.totalHours);
            for (const candidate of eligibleAgents) {
                if (assignedCount >= need.count)
                    break;
                const newShift = this.shiftRepository.create({
                    start: need.start,
                    end: need.end,
                    postId: need.postId,
                    status: 'AUTO_GENERATED',
                    agent: candidate.agent,
                    tenantId: tenantId || 'DEFAULT_TENANT'
                });
                generatedShifts.push(newShift);
                assignedCount++;
            }
        }
        if (generatedShifts.length > 0) {
            await this.shiftRepository.save(generatedShifts);
        }
        return generatedShifts;
    }
    async checkAvailability(tenantId, agentId, start, end) {
        const shiftCount = await this.shiftRepository.count({
            where: {
                tenantId: tenantId || 'DEFAULT_TENANT',
                agent: { id: agentId },
                start: (0, typeorm_2.LessThanOrEqual)(end),
                end: (0, typeorm_2.MoreThanOrEqual)(start)
            }
        });
        if (shiftCount > 0)
            return false;
        const leaveCount = await this.leaveRepository.count({
            where: {
                tenantId: tenantId || 'DEFAULT_TENANT',
                agent: { id: agentId },
                status: leave_entity_1.LeaveStatus.APPROVED,
                start: (0, typeorm_2.LessThanOrEqual)(end),
                end: (0, typeorm_2.MoreThanOrEqual)(start)
            }
        });
        if (leaveCount > 0)
            return false;
        return true;
    }
    calculatePendingHours(generatedShifts, agentId, date) {
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return generatedShifts
            .filter(s => s.agent.id === agentId && s.start >= startOfWeek && s.start < endOfWeek)
            .reduce((total, s) => {
            return total + (s.end.getTime() - s.start.getTime()) / (1000 * 60 * 60);
        }, 0);
    }
    async findReplacements(tenantId, start, end, competency) {
        const agents = await this.agentRepository.find({
            where: { tenantId: tenantId || 'DEFAULT_TENANT' },
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
            const isAvailable = await this.checkAvailability(tenantId, agent.id, start, end);
            if (!isAvailable)
                continue;
            const respectsDailyRest = await this.checkDailyRest(tenantId, agent.id, start);
            if (!respectsDailyRest)
                continue;
            const currentWeeklyHours = await this.planningService.getWeeklyHours(tenantId, agent.id, start);
            if (currentWeeklyHours >= this.localeRules.getWeeklyWorkLimit())
                continue;
            availableAgents.push(agent);
        }
        return availableAgents;
    }
    async checkDailyRest(tenantId, agentId, start) {
        const lastShift = await this.shiftRepository.findOne({
            where: {
                tenantId: tenantId || 'DEFAULT_TENANT',
                agent: { id: agentId },
                end: (0, typeorm_2.LessThanOrEqual)(start)
            },
            order: { end: 'DESC' }
        });
        if (!lastShift)
            return true;
        const restHours = (start.getTime() - lastShift.end.getTime()) / (1000 * 60 * 60);
        return restHours >= this.localeRules.getDailyRestHours();
    }
};
exports.AutoSchedulerService = AutoSchedulerService;
exports.AutoSchedulerService = AutoSchedulerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(1, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(2, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(3, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, planning_service_1.PlanningService])
], AutoSchedulerService);
//# sourceMappingURL=auto-scheduler.service.js.map