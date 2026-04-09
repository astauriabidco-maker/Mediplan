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
exports.PlanningService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shift_entity_1 = require("./entities/shift.entity");
const leave_entity_1 = require("./entities/leave.entity");
const locale_module_1 = require("../core/config/locale.module");
const agent_entity_1 = require("../agents/entities/agent.entity");
const work_policy_entity_1 = require("./entities/work-policy.entity");
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
const shift_application_entity_1 = require("./entities/shift-application.entity");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const events_gateway_1 = require("../events/events.gateway");
const documents_service_1 = require("../documents/documents.service");
const settings_service_1 = require("../settings/settings.service");
const health_record_entity_1 = require("../agents/entities/health-record.entity");
let PlanningService = class PlanningService {
    shiftRepository;
    healthRecordRepository;
    leaveRepository;
    agentRepository;
    workPolicyRepository;
    shiftApplicationRepository;
    localeRules;
    auditService;
    whatsappService;
    eventsGateway;
    documentsService;
    settingsService;
    constructor(shiftRepository, healthRecordRepository, leaveRepository, agentRepository, workPolicyRepository, shiftApplicationRepository, localeRules, auditService, whatsappService, eventsGateway, documentsService, settingsService) {
        this.shiftRepository = shiftRepository;
        this.healthRecordRepository = healthRecordRepository;
        this.leaveRepository = leaveRepository;
        this.agentRepository = agentRepository;
        this.workPolicyRepository = workPolicyRepository;
        this.shiftApplicationRepository = shiftApplicationRepository;
        this.localeRules = localeRules;
        this.auditService = auditService;
        this.whatsappService = whatsappService;
        this.eventsGateway = eventsGateway;
        this.documentsService = documentsService;
        this.settingsService = settingsService;
    }
    async validateShift(tenantId, agentId, start, end) {
        const constraints = await this.getConstraintsForAgent(tenantId, agentId);
        const expiredMandatoryRecords = await this.healthRecordRepository.find({
            where: {
                agentId,
                tenantId,
                isMandatory: true,
                status: health_record_entity_1.HealthRecordStatus.EXPIRED
            }
        });
        if (expiredMandatoryRecords.length > 0) {
            return false;
        }
        const isAvailable = await this.checkLeaveAvailability(tenantId, agentId, start, end);
        if (!isAvailable) {
            return false;
        }
        const weeklyLimit = await this.settingsService.getSetting(tenantId, null, 'planning.weekly_hours_limit') || 48;
        const currentWeeklyHours = await this.getWeeklyHours(tenantId, agentId, start);
        const shiftDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (currentWeeklyHours + shiftDuration > weeklyLimit) {
            return false;
        }
        if (shiftDuration > constraints.maxGuardDuration) {
            return false;
        }
        const previousShift = await this.shiftRepository.createQueryBuilder('shift')
            .where('shift.agentId = :agentId', { agentId })
            .andWhere('shift.end <= :start', { start })
            .orderBy('shift.end', 'DESC')
            .getOne();
        if (previousShift) {
            const restTime = (start.getTime() - previousShift.end.getTime()) / (1000 * 60 * 60);
            if (restTime < constraints.restHoursAfterGuard) {
                return false;
            }
        }
        const overlappingShift = await this.shiftRepository.createQueryBuilder('shift')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.agentId = :agentId', { agentId })
            .andWhere('shift.start < :end', { end })
            .andWhere('shift.end > :start', { start })
            .getOne();
        if (overlappingShift) {
            return false;
        }
        return true;
    }
    async getConstraintsForAgent(tenantId, agentId) {
        const defaults = {
            restHoursAfterGuard: 24,
            maxGuardDuration: 24,
            onCallCompensationPercent: 0,
        };
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['hospitalService', 'grade']
        });
        if (!agent)
            return defaults;
        let policy = null;
        if (agent.hospitalServiceId && agent.gradeId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    hospitalServiceId: agent.hospitalServiceId,
                    gradeId: agent.gradeId
                }
            });
        }
        if (!policy && agent.gradeId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    gradeId: agent.gradeId,
                    hospitalServiceId: (0, typeorm_2.IsNull)()
                }
            });
        }
        if (!policy && agent.hospitalServiceId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    hospitalServiceId: agent.hospitalServiceId,
                    gradeId: (0, typeorm_2.IsNull)()
                }
            });
        }
        if (policy) {
            return {
                restHoursAfterGuard: policy.restHoursAfterGuard,
                maxGuardDuration: policy.maxGuardDuration,
                onCallCompensationPercent: policy.onCallCompensationPercent,
            };
        }
        return defaults;
    }
    async checkAvailability(tenantId, agentId, date) {
        return this.checkLeaveAvailability(tenantId, agentId, date, date);
    }
    async checkLeaveAvailability(tenantId, agentId, start, end) {
        const count = await this.leaveRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status = :status', { status: 'APPROVED' })
            .andWhere('leave.start < :end', { end })
            .andWhere('leave.end > :start', { start })
            .getCount();
        return count === 0;
    }
    async getWeeklyHours(tenantId, agentId, date) {
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        const shifts = await this.shiftRepository.find({
            where: {
                agent: { id: agentId },
                tenantId: tenantId,
                start: (0, typeorm_2.Between)(startOfWeek, endOfWeek),
            },
        });
        return shifts.reduce((total, shift) => {
            const duration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
            return total + duration;
        }, 0);
    }
    async getShifts(tenantId, start, end, facilityId, serviceId) {
        const query = this.shiftRepository.createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .leftJoinAndSelect('shift.facility', 'facility')
            .where('shift.tenantId = :tenantId', { tenantId: tenantId || 'DEFAULT_TENANT' })
            .andWhere('shift.start >= :start', { start })
            .andWhere('shift.end <= :end', { end });
        if (facilityId) {
            query.andWhere('shift.facilityId = :facilityId', { facilityId });
        }
        if (serviceId) {
            query.andWhere('agent.hospitalServiceId = :serviceId', { serviceId });
        }
        return query.getMany();
    }
    async assignReplacement(tenantId, agentId, start, end, postId) {
        const isValid = await this.validateShift(tenantId, agentId, start, end);
        if (!isValid) {
            throw new Error('Agent cannot take this replacement (weekly hours limit).');
        }
        const shift = this.shiftRepository.create({
            tenantId,
            agent: { id: agentId },
            start,
            end,
            postId,
            status: 'VALIDATED'
        });
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, agentId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, { postId, start, end });
        return savedShift;
    }
    async updateShift(tenantId, shiftId, start, end, actorId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent']
        });
        if (!shift) {
            throw new Error('Shift not found');
        }
        if (shift.agent) {
            const isValid = await this.validateShift(tenantId, shift.agent.id, start, end);
            if (!isValid) {
                throw new Error('Agent cannot work this schedule (validation failed).');
            }
        }
        shift.start = start;
        shift.end = end;
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, { start, end });
        return savedShift;
    }
    async getShiftApplications(tenantId) {
        return this.shiftApplicationRepository.find({
            where: { tenantId },
            relations: ['agent', 'shift', 'shift.facility'],
            order: { appliedAt: 'DESC' }
        });
    }
    async approveGhtApplication(tenantId, applicationId, actorId) {
        const application = await this.shiftApplicationRepository.findOne({
            where: { id: Number(applicationId), tenantId },
            relations: ['shift', 'agent']
        });
        if (!application)
            throw new Error('Application not found');
        if (application.status !== shift_application_entity_1.ShiftApplicationStatus.PENDING_GHT_APPROVAL)
            throw new Error('Application is not pending GHT approval');
        application.status = shift_application_entity_1.ShiftApplicationStatus.ACCEPTED;
        const shift = await this.shiftRepository.findOne({ where: { id: application.shift.id, tenantId } });
        if (shift) {
            shift.status = 'PUBLISHED';
            await this.shiftRepository.save(shift);
        }
        await this.shiftApplicationRepository.save(application);
        if (application.agent.telephone) {
            this.whatsappService.sendMessage(application.agent.telephone, `✅ Bonne nouvelle ! Le Superviseur RH GHT a validé votre déplacement pour la garde #${application.shift.id}. La garde vous est officiellement affectée.`).catch(() => { });
        }
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, shift?.id || 0, { action: 'approve_ght' });
        this.eventsGateway.broadcastPlanningUpdate();
        await this.documentsService.generateContractForShift(tenantId, shift, application.agent);
        return application;
    }
    async rejectGhtApplication(tenantId, applicationId, actorId) {
        const application = await this.shiftApplicationRepository.findOne({
            where: { id: Number(applicationId), tenantId },
            relations: ['shift', 'agent']
        });
        if (!application)
            throw new Error('Application not found');
        if (application.status !== shift_application_entity_1.ShiftApplicationStatus.PENDING_GHT_APPROVAL)
            throw new Error('Application is not pending GHT approval');
        application.status = shift_application_entity_1.ShiftApplicationStatus.REJECTED;
        const shift = await this.shiftRepository.findOne({ where: { id: application.shift.id, tenantId } });
        if (shift) {
            shift.agent = null;
            shift.status = 'BROADCASTED_GHT';
            await this.shiftRepository.save(shift);
        }
        await this.shiftApplicationRepository.save(application);
        if (application.agent.telephone) {
            this.whatsappService.sendMessage(application.agent.telephone, `❌ Désolé, le Superviseur RH GHT a refusé la validation de votre déplacement pour la garde #${application.shift.id}.`).catch(() => { });
        }
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, shift?.id || 0, { action: 'reject_ght' });
        this.eventsGateway.broadcastPlanningUpdate();
        return application;
    }
    async requestSwap(tenantId, shiftId, agentId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: shiftId, tenantId },
            relations: ['agent']
        });
        if (!shift)
            throw new Error('Garde introuvable.');
        if (shift.agent.id !== agentId && shift.agent.id !== Number(agentId)) {
            throw new Error('Vous ne pouvez mettre en échange que vos propres gardes.');
        }
        shift.isSwapRequested = true;
        this.eventsGateway.broadcastPlanningUpdate();
        return this.shiftRepository.save(shift);
    }
    async getAvailableSwaps(tenantId, agentId) {
        const currentAgent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['hospitalService', 'grade']
        });
        if (!currentAgent)
            throw new Error('Agent introuvable');
        const query = this.shiftRepository.createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .leftJoinAndSelect('shift.facility', 'facility')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.isSwapRequested = :isSwapRequested', { isSwapRequested: true })
            .andWhere('shift.start > :now', { now: new Date() })
            .andWhere('shift.agent.id != :agentId', { agentId });
        if (currentAgent.grade?.name?.toUpperCase() !== 'MDECIN' && currentAgent.grade?.name?.toUpperCase() !== 'MEDECIN') {
            query.andWhere('agent.hospitalServiceId = :hospitalServiceId', { hospitalServiceId: currentAgent.hospitalServiceId });
        }
        return query.getMany();
    }
    async applyForSwap(tenantId, shiftId, agentId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: shiftId, tenantId },
            relations: ['agent']
        });
        if (!shift)
            throw new Error('Garde introuvable.');
        if (!shift.isSwapRequested)
            throw new Error('Cette garde n\'est plus disponible à l\'échange.');
        const applyingAgent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId }
        });
        if (!applyingAgent)
            throw new Error('Agent introuvable');
        let policy = await this.workPolicyRepository.findOne({
            where: { tenantId, hospitalServiceId: applyingAgent.hospitalServiceId }
        });
        if (!policy) {
            policy = await this.workPolicyRepository.findOne({
                where: { tenantId, hospitalServiceId: (0, typeorm_2.IsNull)() }
            });
        }
        const restHours = policy?.restHoursAfterGuard || 11;
        const maxWeeklyHours = 48;
        const QvtIsOk = await this.validateShift(tenantId, agentId, shift.start, shift.end);
        if (!QvtIsOk) {
            throw new Error(`Échange impossible : Cette garde violerait votre règle QVT de sécurité (Repos ${restHours}h ou chevauchement).`);
        }
        const weeklyHours = await this.getWeeklyHours(tenantId, agentId, shift.start);
        const shiftDuration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
        if (weeklyHours + shiftDuration > maxWeeklyHours) {
            throw new Error(`Échange impossible : Heures hebdomadaires maximales (${maxWeeklyHours}h) dépassées.`);
        }
        const formerAgent = shift.agent;
        shift.agent = applyingAgent;
        shift.isSwapRequested = false;
        await this.shiftRepository.save(shift);
        if (formerAgent?.telephone) {
            this.whatsappService.sendMessage(formerAgent.telephone, `✅ Bonne nouvelle ! Votre garde du ${shift.start.toLocaleDateString()} a été reprise par ${applyingAgent.nom} via la Bourse d'Échange.`).catch(() => { });
        }
        this.eventsGateway.broadcastPlanningUpdate();
        return { success: true, message: 'Échange auto-validé ! La garde a été ajoutée à votre planning.' };
    }
};
exports.PlanningService = PlanningService;
exports.PlanningService = PlanningService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(1, (0, typeorm_1.InjectRepository)(health_record_entity_1.HealthRecord)),
    __param(2, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(3, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(4, (0, typeorm_1.InjectRepository)(work_policy_entity_1.WorkPolicy)),
    __param(5, (0, typeorm_1.InjectRepository)(shift_application_entity_1.ShiftApplication)),
    __param(6, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, audit_service_1.AuditService,
        whatsapp_service_1.WhatsappService,
        events_gateway_1.EventsGateway,
        documents_service_1.DocumentsService,
        settings_service_1.SettingsService])
], PlanningService);
//# sourceMappingURL=planning.service.js.map