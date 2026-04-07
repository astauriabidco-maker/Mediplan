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
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
const hospital_service_entity_1 = require("../agents/entities/hospital-service.entity");
const shift_proposal_entity_1 = require("./entities/shift-proposal.entity");
const settings_service_1 = require("../settings/settings.service");
let AutoSchedulerService = class AutoSchedulerService {
    agentRepository;
    shiftRepository;
    leaveRepository;
    serviceRepository;
    proposalRepository;
    localeRules;
    planningService;
    auditService;
    settingsService;
    constructor(agentRepository, shiftRepository, leaveRepository, serviceRepository, proposalRepository, localeRules, planningService, auditService, settingsService) {
        this.agentRepository = agentRepository;
        this.shiftRepository = shiftRepository;
        this.leaveRepository = leaveRepository;
        this.serviceRepository = serviceRepository;
        this.proposalRepository = proposalRepository;
        this.localeRules = localeRules;
        this.planningService = planningService;
        this.auditService = auditService;
        this.settingsService = settingsService;
    }
    async generateSmartSchedule(tenantId, startDate, endDate) {
        const needs = [];
        const ratioDayStr = await this.settingsService.getSetting(tenantId, null, 'planning.beds_per_nurse_day') || '10';
        const ratioNightStr = await this.settingsService.getSetting(tenantId, null, 'planning.beds_per_nurse_night') || '15';
        const ratioDay = parseInt(ratioDayStr, 10) || 10;
        const ratioNight = parseInt(ratioNightStr, 10) || 15;
        const services = await this.serviceRepository.find({
            where: { tenantId: tenantId || 'DEFAULT_TENANT', isActive: true },
            relations: ['facility']
        });
        const current = new Date(startDate);
        while (current <= endDate) {
            const dayStart = new Date(current);
            dayStart.setHours(7, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(19, 0, 0, 0);
            const nightStart = new Date(current);
            nightStart.setHours(19, 0, 0, 0);
            const nightEnd = new Date(current);
            nightEnd.setDate(nightEnd.getDate() + 1);
            nightEnd.setHours(7, 0, 0, 0);
            for (const service of services) {
                const capacity = service.bedCapacity || 0;
                const countDay = Math.max(1, Math.ceil(capacity / ratioDay));
                needs.push({
                    start: dayStart,
                    end: dayEnd,
                    postId: `[${service.name}] Infirmier Jour`,
                    count: countDay,
                    facilityId: service.facility?.id,
                    serviceId: service.id,
                    serviceName: service.name
                });
                if (service.is24x7) {
                    const countNight = Math.max(1, Math.ceil(capacity / ratioNight));
                    needs.push({
                        start: nightStart,
                        end: nightEnd,
                        postId: `[${service.name}] Infirmier Nuit`,
                        count: countNight,
                        facilityId: service.facility?.id,
                        serviceId: service.id,
                        serviceName: service.name
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }
        return this.generateSchedule(tenantId, startDate, endDate, needs);
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
                const facilityId = null;
                const weeklyLimit = await this.settingsService.getSetting(tenantId, facilityId, 'planning.weekly_hours_limit') || 48;
                if (totalHours > weeklyLimit) {
                    continue;
                }
                const score = await this.calculateAgentScore(tenantId, agent, need, currentWeeklyHours + pendingHours);
                eligibleAgents.push({ agent, totalHours, score });
            }
            eligibleAgents.sort((a, b) => b.score - a.score);
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
            await this.auditService.log(tenantId, 0, audit_log_entity_1.AuditAction.AUTO_GENERATE, audit_log_entity_1.AuditEntityType.PLANNING, 'BULK', { count: generatedShifts.length, start: startDate, end: endDate });
        }
        return generatedShifts;
    }
    async calculateAgentScore(tenantId, agent, need, currentHours) {
        let score = 0;
        const weeklyLimit = await this.settingsService.getSetting(tenantId, null, 'planning.weekly_hours_limit') || 48;
        const hourFactor = Math.max(0, (weeklyLimit - currentHours) / weeklyLimit);
        score += hourFactor * 40;
        if (need.serviceId && agent.hospitalServiceId === need.serviceId) {
            score += 40;
        }
        else if (agent.hospitalServiceId && need.postId.includes(agent.hospitalService?.name || '')) {
            score += 30;
        }
        if (agent.jobTitle && need.postId.toLowerCase().includes(agent.jobTitle.toLowerCase())) {
            score += 30;
        }
        return Math.min(100, score);
    }
    async scanForProblems(tenantId) {
        const issues = [];
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const services = await this.serviceRepository.find({ where: { tenantId, isActive: true } });
        for (const service of services) {
            if (!service.minAgents)
                continue;
            const shifts = await this.shiftRepository.createQueryBuilder('shift')
                .leftJoin('shift.agent', 'agent')
                .where('shift.tenantId = :tenantId', { tenantId })
                .andWhere('agent.hospitalServiceId = :serviceId', { serviceId: service.id })
                .andWhere('shift.start >= :now', { now })
                .andWhere('shift.start <= :nextWeek', { nextWeek })
                .getMany();
            if (shifts.length < service.minAgents) {
                issues.push({
                    type: 'UNDERSTAFFING',
                    serviceId: service.id,
                    serviceName: service.name,
                    severity: 'HIGH',
                    message: `Le service ${service.name} est en sous-effectif critique (Min: ${service.minAgents}).`
                });
            }
        }
        const conflicts = await this.shiftRepository.query(`
            SELECT s1.id as id1, s2.id as id2, s1.agentId
            FROM shift s1
            JOIN shift s2 ON s1.agentId = s2.agentId AND s1.id < s2.id
            WHERE s1.tenantId = ? AND s1.start < s2.end AND s1.end > s2.start
        `, [tenantId]);
        for (const conflict of conflicts) {
            issues.push({
                type: 'CONFLICT',
                shiftId: conflict.id1,
                agentId: conflict.agentId,
                severity: 'CRITICAL',
                message: `Double garde détectée pour l'agent #${conflict.agentId}.`
            });
            await this.generateResolutionProposal(tenantId, conflict.id1);
        }
        return issues;
    }
    async generateResolutionProposal(tenantId, shiftId) {
        const shift = await this.shiftRepository.findOne({ where: { id: shiftId }, relations: ['agent'] });
        if (!shift)
            return;
        const candidates = await this.findReplacements(tenantId, shift.start, shift.end, shift.postId);
        if (candidates.length > 0) {
            const best = candidates[0];
            const existing = await this.proposalRepository.findOne({ where: { shiftId, suggestedAgentId: best.id, status: shift_proposal_entity_1.ProposalStatus.PENDING } });
            if (!existing) {
                await this.proposalRepository.save(this.proposalRepository.create({
                    tenantId,
                    shiftId: shift.id,
                    originalAgentId: shift.agent?.id,
                    suggestedAgentId: best.id,
                    type: shift_proposal_entity_1.ProposalType.REPLACEMENT,
                    reason: `Résolution automatique de conflit : Remplacer par ${best.nom} (Score Élevé)`,
                    score: 85
                }));
            }
        }
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
            const weeklyLimit = await this.settingsService.getSetting(tenantId, null, 'planning.weekly_hours_limit') || 48;
            if (currentWeeklyHours >= weeklyLimit)
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
        const minRestHours = await this.settingsService.getSetting(tenantId, null, 'planning.daily_rest_hours') || 11;
        return restHours >= minRestHours;
    }
};
exports.AutoSchedulerService = AutoSchedulerService;
exports.AutoSchedulerService = AutoSchedulerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(1, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(2, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(3, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __param(4, (0, typeorm_1.InjectRepository)(shift_proposal_entity_1.ShiftProposal)),
    __param(5, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, planning_service_1.PlanningService,
        audit_service_1.AuditService,
        settings_service_1.SettingsService])
], AutoSchedulerService);
//# sourceMappingURL=auto-scheduler.service.js.map