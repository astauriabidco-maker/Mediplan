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
const agent_entity_1 = require("../agents/entities/agent.entity");
const hospital_service_entity_1 = require("../agents/entities/hospital-service.entity");
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
const shift_application_entity_1 = require("./entities/shift-application.entity");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const events_gateway_1 = require("../events/events.gateway");
const documents_service_1 = require("../documents/documents.service");
const compliance_validation_service_1 = require("./compliance-validation.service");
const agent_alert_entity_1 = require("../agents/entities/agent-alert.entity");
const compliance_validation_types_1 = require("./compliance-validation.types");
const MANAGER_WORKLIST_RULES = {
    [compliance_validation_types_1.ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT]: {
        category: 'REST_INSUFFICIENT',
        title: 'Repos insuffisant avant garde',
        severity: agent_alert_entity_1.AlertSeverity.HIGH,
    },
    [compliance_validation_types_1.ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT]: {
        category: 'REST_INSUFFICIENT',
        title: 'Repos insuffisant après garde',
        severity: agent_alert_entity_1.AlertSeverity.HIGH,
    },
    [compliance_validation_types_1.ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
        category: 'WEEKLY_OVERLOAD',
        title: 'Surcharge hebdomadaire',
        severity: agent_alert_entity_1.AlertSeverity.HIGH,
    },
    [compliance_validation_types_1.ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED]: {
        category: 'MISSING_COMPETENCY',
        title: 'Compétence obligatoire manquante ou expirée',
        severity: agent_alert_entity_1.AlertSeverity.HIGH,
    },
    [compliance_validation_types_1.ComplianceRuleCode.APPROVED_LEAVE_OVERLAP]: {
        category: 'LEAVE_CONFLICT',
        title: 'Conflit avec congé approuvé',
        severity: agent_alert_entity_1.AlertSeverity.HIGH,
    },
};
const PLANNING_TIMELINE_ACTIONS = new Set([
    'CREATE_SHIFT',
    'ASSIGN_REPLACEMENT',
    'UPDATE_SHIFT',
    'REASSIGN_SHIFT',
    'REQUEST_REPLACEMENT',
    'APPROVE_COMPLIANCE_EXCEPTION',
    'REVALIDATE_SHIFT',
    'PUBLISH_PLANNING',
    'RESOLVE_PLANNING_ALERT',
    'REQUEST_SWAP',
    'APPLY_SWAP',
    'COMPLIANCE_SCAN',
]);
let PlanningService = class PlanningService {
    shiftRepository;
    leaveRepository;
    agentRepository;
    hospitalServiceRepository;
    alertRepository;
    shiftApplicationRepository;
    auditService;
    whatsappService;
    eventsGateway;
    documentsService;
    complianceValidationService;
    constructor(shiftRepository, leaveRepository, agentRepository, hospitalServiceRepository, alertRepository, shiftApplicationRepository, auditService, whatsappService, eventsGateway, documentsService, complianceValidationService) {
        this.shiftRepository = shiftRepository;
        this.leaveRepository = leaveRepository;
        this.agentRepository = agentRepository;
        this.hospitalServiceRepository = hospitalServiceRepository;
        this.alertRepository = alertRepository;
        this.shiftApplicationRepository = shiftApplicationRepository;
        this.auditService = auditService;
        this.whatsappService = whatsappService;
        this.eventsGateway = eventsGateway;
        this.documentsService = documentsService;
        this.complianceValidationService = complianceValidationService;
    }
    async validateShift(tenantId, agentId, start, end, options = {}) {
        return this.complianceValidationService.validateShift(tenantId, agentId, start, end, options);
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
        const query = this.shiftRepository
            .createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .leftJoinAndSelect('shift.facility', 'facility')
            .where('shift.tenantId = :tenantId', {
            tenantId: tenantId || 'DEFAULT_TENANT',
        })
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
    async createShift(tenantId, actorId, input) {
        this.assertValidShiftDates(input.start, input.end);
        const validation = await this.validateShift(tenantId, input.agentId, input.start, input.end);
        if (!validation.isValid) {
            throw new common_1.BadRequestException(this.formatValidationFailure(validation));
        }
        const shift = this.shiftRepository.create({
            tenantId,
            agent: { id: input.agentId },
            start: input.start,
            end: input.end,
            postId: input.postId,
            type: input.type || shift_entity_1.ShiftType.NORMAL,
            facilityId: input.facilityId,
            status: 'PENDING',
        });
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'CREATE_SHIFT',
            validation,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        return savedShift;
    }
    async assignReplacement(tenantId, actorId, agentId, start, end, postId) {
        this.assertValidShiftDates(start, end);
        const validation = await this.validateShift(tenantId, agentId, start, end);
        if (!validation.isValid) {
            throw new common_1.BadRequestException(this.formatValidationFailure(validation));
        }
        const shift = this.shiftRepository.create({
            tenantId,
            agent: { id: agentId },
            start,
            end,
            postId,
            status: 'VALIDATED',
        });
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'ASSIGN_REPLACEMENT',
            agentId,
            validation,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        return savedShift;
    }
    async updateShift(tenantId, shiftId, start, end, actorId) {
        this.assertValidShiftDates(start, end);
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        const before = this.getShiftAuditSnapshot(shift);
        if (shift.agent) {
            const validation = await this.validateShift(tenantId, shift.agent.id, start, end, { excludeShiftId: Number(shiftId) });
            if (!validation.isValid) {
                throw new common_1.BadRequestException(this.formatValidationFailure(validation));
            }
        }
        shift.start = start;
        shift.end = end;
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'UPDATE_SHIFT',
            before,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        return savedShift;
    }
    async publishPlanning(tenantId, actorId, start, end) {
        const { pendingShifts, report } = await this.buildPublishPlanningReport(tenantId, start, end);
        if (report.violations.length > 0) {
            await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.PLANNING, `${start.toISOString()}_${end.toISOString()}`, {
                action: 'PUBLISH_PLANNING',
                blocked: true,
                report,
            });
            throw new common_1.BadRequestException({
                message: 'Planning publication blocked by compliance violations',
                report,
            });
        }
        for (const shift of pendingShifts) {
            shift.status = 'VALIDATED';
        }
        await this.shiftRepository.save(pendingShifts);
        const affected = pendingShifts.length;
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.PLANNING, `${start.toISOString()}_${end.toISOString()}`, {
            action: 'PUBLISH_PLANNING',
            blocked: false,
            affected,
            report,
        });
        return { message: 'Planning publié avec succès', affected, report };
    }
    async previewPublishPlanning(tenantId, start, end) {
        const { report } = await this.buildPublishPlanningReport(tenantId, start, end, { skipAlertSync: true });
        return {
            publishable: report.publishable,
            report,
        };
    }
    async getComplianceReports(tenantId, filters = {}) {
        const logs = await this.auditService.getLogs(tenantId, {
            action: audit_log_entity_1.AuditAction.UPDATE,
            entityType: audit_log_entity_1.AuditEntityType.PLANNING,
            detailAction: 'PUBLISH_PLANNING',
            from: filters.from,
            to: filters.to,
            limit: filters.limit,
        });
        return logs.map((log) => ({
            id: log.id,
            timestamp: log.timestamp,
            actorId: log.actorId,
            entityId: log.entityId,
            blocked: Boolean(log.details?.blocked),
            affected: log.details?.affected || 0,
            report: log.details?.report,
        }));
    }
    async getPlanningComplianceTimeline(tenantId, filters = {}) {
        const limit = filters.limit || 100;
        const [logs, alerts] = await Promise.all([
            this.auditService.getLogs(tenantId, {
                from: filters.from,
                to: filters.to,
                limit,
            }),
            this.alertRepository.find({
                where: { tenantId },
                order: { createdAt: 'DESC', id: 'DESC' },
                take: Math.min(limit, 500),
            }),
        ]);
        const auditItems = logs
            .filter((log) => {
            const action = this.getAuditBusinessAction(log);
            return action && PLANNING_TIMELINE_ACTIONS.has(action);
        })
            .filter((log) => this.matchesTimelineFilters(log, filters))
            .map((log) => this.toPlanningTimelineItem(log));
        const alertItems = alerts
            .filter((alert) => this.matchesTimelineAlertFilters(alert, filters))
            .map((alert) => this.toPlanningAlertTimelineItem(alert));
        const items = [...auditItems, ...alertItems]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
        return {
            tenantId,
            period: {
                from: filters.from,
                to: filters.to,
            },
            filters: {
                agentId: filters.agentId,
                shiftId: filters.shiftId,
            },
            total: items.length,
            items,
        };
    }
    async getComplianceSummary(tenantId, filters = {}) {
        const openAlerts = await this.alertRepository.find({
            where: {
                tenantId,
                isResolved: false,
            },
        });
        const openAlertsBySeverity = {
            [agent_alert_entity_1.AlertSeverity.HIGH]: 0,
            [agent_alert_entity_1.AlertSeverity.MEDIUM]: 0,
            [agent_alert_entity_1.AlertSeverity.LOW]: 0,
        };
        const agentIdsAtRisk = new Set();
        for (const alert of openAlerts) {
            openAlertsBySeverity[alert.severity] += 1;
            agentIdsAtRisk.add(alert.agentId);
        }
        const pendingShiftQuery = this.shiftRepository
            .createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.status = :status', { status: 'PENDING' });
        if (filters.from) {
            pendingShiftQuery.andWhere('shift.start >= :from', {
                from: filters.from,
            });
        }
        if (filters.to) {
            pendingShiftQuery.andWhere('shift.end <= :to', { to: filters.to });
        }
        const pendingShifts = await pendingShiftQuery.getMany();
        const blockedShiftPreview = [];
        const validationBatchCache = this.createValidationBatchCache();
        for (const shift of pendingShifts) {
            if (!shift.agent?.id) {
                blockedShiftPreview.push({
                    shiftId: shift.id,
                    blockingReasons: ['UNASSIGNED_SHIFT'],
                });
                continue;
            }
            const validation = await this.validateShift(tenantId, shift.agent.id, shift.start, shift.end, {
                excludeShiftId: shift.id,
                skipAlertSync: true,
                batchCache: validationBatchCache,
            });
            if (!validation.isValid) {
                if (this.hasApprovedComplianceException(shift)) {
                    continue;
                }
                blockedShiftPreview.push({
                    shiftId: shift.id,
                    agentId: shift.agent.id,
                    blockingReasons: validation.blockingReasons,
                });
                agentIdsAtRisk.add(shift.agent.id);
            }
        }
        const publicationLogs = await this.auditService.getLogs(tenantId, {
            action: audit_log_entity_1.AuditAction.UPDATE,
            entityType: audit_log_entity_1.AuditEntityType.PLANNING,
            detailAction: 'PUBLISH_PLANNING',
            from: filters.from,
            to: filters.to,
            limit: 1000,
        });
        return {
            tenantId,
            period: {
                from: filters.from,
                to: filters.to,
            },
            counters: {
                openAlerts: openAlerts.length,
                blockedShifts: blockedShiftPreview.length,
                agentsAtRisk: agentIdsAtRisk.size,
                refusedPublications: publicationLogs.filter((log) => Boolean(log.details?.blocked)).length,
            },
            openAlertsBySeverity,
            blockedShiftPreview: blockedShiftPreview.slice(0, 10),
        };
    }
    async getManagerWorklist(tenantId, filters = {}) {
        const items = new Map();
        const openAlerts = await this.alertRepository.find({
            where: {
                tenantId,
                isResolved: false,
            },
        });
        for (const alert of openAlerts) {
            const ruleCode = this.extractAlertRuleCode(alert);
            if (!ruleCode)
                continue;
            const definition = MANAGER_WORKLIST_RULES[ruleCode];
            if (!definition)
                continue;
            const item = {
                id: `alert:${alert.id}:${ruleCode}`,
                category: definition.category,
                source: 'ALERT',
                severity: alert.severity || definition.severity,
                agentId: alert.agentId,
                alertId: alert.id,
                title: definition.title,
                ruleCode,
                detectedAt: alert.createdAt,
                metadata: alert.metadata,
            };
            items.set(item.id, item);
        }
        const pendingShiftQuery = this.shiftRepository
            .createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.status = :status', { status: 'PENDING' });
        if (filters.from) {
            pendingShiftQuery.andWhere('shift.start >= :from', {
                from: filters.from,
            });
        }
        if (filters.to) {
            pendingShiftQuery.andWhere('shift.end <= :to', { to: filters.to });
        }
        const pendingShifts = await pendingShiftQuery.getMany();
        const validationBatchCache = this.createValidationBatchCache();
        for (const shift of pendingShifts) {
            if (!shift.agent?.id)
                continue;
            const validation = await this.validateShift(tenantId, shift.agent.id, shift.start, shift.end, {
                excludeShiftId: shift.id,
                skipAlertSync: true,
                batchCache: validationBatchCache,
            });
            for (const ruleCode of validation.blockingReasons) {
                if (this.hasApprovedComplianceException(shift)) {
                    continue;
                }
                const definition = MANAGER_WORKLIST_RULES[ruleCode];
                if (!definition)
                    continue;
                const item = {
                    id: `shift:${shift.id}:${ruleCode}`,
                    category: definition.category,
                    source: 'SHIFT_VALIDATION',
                    severity: definition.severity,
                    agentId: shift.agent.id,
                    shiftId: shift.id,
                    title: definition.title,
                    ruleCode,
                    dueAt: shift.start,
                    metadata: validation.metadata[ruleCode],
                };
                items.set(item.id, item);
            }
        }
        const sortedItems = Array.from(items.values()).sort((a, b) => {
            const severityDelta = this.getSeverityRank(b.severity) - this.getSeverityRank(a.severity);
            if (severityDelta !== 0)
                return severityDelta;
            const aDate = a.dueAt || a.detectedAt;
            const bDate = b.dueAt || b.detectedAt;
            return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
        });
        return {
            tenantId,
            period: {
                from: filters.from,
                to: filters.to,
            },
            total: sortedItems.length,
            counters: this.getManagerWorklistCounters(sortedItems),
            items: sortedItems,
        };
    }
    async getDecisionRecommendations(tenantId, filters = {}) {
        const worklist = await this.getManagerWorklist(tenantId, filters);
        const recommendations = worklist.items
            .map((item) => this.toDecisionRecommendation(item))
            .sort((a, b) => {
            const priorityDelta = b.priority - a.priority;
            if (priorityDelta !== 0)
                return priorityDelta;
            return (a.dueAt?.getTime() || 0) - (b.dueAt?.getTime() || 0);
        });
        return {
            tenantId,
            period: worklist.period,
            total: recommendations.length,
            recommendations,
        };
    }
    async getShiftDecisionSuggestions(tenantId, shiftId, replacementCandidates = []) {
        const compliance = await this.explainShiftCompliance(tenantId, shiftId);
        const validation = compliance.validation;
        return {
            shift: compliance.shift,
            validation,
            recommendedActions: this.getRecommendedActionsForRules(validation.blockingReasons, Boolean(compliance.shift.agentId)),
            replacements: replacementCandidates
                .map((agent) => this.toShiftReplacementSuggestion(agent, validation.blockingReasons, compliance.shift))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5),
        };
    }
    async getShiftSuggestionContext(tenantId, shiftId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        return shift;
    }
    async getShiftCorrectionGuidance(tenantId, shiftId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        const validation = shift.agent?.id
            ? await this.validateShift(tenantId, shift.agent.id, shift.start, shift.end, {
                excludeShiftId: shift.id,
                skipAlertSync: true,
            })
            : {
                isValid: false,
                blockingReasons: [compliance_validation_types_1.ComplianceRuleCode.AGENT_NOT_FOUND],
                warnings: [],
                metadata: { status: shift.status },
            };
        return {
            tenantId,
            problem: {
                type: 'SHIFT',
                id: shift.id,
                shiftId: shift.id,
                agentId: shift.agent?.id,
                status: shift.status,
                title: validation.isValid
                    ? 'Shift conforme'
                    : 'Shift bloqué par la conformité',
                metadata: this.getShiftAuditSnapshot(shift),
            },
            reasons: validation.blockingReasons,
            validation,
            availableActions: this.getShiftCorrectionActions(shift, validation),
        };
    }
    async getAlertCorrectionGuidance(tenantId, alertId) {
        const alert = await this.alertRepository.findOne({
            where: { id: Number(alertId), tenantId },
            relations: ['agent'],
        });
        if (!alert) {
            throw new common_1.NotFoundException('Agent alert not found');
        }
        const ruleCode = this.extractAlertRuleCode(alert);
        return {
            tenantId,
            problem: {
                type: 'ALERT',
                id: alert.id,
                alertId: alert.id,
                agentId: alert.agentId,
                severity: alert.severity,
                status: alert.isResolved ? 'RESOLVED' : 'OPEN',
                title: alert.message,
                detectedAt: alert.createdAt,
                metadata: alert.metadata,
            },
            reasons: ruleCode ? [ruleCode] : [alert.type],
            availableActions: alert.isResolved
                ? []
                : [
                    {
                        code: 'RESOLVE_ALERT',
                        label: 'Résoudre l’alerte',
                        description: 'Marque l’alerte comme traitée après correction ou justification.',
                        permissions: ['planning:write', 'alerts:manage'],
                        method: 'PATCH',
                        endpoint: `/planning/alerts/${alert.id}/resolve`,
                        body: {
                            reason: {
                                type: 'string',
                                required: true,
                            },
                            recommendationId: {
                                type: 'string',
                                required: false,
                            },
                        },
                    },
                ],
        };
    }
    async getServiceComplianceIndicators(tenantId, filters = {}) {
        const services = await this.hospitalServiceRepository.find({
            where: { tenantId, isActive: true },
            order: { name: 'ASC' },
        });
        const agents = await this.agentRepository.find({
            where: { tenantId },
        });
        const shiftWhere = { tenantId };
        if (filters.from) {
            shiftWhere.start = (0, typeorm_2.MoreThanOrEqual)(filters.from);
        }
        if (filters.to) {
            shiftWhere.end = (0, typeorm_2.LessThanOrEqual)(filters.to);
        }
        const shifts = await this.shiftRepository.find({
            where: shiftWhere,
            relations: ['agent'],
        });
        const openAlerts = await this.alertRepository.find({
            where: {
                tenantId,
                isResolved: false,
            },
            relations: ['agent'],
        });
        const weeklyLimit = 48;
        const indicators = new Map();
        for (const service of services) {
            indicators.set(service.id, {
                serviceId: service.id,
                serviceName: service.name,
                serviceCode: service.code,
                activeAgents: 0,
                plannedShifts: 0,
                validatedOrPublishedShifts: 0,
                pendingShifts: 0,
                coverageRate: 0,
                weeklyOverloadAgents: 0,
                publishedComplianceRate: 0,
                exceptionsApproved: 0,
                openAlertsBySeverity: {
                    [agent_alert_entity_1.AlertSeverity.HIGH]: 0,
                    [agent_alert_entity_1.AlertSeverity.MEDIUM]: 0,
                    [agent_alert_entity_1.AlertSeverity.LOW]: 0,
                },
            });
        }
        const hoursByService = new Map();
        const hoursByAgent = new Map();
        const agentServiceIds = new Map();
        for (const agent of agents) {
            if (!agent.hospitalServiceId)
                continue;
            agentServiceIds.set(agent.id, agent.hospitalServiceId);
            const indicator = indicators.get(agent.hospitalServiceId);
            if (indicator) {
                indicator.activeAgents += 1;
            }
        }
        for (const shift of shifts) {
            const serviceId = shift.agent?.hospitalServiceId;
            if (!serviceId)
                continue;
            const indicator = indicators.get(serviceId);
            if (!indicator)
                continue;
            const durationHours = this.getShiftDurationHours(shift);
            indicator.plannedShifts += 1;
            if (['VALIDATED', 'PUBLISHED'].includes(shift.status)) {
                indicator.validatedOrPublishedShifts += 1;
            }
            if (shift.status === 'PENDING') {
                indicator.pendingShifts += 1;
            }
            if (shift.complianceExceptionApproved) {
                indicator.exceptionsApproved += 1;
            }
            hoursByService.set(serviceId, (hoursByService.get(serviceId) || 0) + durationHours);
            if (shift.agent?.id) {
                hoursByAgent.set(shift.agent.id, (hoursByAgent.get(shift.agent.id) || 0) + durationHours);
            }
        }
        for (const [agentId, hours] of hoursByAgent.entries()) {
            if (hours <= weeklyLimit)
                continue;
            const serviceId = agentServiceIds.get(agentId);
            if (!serviceId)
                continue;
            const indicator = indicators.get(serviceId);
            if (indicator) {
                indicator.weeklyOverloadAgents += 1;
            }
        }
        for (const alert of openAlerts) {
            const serviceId = alert.agent?.hospitalServiceId;
            if (!serviceId)
                continue;
            const indicator = indicators.get(serviceId);
            if (indicator) {
                indicator.openAlertsBySeverity[alert.severity] += 1;
            }
        }
        for (const indicator of indicators.values()) {
            const capacityHours = indicator.activeAgents * weeklyLimit;
            const plannedHours = hoursByService.get(indicator.serviceId) || 0;
            indicator.coverageRate =
                capacityHours > 0
                    ? Math.round((plannedHours / capacityHours) * 100)
                    : 0;
            indicator.publishedComplianceRate =
                indicator.plannedShifts > 0
                    ? Math.round((indicator.validatedOrPublishedShifts / indicator.plannedShifts) *
                        100)
                    : 0;
        }
        return {
            tenantId,
            period: {
                from: filters.from,
                to: filters.to,
            },
            services: Array.from(indicators.values()),
        };
    }
    async getProductionObservabilityHealth(tenantId, filters = {}) {
        const shiftWhere = { tenantId };
        if (filters.from) {
            shiftWhere.start = (0, typeorm_2.MoreThanOrEqual)(filters.from);
        }
        if (filters.to) {
            shiftWhere.end = (0, typeorm_2.LessThanOrEqual)(filters.to);
        }
        const [openAlerts, shifts, publicationLogs, complianceScanLogs, auditChain,] = await Promise.all([
            this.alertRepository.find({
                where: {
                    tenantId,
                    isResolved: false,
                },
            }),
            this.shiftRepository.find({
                where: shiftWhere,
            }),
            this.auditService.getLogs(tenantId, {
                action: audit_log_entity_1.AuditAction.UPDATE,
                entityType: audit_log_entity_1.AuditEntityType.PLANNING,
                detailAction: 'PUBLISH_PLANNING',
                from: filters.from,
                to: filters.to,
                limit: 20,
            }),
            this.auditService.getLogs(tenantId, {
                detailAction: 'COMPLIANCE_SCAN',
                from: filters.from,
                to: filters.to,
                limit: 20,
            }),
            this.auditService.verifyChain(tenantId),
        ]);
        const alertCounters = {
            [agent_alert_entity_1.AlertSeverity.HIGH]: 0,
            [agent_alert_entity_1.AlertSeverity.MEDIUM]: 0,
            [agent_alert_entity_1.AlertSeverity.LOW]: 0,
        };
        for (const alert of openAlerts) {
            alertCounters[alert.severity] += 1;
        }
        const shiftCounters = {
            pending: 0,
            validated: 0,
            published: 0,
        };
        for (const shift of shifts) {
            if (shift.status === 'PENDING')
                shiftCounters.pending += 1;
            if (shift.status === 'VALIDATED')
                shiftCounters.validated += 1;
            if (shift.status === 'PUBLISHED')
                shiftCounters.published += 1;
        }
        const latestPublicationLog = publicationLogs[0];
        const lastPublication = latestPublicationLog
            ? {
                timestamp: latestPublicationLog.timestamp,
                actorId: latestPublicationLog.actorId,
                blocked: Boolean(latestPublicationLog.details?.blocked),
                affected: latestPublicationLog.details?.affected || 0,
                totalPending: latestPublicationLog.details?.report?.totalPending,
                violations: latestPublicationLog.details?.report?.violations?.length || 0,
                warnings: latestPublicationLog.details?.report?.warnings?.length || 0,
            }
            : undefined;
        const failedScanLogs = complianceScanLogs.filter((log) => log.details?.status === 'FAILED' || Boolean(log.details?.error));
        const lastScanLog = complianceScanLogs[0];
        const complianceScanStatus = lastScanLog
            ? failedScanLogs.length > 0
                ? 'DEGRADED'
                : 'HEALTHY'
            : 'UNKNOWN';
        const reasons = [];
        if (alertCounters[agent_alert_entity_1.AlertSeverity.HIGH] > 0) {
            reasons.push('HIGH_ALERTS_OPEN');
        }
        if (lastPublication?.blocked) {
            reasons.push('LAST_PUBLICATION_BLOCKED');
        }
        if (!lastPublication) {
            reasons.push('NO_PUBLICATION_AUDIT_FOUND');
        }
        if (shiftCounters.pending > 0) {
            reasons.push('PENDING_SHIFTS_WAITING_PUBLICATION');
        }
        if (failedScanLogs.length > 0) {
            reasons.push('COMPLIANCE_SCAN_FAILURES');
        }
        if (!auditChain.valid) {
            reasons.push('AUDIT_CHAIN_INVALID');
        }
        let status = 'HEALTHY';
        if (alertCounters[agent_alert_entity_1.AlertSeverity.HIGH] > 0 ||
            lastPublication?.blocked ||
            failedScanLogs.length > 0 ||
            !auditChain.valid) {
            status = 'CRITICAL';
        }
        else if (!lastPublication || shiftCounters.pending > 0) {
            status = 'DEGRADED';
        }
        return {
            tenantId,
            generatedAt: new Date(),
            period: {
                from: filters.from,
                to: filters.to,
            },
            status,
            reasons,
            lastPublication,
            counters: {
                openAlerts: openAlerts.length,
                highAlerts: alertCounters[agent_alert_entity_1.AlertSeverity.HIGH],
                mediumAlerts: alertCounters[agent_alert_entity_1.AlertSeverity.MEDIUM],
                lowAlerts: alertCounters[agent_alert_entity_1.AlertSeverity.LOW],
                pendingShifts: shiftCounters.pending,
                validatedShifts: shiftCounters.validated,
                publishedShifts: shiftCounters.published,
                publicationAttempts: publicationLogs.length,
                refusedPublications: publicationLogs.filter((log) => Boolean(log.details?.blocked)).length,
                successfulPublications: publicationLogs.filter((log) => !Boolean(log.details?.blocked)).length,
            },
            audit: {
                chain: {
                    checkedAt: auditChain.checkedAt,
                    total: auditChain.total,
                    valid: auditChain.valid,
                    issues: auditChain.issues,
                },
            },
            jobs: {
                complianceScan: {
                    configured: true,
                    status: complianceScanStatus,
                    recentRuns: complianceScanLogs.length,
                    failedRuns: failedScanLogs.length,
                    lastRunAt: lastScanLog?.timestamp,
                },
            },
        };
    }
    async getManagerCockpit(tenantId, filters = {}) {
        const [summary, worklist, serviceIndicators, observability] = await Promise.all([
            this.getComplianceSummary(tenantId, filters),
            this.getManagerWorklist(tenantId, filters),
            this.getServiceComplianceIndicators(tenantId, filters),
            this.getProductionObservabilityHealth(tenantId, filters),
        ]);
        const weeklyOverloadAgents = serviceIndicators.services.reduce((total, service) => total + service.weeklyOverloadAgents, 0);
        const servicesUnderCovered = serviceIndicators.services.filter((service) => service.activeAgents > 0 && service.coverageRate < 80).length;
        const servicesWithOpenAlerts = serviceIndicators.services.filter((service) => service.openAlertsBySeverity[agent_alert_entity_1.AlertSeverity.HIGH] +
            service.openAlertsBySeverity[agent_alert_entity_1.AlertSeverity.MEDIUM] +
            service.openAlertsBySeverity[agent_alert_entity_1.AlertSeverity.LOW] >
            0).length;
        const priorityActions = worklist.items.slice(0, 5);
        return {
            tenantId,
            generatedAt: observability.generatedAt,
            period: {
                from: filters.from,
                to: filters.to,
            },
            status: observability.status,
            reasons: observability.reasons,
            counters: {
                openAlerts: summary.counters.openAlerts,
                highAlerts: summary.openAlertsBySeverity[agent_alert_entity_1.AlertSeverity.HIGH],
                mediumAlerts: summary.openAlertsBySeverity[agent_alert_entity_1.AlertSeverity.MEDIUM],
                lowAlerts: summary.openAlertsBySeverity[agent_alert_entity_1.AlertSeverity.LOW],
                blockedShifts: summary.counters.blockedShifts,
                agentsAtRisk: summary.counters.agentsAtRisk,
                weeklyOverloadAgents,
                pendingCorrections: worklist.total,
                refusedPublications: summary.counters.refusedPublications,
                pendingShifts: observability.counters.pendingShifts,
                validatedShifts: observability.counters.validatedShifts,
                publishedShifts: observability.counters.publishedShifts,
                servicesUnderCovered,
                servicesWithOpenAlerts,
            },
            summary,
            worklist,
            serviceIndicators,
            observability,
            priorityActions,
            recommendedActions: this.toManagerCockpitActions(priorityActions),
        };
    }
    async explainShiftCompliance(tenantId, shiftId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (!shift.agent?.id) {
            return {
                shift: this.getShiftAuditSnapshot(shift),
                validation: {
                    isValid: false,
                    blockingReasons: ['UNASSIGNED_SHIFT'],
                    warnings: [],
                    metadata: { status: shift.status },
                },
            };
        }
        const validation = await this.validateShift(tenantId, shift.agent.id, shift.start, shift.end, { excludeShiftId: shift.id });
        return {
            shift: this.getShiftAuditSnapshot(shift),
            validation,
        };
    }
    async approveShiftException(tenantId, actorId, shiftId, trace) {
        const decisionTrace = this.normalizeDecisionTrace(trace);
        const justification = decisionTrace.reason;
        if (!justification) {
            throw new common_1.BadRequestException('Compliance exception reason is required');
        }
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (!shift.agent?.id) {
            throw new common_1.BadRequestException('Cannot approve exception for an unassigned shift');
        }
        const validation = await this.validateShift(tenantId, shift.agent.id, shift.start, shift.end, {
            excludeShiftId: shift.id,
            skipAlertSync: true,
        });
        if (validation.isValid) {
            throw new common_1.BadRequestException('Cannot approve exception for a compliant shift');
        }
        const before = this.getShiftAuditSnapshot(shift);
        shift.complianceExceptionApproved = true;
        shift.complianceExceptionReason = justification;
        shift.complianceExceptionApprovedById = actorId;
        shift.complianceExceptionApprovedAt = new Date();
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'APPROVE_COMPLIANCE_EXCEPTION',
            reason: justification,
            actionManager: this.getActionManagerAuditContext(decisionTrace),
            validation,
            before,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        return savedShift;
    }
    async revalidateShift(tenantId, actorId, shiftId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        const validation = shift.agent?.id
            ? await this.validateShift(tenantId, shift.agent.id, shift.start, shift.end, {
                excludeShiftId: shift.id,
            })
            : {
                isValid: false,
                blockingReasons: ['UNASSIGNED_SHIFT'],
                warnings: [],
                metadata: { status: shift.status },
            };
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, shift.id, {
            action: 'REVALIDATE_SHIFT',
            validation,
            shift: this.getShiftAuditSnapshot(shift),
        });
        return {
            shift: this.getShiftAuditSnapshot(shift),
            validation,
        };
    }
    async reassignShift(tenantId, actorId, shiftId, agentId, trace) {
        const decisionTrace = this.normalizeDecisionTrace(trace);
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        const agent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['hospitalService', 'grade'],
        });
        if (!agent) {
            throw new common_1.NotFoundException('Agent not found');
        }
        const before = this.getShiftAuditSnapshot(shift);
        const validation = await this.validateShift(tenantId, agent.id, shift.start, shift.end, {
            excludeShiftId: shift.id,
        });
        if (!validation.isValid) {
            throw new common_1.BadRequestException(this.formatValidationFailure(validation));
        }
        shift.agent = agent;
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'REASSIGN_SHIFT',
            reason: decisionTrace.reason,
            actionManager: this.getActionManagerAuditContext(decisionTrace),
            previousAgentId: before.agentId,
            newAgentId: agent.id,
            validation,
            before,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        this.eventsGateway.broadcastPlanningUpdate();
        return savedShift;
    }
    async requestReplacement(tenantId, actorId, shiftId, trace) {
        const decisionTrace = this.normalizeDecisionTrace(trace);
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift) {
            throw new common_1.NotFoundException('Shift not found');
        }
        if (shift.start <= new Date()) {
            throw new common_1.BadRequestException('Cannot request replacement for a past shift');
        }
        if (shift.isSwapRequested) {
            throw new common_1.BadRequestException('Replacement already requested for this shift');
        }
        const before = this.getShiftAuditSnapshot(shift);
        shift.isSwapRequested = true;
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'REQUEST_REPLACEMENT',
            reason: decisionTrace.reason,
            actionManager: this.getActionManagerAuditContext(decisionTrace),
            before,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        this.eventsGateway.broadcastPlanningUpdate();
        return savedShift;
    }
    async resolvePlanningAlert(tenantId, actorId, alertId, trace) {
        const decisionTrace = this.normalizeDecisionTrace({
            ...trace,
            alertId: Number(alertId),
        });
        const alert = await this.alertRepository.findOne({
            where: { id: Number(alertId), tenantId },
        });
        if (!alert) {
            throw new common_1.NotFoundException('Agent alert not found');
        }
        alert.isResolved = true;
        alert.isAcknowledged = true;
        alert.resolvedAt = new Date();
        alert.resolutionReason = decisionTrace.reason;
        const savedAlert = await this.alertRepository.save(alert);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.AGENT, alert.agentId.toString(), {
            action: 'RESOLVE_PLANNING_ALERT',
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
            resolutionReason: alert.resolutionReason,
            actionManager: this.getActionManagerAuditContext(decisionTrace),
        });
        return savedAlert;
    }
    async getShiftApplications(tenantId) {
        return this.shiftApplicationRepository.find({
            where: { tenantId },
            relations: ['agent', 'shift', 'shift.facility'],
            order: { appliedAt: 'DESC' },
        });
    }
    async approveGhtApplication(tenantId, applicationId, actorId) {
        const application = await this.shiftApplicationRepository.findOne({
            where: { id: Number(applicationId), tenantId },
            relations: ['shift', 'agent'],
        });
        if (!application)
            throw new Error('Application not found');
        if (application.status !== shift_application_entity_1.ShiftApplicationStatus.PENDING_GHT_APPROVAL)
            throw new Error('Application is not pending GHT approval');
        application.status = shift_application_entity_1.ShiftApplicationStatus.ACCEPTED;
        const shift = await this.shiftRepository.findOne({
            where: { id: application.shift.id, tenantId },
        });
        if (shift) {
            shift.status = 'PUBLISHED';
            await this.shiftRepository.save(shift);
        }
        await this.shiftApplicationRepository.save(application);
        if (application.agent.telephone) {
            this.whatsappService
                .sendMessage(application.agent.telephone, `✅ Bonne nouvelle ! Le Superviseur RH GHT a validé votre déplacement pour la garde #${application.shift.id}. La garde vous est officiellement affectée.`)
                .catch(() => { });
        }
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, shift?.id || 0, { action: 'approve_ght' });
        this.eventsGateway.broadcastPlanningUpdate();
        await this.documentsService.generateContractForShift(tenantId, shift, application.agent);
        return application;
    }
    async rejectGhtApplication(tenantId, applicationId, actorId) {
        const application = await this.shiftApplicationRepository.findOne({
            where: { id: Number(applicationId), tenantId },
            relations: ['shift', 'agent'],
        });
        if (!application)
            throw new Error('Application not found');
        if (application.status !== shift_application_entity_1.ShiftApplicationStatus.PENDING_GHT_APPROVAL)
            throw new Error('Application is not pending GHT approval');
        application.status = shift_application_entity_1.ShiftApplicationStatus.REJECTED;
        const shift = await this.shiftRepository.findOne({
            where: { id: application.shift.id, tenantId },
        });
        if (shift) {
            shift.agent = null;
            shift.status = 'BROADCASTED_GHT';
            await this.shiftRepository.save(shift);
        }
        await this.shiftApplicationRepository.save(application);
        if (application.agent.telephone) {
            this.whatsappService
                .sendMessage(application.agent.telephone, `❌ Désolé, le Superviseur RH GHT a refusé la validation de votre déplacement pour la garde #${application.shift.id}.`)
                .catch(() => { });
        }
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, shift?.id || 0, { action: 'reject_ght' });
        this.eventsGateway.broadcastPlanningUpdate();
        return application;
    }
    async requestSwap(tenantId, shiftId, agentId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift)
            throw new common_1.NotFoundException('Shift not found');
        this.assertShiftCanEnterSwap(shift);
        if (!shift.agent || Number(shift.agent.id) !== Number(agentId)) {
            throw new common_1.BadRequestException('You can only request swaps for your own shifts');
        }
        if (shift.isSwapRequested) {
            throw new common_1.BadRequestException('Shift is already available for swap');
        }
        const before = this.getShiftAuditSnapshot(shift);
        shift.isSwapRequested = true;
        const savedShift = await this.shiftRepository.save(shift);
        await this.auditService.log(tenantId, agentId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'REQUEST_SWAP',
            before,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        this.eventsGateway.broadcastPlanningUpdate();
        return savedShift;
    }
    async getAvailableSwaps(tenantId, agentId) {
        const currentAgent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['hospitalService', 'grade'],
        });
        if (!currentAgent)
            throw new Error('Agent introuvable');
        const query = this.shiftRepository
            .createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .leftJoinAndSelect('shift.facility', 'facility')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.isSwapRequested = :isSwapRequested', {
            isSwapRequested: true,
        })
            .andWhere('shift.start > :now', { now: new Date() })
            .andWhere('shift.agent.id != :agentId', { agentId });
        if (currentAgent.grade?.name?.toUpperCase() !== 'MDECIN' &&
            currentAgent.grade?.name?.toUpperCase() !== 'MEDECIN') {
            query.andWhere('agent.hospitalServiceId = :hospitalServiceId', {
                hospitalServiceId: currentAgent.hospitalServiceId,
            });
        }
        return query.getMany();
    }
    async applyForSwap(tenantId, shiftId, agentId) {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent'],
        });
        if (!shift)
            throw new common_1.NotFoundException('Shift not found');
        this.assertShiftCanEnterSwap(shift);
        if (!shift.isSwapRequested) {
            throw new common_1.BadRequestException('Shift is not available for swap');
        }
        if (!shift.agent) {
            throw new common_1.BadRequestException('Cannot swap an unassigned shift');
        }
        if (Number(shift.agent.id) === Number(agentId)) {
            throw new common_1.BadRequestException('You cannot apply to your own swap');
        }
        const applyingAgent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
        });
        if (!applyingAgent)
            throw new common_1.NotFoundException('Agent not found');
        const validation = await this.validateShift(tenantId, agentId, shift.start, shift.end, { excludeShiftId: Number(shiftId) });
        if (!validation.isValid) {
            throw new common_1.BadRequestException(this.formatValidationFailure(validation));
        }
        const formerAgent = shift.agent;
        const before = this.getShiftAuditSnapshot(shift);
        shift.agent = applyingAgent;
        shift.isSwapRequested = false;
        const savedShift = await this.shiftRepository.save(shift);
        if (formerAgent?.telephone) {
            Promise.resolve(this.whatsappService.sendMessage(formerAgent.telephone, `✅ Bonne nouvelle ! Votre garde du ${shift.start.toLocaleDateString()} a été reprise par ${applyingAgent.nom} via la Bourse d'Échange.`)).catch(() => { });
        }
        await this.auditService.log(tenantId, agentId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.SHIFT, savedShift.id, {
            action: 'APPLY_SWAP',
            formerAgentId: formerAgent.id,
            newAgentId: applyingAgent.id,
            validation,
            before,
            after: this.getShiftAuditSnapshot(savedShift),
        });
        this.eventsGateway.broadcastPlanningUpdate();
        return {
            success: true,
            message: 'Échange auto-validé ! La garde a été ajoutée à votre planning.',
        };
    }
    getAuditBusinessAction(log) {
        return log.details?.action || log.action || 'UNKNOWN';
    }
    normalizeDecisionTrace(trace) {
        const normalized = typeof trace === 'string' ? { reason: trace } : { ...trace };
        const reason = normalized.reason?.trim();
        if (!reason) {
            throw new common_1.BadRequestException('Decision justification is required for this manager action');
        }
        return {
            reason,
            recommendationId: normalized.recommendationId?.trim() || undefined,
            alertId: normalized.alertId,
        };
    }
    getActionManagerAuditContext(trace) {
        return {
            recommendationId: trace.recommendationId,
            alertId: trace.alertId,
            justification: trace.reason,
        };
    }
    matchesTimelineFilters(log, filters) {
        if (filters.agentId !== undefined &&
            !this.auditLogInvolvesAgent(log, filters.agentId)) {
            return false;
        }
        if (filters.shiftId !== undefined &&
            !this.auditLogInvolvesShift(log, filters.shiftId)) {
            return false;
        }
        return true;
    }
    matchesTimelineAlertFilters(alert, filters) {
        if (filters.from && alert.createdAt < filters.from)
            return false;
        if (filters.to && alert.createdAt > filters.to)
            return false;
        if (filters.agentId !== undefined &&
            Number(alert.agentId) !== filters.agentId) {
            return false;
        }
        if (filters.shiftId !== undefined &&
            Number(alert.metadata?.shiftId) !== filters.shiftId) {
            return false;
        }
        return true;
    }
    auditLogInvolvesAgent(log, agentId) {
        const details = log.details || {};
        const numericEntityId = Number(log.entityId);
        if (log.entityType === audit_log_entity_1.AuditEntityType.AGENT &&
            Number.isFinite(numericEntityId) &&
            numericEntityId === agentId) {
            return true;
        }
        const candidateIds = [
            details.agentId,
            details.requestedBy,
            details.previousAgentId,
            details.newAgentId,
            details.formerAgentId,
            details.before?.agentId,
            details.after?.agentId,
            details.shift?.agentId,
        ];
        if (candidateIds.some((id) => Number(id) === agentId)) {
            return true;
        }
        const report = details.report;
        return [...(report?.violations || []), ...(report?.warnings || [])].some((item) => Number(item?.agentId) === agentId);
    }
    auditLogInvolvesShift(log, shiftId) {
        const details = log.details || {};
        const numericEntityId = Number(log.entityId);
        if (log.entityType === audit_log_entity_1.AuditEntityType.SHIFT &&
            Number.isFinite(numericEntityId) &&
            numericEntityId === shiftId) {
            return true;
        }
        const candidateIds = [
            details.shift?.id,
            details.before?.id,
            details.after?.id,
        ];
        if (candidateIds.some((id) => Number(id) === shiftId)) {
            return true;
        }
        const report = details.report;
        return ((report?.validatedShiftIds || []).some((id) => Number(id) === shiftId) ||
            [...(report?.violations || []), ...(report?.warnings || [])].some((item) => Number(item?.shiftId) === shiftId));
    }
    toPlanningTimelineItem(log) {
        const action = this.getAuditBusinessAction(log);
        return {
            id: log.id,
            timestamp: log.timestamp,
            actorId: log.actorId,
            action,
            entity: {
                type: log.entityType,
                id: log.entityId,
            },
            label: this.getTimelineLabel(action, log.details),
            status: this.getTimelineStatus(action, log.details),
            severity: this.getTimelineSeverity(action, log.details),
            details: this.summarizeTimelineDetails(action, log.details || {}),
        };
    }
    toPlanningAlertTimelineItem(alert) {
        const ruleCode = this.extractAlertRuleCode(alert);
        return {
            id: `alert:${alert.id}`,
            timestamp: alert.createdAt,
            action: 'ALERT_CREATED',
            entity: {
                type: 'ALERT',
                id: alert.id.toString(),
            },
            label: alert.message,
            status: alert.isResolved ? 'RESOLVED' : 'OPEN',
            severity: alert.severity,
            details: {
                alertId: alert.id,
                agentId: alert.agentId,
                shiftId: alert.metadata?.shiftId,
                ruleCode,
                recommendationId: ruleCode
                    ? this.getRecommendationId({
                        source: 'ALERT',
                        alertId: alert.id,
                        agentId: alert.agentId,
                        ruleCode,
                    })
                    : undefined,
            },
        };
    }
    getTimelineLabel(action, details) {
        const labels = {
            CREATE_SHIFT: 'Garde créée',
            ASSIGN_REPLACEMENT: 'Remplacement assigné',
            UPDATE_SHIFT: 'Garde modifiée',
            REASSIGN_SHIFT: 'Garde réassignée',
            REQUEST_REPLACEMENT: 'Remplacement demandé',
            APPROVE_COMPLIANCE_EXCEPTION: 'Exception de conformité approuvée',
            REVALIDATE_SHIFT: 'Garde revalidée',
            PUBLISH_PLANNING: details?.blocked
                ? 'Publication planning refusée'
                : 'Planning publié',
            RESOLVE_PLANNING_ALERT: 'Alerte conformité résolue',
            REQUEST_SWAP: 'Échange de garde demandé',
            APPLY_SWAP: 'Échange de garde appliqué',
            COMPLIANCE_SCAN: 'Scan conformité exécuté',
        };
        return labels[action] || action;
    }
    getTimelineStatus(action, details) {
        if (action === 'PUBLISH_PLANNING') {
            return details?.blocked ? 'BLOCKED' : 'SUCCESS';
        }
        if (action === 'COMPLIANCE_SCAN') {
            return details?.status || (details?.error ? 'FAILED' : 'SUCCESS');
        }
        if (details?.validation) {
            return details.validation.isValid ? 'VALID' : 'BLOCKED';
        }
        if (action === 'APPROVE_COMPLIANCE_EXCEPTION')
            return 'APPROVED';
        if (action === 'RESOLVE_PLANNING_ALERT')
            return 'RESOLVED';
        if (['REQUEST_REPLACEMENT', 'REQUEST_SWAP'].includes(action)) {
            return 'REQUESTED';
        }
        if (['REASSIGN_SHIFT', 'APPLY_SWAP', 'ASSIGN_REPLACEMENT'].includes(action)) {
            return 'CORRECTED';
        }
        return undefined;
    }
    getTimelineSeverity(action, details) {
        if (details?.severity &&
            Object.values(agent_alert_entity_1.AlertSeverity).includes(details.severity)) {
            return details.severity;
        }
        if (action === 'PUBLISH_PLANNING' && details?.blocked) {
            return agent_alert_entity_1.AlertSeverity.HIGH;
        }
        if (action === 'COMPLIANCE_SCAN' &&
            (details?.status === 'FAILED' || details?.error)) {
            return agent_alert_entity_1.AlertSeverity.HIGH;
        }
        if (details?.validation?.isValid === false) {
            return agent_alert_entity_1.AlertSeverity.HIGH;
        }
        if (action === 'APPROVE_COMPLIANCE_EXCEPTION') {
            return agent_alert_entity_1.AlertSeverity.MEDIUM;
        }
        return undefined;
    }
    summarizeTimelineDetails(action, details) {
        if (action === 'PUBLISH_PLANNING') {
            return {
                blocked: Boolean(details.blocked),
                affected: details.affected || 0,
                totalPending: details.report?.totalPending,
                validatedShifts: details.report?.validatedShiftIds?.length || 0,
                violations: details.report?.violations?.length || 0,
                warnings: details.report?.warnings?.length || 0,
            };
        }
        if (action === 'REASSIGN_SHIFT' || action === 'APPLY_SWAP') {
            return this.omitUndefined({
                previousAgentId: details.previousAgentId || details.formerAgentId,
                newAgentId: details.newAgentId,
                reason: details.reason,
                actionManager: details.actionManager,
                validation: this.summarizeValidation(details.validation),
            });
        }
        if (action === 'REVALIDATE_SHIFT') {
            return {
                shiftId: details.shift?.id,
                validation: this.summarizeValidation(details.validation),
            };
        }
        if (action === 'APPROVE_COMPLIANCE_EXCEPTION') {
            return this.omitUndefined({
                reason: details.reason,
                actionManager: details.actionManager,
                validation: this.summarizeValidation(details.validation),
            });
        }
        if (action === 'REQUEST_REPLACEMENT') {
            return this.omitUndefined({
                reason: details.reason,
                actionManager: details.actionManager,
                previousAgentId: details.before?.agentId,
            });
        }
        if (action === 'RESOLVE_PLANNING_ALERT') {
            return this.omitUndefined({
                alertId: details.alertId,
                type: details.type,
                severity: details.severity,
                resolutionReason: details.resolutionReason,
                actionManager: details.actionManager,
            });
        }
        if (action === 'COMPLIANCE_SCAN') {
            return {
                status: details.status,
                error: details.error,
            };
        }
        return {
            before: details.before,
            after: details.after,
        };
    }
    summarizeValidation(validation) {
        if (!validation)
            return undefined;
        return {
            isValid: validation.isValid,
            blockingReasons: validation.blockingReasons,
            warnings: validation.warnings,
        };
    }
    omitUndefined(details) {
        return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));
    }
    assertShiftCanEnterSwap(shift) {
        if (shift.start <= new Date()) {
            throw new common_1.BadRequestException('Cannot swap a past shift');
        }
        if (!['VALIDATED', 'PUBLISHED'].includes(shift.status)) {
            throw new common_1.BadRequestException('Shift status does not allow swaps');
        }
    }
    assertValidShiftDates(start, end) {
        if (!(start instanceof Date) ||
            Number.isNaN(start.getTime()) ||
            !(end instanceof Date) ||
            Number.isNaN(end.getTime())) {
            throw new common_1.BadRequestException('Invalid shift dates');
        }
        if (start >= end) {
            throw new common_1.BadRequestException('Shift start must be before shift end');
        }
    }
    formatValidationFailure(validation) {
        return `Shift validation failed: ${validation.blockingReasons.join(', ')}`;
    }
    extractAlertRuleCode(alert) {
        const ruleCode = alert.metadata?.ruleCode;
        if (Object.values(compliance_validation_types_1.ComplianceRuleCode).includes(ruleCode)) {
            return ruleCode;
        }
        return null;
    }
    getShiftCorrectionActions(shift, validation) {
        const actionCodes = this.getRecommendedActionsForRules(validation.blockingReasons, Boolean(shift.agent?.id));
        const actions = [];
        if (actionCodes.includes('REASSIGN_SHIFT')) {
            actions.push({
                code: 'REASSIGN_SHIFT',
                label: 'Réassigner le shift',
                description: 'Teste un nouvel agent avec la validation conformité stricte avant mutation.',
                permissions: ['planning:write'],
                method: 'POST',
                endpoint: `/planning/shifts/${shift.id}/reassign`,
                body: {
                    agentId: {
                        type: 'number',
                        required: true,
                    },
                    reason: {
                        type: 'string',
                        required: true,
                    },
                    recommendationId: {
                        type: 'string',
                        required: false,
                    },
                    alertId: {
                        type: 'number',
                        required: false,
                    },
                },
            });
        }
        if (actionCodes.includes('REQUEST_REPLACEMENT') &&
            shift.start > new Date() &&
            !shift.isSwapRequested) {
            actions.push({
                code: 'REQUEST_REPLACEMENT',
                label: 'Demander un remplacement',
                description: 'Ouvre une demande de remplacement sans contourner la conformité.',
                permissions: ['planning:write'],
                method: 'POST',
                endpoint: `/planning/shifts/${shift.id}/request-replacement`,
                body: {
                    reason: {
                        type: 'string',
                        required: true,
                    },
                    recommendationId: {
                        type: 'string',
                        required: false,
                    },
                    alertId: {
                        type: 'number',
                        required: false,
                    },
                },
            });
        }
        if (actionCodes.includes('APPROVE_EXCEPTION') ||
            (!validation.isValid && shift.agent?.id)) {
            if (!this.hasApprovedComplianceException(shift)) {
                actions.push({
                    code: 'APPROVE_EXCEPTION',
                    label: 'Autoriser une exception',
                    description: 'Autorise une exception contrôlée avec justification et audit fort.',
                    permissions: ['planning:exception'],
                    method: 'POST',
                    endpoint: `/planning/shifts/${shift.id}/exception`,
                    body: {
                        reason: {
                            type: 'string',
                            required: true,
                        },
                        recommendationId: {
                            type: 'string',
                            required: false,
                        },
                        alertId: {
                            type: 'number',
                            required: false,
                        },
                    },
                });
            }
        }
        actions.push({
            code: 'REVALIDATE_SHIFT',
            label: 'Relancer la validation',
            description: 'Rejoue la validation structurée après correction ou changement de contexte.',
            permissions: ['planning:write'],
            method: 'POST',
            endpoint: `/planning/shifts/${shift.id}/revalidate`,
        });
        return actions;
    }
    getSeverityRank(severity) {
        return ({
            [agent_alert_entity_1.AlertSeverity.HIGH]: 3,
            [agent_alert_entity_1.AlertSeverity.MEDIUM]: 2,
            [agent_alert_entity_1.AlertSeverity.LOW]: 1,
        }[severity] || 0);
    }
    getShiftDurationHours(shift) {
        return Math.max(0, (new Date(shift.end).getTime() - new Date(shift.start).getTime()) /
            (1000 * 60 * 60));
    }
    createValidationBatchCache() {
        return {
            agents: new Map(),
            constraints: new Map(),
            mandatoryHealthRecords: new Map(),
            mandatoryCompetencies: new Map(),
            weeklyHours: new Map(),
            tenantWeeklyLimits: new Map(),
        };
    }
    toManagerCockpitActions(items) {
        if (items.length === 0) {
            return [
                {
                    type: 'PUBLISH_PLANNING',
                    label: 'Publier le planning',
                    endpoint: {
                        method: 'POST',
                        path: '/planning/publish',
                    },
                },
            ];
        }
        return items.flatMap((item) => {
            const actions = [
                {
                    type: 'OPEN_WORKLIST',
                    label: 'Ouvrir le problème',
                    shiftId: item.shiftId,
                    alertId: item.alertId,
                    endpoint: {
                        method: 'GET',
                        path: item.shiftId
                            ? `/planning/shifts/${item.shiftId}/compliance`
                            : '/planning/compliance/worklist',
                    },
                },
            ];
            if (item.shiftId) {
                actions.push({
                    type: 'REASSIGN_SHIFT',
                    label: 'Réassigner le shift',
                    shiftId: item.shiftId,
                    endpoint: {
                        method: 'POST',
                        path: `/planning/shifts/${item.shiftId}/reassign`,
                    },
                }, {
                    type: 'REQUEST_REPLACEMENT',
                    label: 'Demander un remplacement',
                    shiftId: item.shiftId,
                    endpoint: {
                        method: 'POST',
                        path: `/planning/shifts/${item.shiftId}/request-replacement`,
                    },
                }, {
                    type: 'REVALIDATE_SHIFT',
                    label: 'Relancer la validation',
                    shiftId: item.shiftId,
                    endpoint: {
                        method: 'POST',
                        path: `/planning/shifts/${item.shiftId}/revalidate`,
                    },
                });
            }
            if (item.alertId) {
                actions.push({
                    type: 'OPEN_WORKLIST',
                    label: "Traiter l'alerte",
                    alertId: item.alertId,
                    endpoint: {
                        method: 'PATCH',
                        path: `/planning/alerts/${item.alertId}/resolve`,
                    },
                });
            }
            return actions;
        });
    }
    getManagerWorklistCounters(items) {
        return items.reduce((acc, item) => {
            acc[item.category] += 1;
            return acc;
        }, {
            REST_INSUFFICIENT: 0,
            WEEKLY_OVERLOAD: 0,
            MISSING_COMPETENCY: 0,
            LEAVE_CONFLICT: 0,
        });
    }
    async buildPublishPlanningReport(tenantId, start, end, options = {}) {
        this.assertValidShiftDates(start, end);
        const pendingShifts = await this.shiftRepository.find({
            where: {
                tenantId,
                status: 'PENDING',
                start: (0, typeorm_2.MoreThanOrEqual)(start),
                end: (0, typeorm_2.LessThanOrEqual)(end),
            },
            relations: ['agent'],
        });
        const report = {
            start,
            end,
            publishable: true,
            totalPending: pendingShifts.length,
            validatedShiftIds: [],
            violations: [],
            warnings: [],
            recommendations: [],
        };
        const recommendations = new Set();
        const validationBatchCache = this.createValidationBatchCache();
        for (const shift of pendingShifts) {
            const agentId = shift.agent?.id;
            if (!agentId) {
                const blockingReasons = ['UNASSIGNED_SHIFT'];
                report.violations.push({
                    shiftId: shift.id,
                    blockingReasons,
                    metadata: { status: shift.status },
                });
                this.addPublishPlanningRecommendations(recommendations, blockingReasons);
                continue;
            }
            const validation = await this.validateShift(tenantId, agentId, shift.start, shift.end, {
                excludeShiftId: shift.id,
                skipAlertSync: options.skipAlertSync,
                batchCache: validationBatchCache,
            });
            if (!validation.isValid) {
                this.addPublishPlanningRecommendations(recommendations, validation.blockingReasons);
                if (this.hasApprovedComplianceException(shift)) {
                    report.validatedShiftIds.push(shift.id);
                    report.warnings.push({
                        shiftId: shift.id,
                        agentId,
                        warnings: validation.blockingReasons,
                        metadata: {
                            ...validation.metadata,
                            complianceException: this.getComplianceExceptionSnapshot(shift),
                        },
                    });
                    continue;
                }
                report.violations.push({
                    shiftId: shift.id,
                    agentId,
                    blockingReasons: validation.blockingReasons,
                    metadata: validation.metadata,
                });
                continue;
            }
            report.validatedShiftIds.push(shift.id);
            if (validation.warnings.length > 0) {
                report.warnings.push({
                    shiftId: shift.id,
                    agentId,
                    warnings: validation.warnings,
                    metadata: validation.metadata,
                });
                this.addPublishPlanningRecommendations(recommendations, validation.warnings);
            }
        }
        report.publishable = report.violations.length === 0;
        report.recommendations = [...recommendations];
        return { pendingShifts, report };
    }
    addPublishPlanningRecommendations(recommendations, reasons) {
        for (const reason of reasons) {
            recommendations.add(this.getPublishPlanningRecommendation(reason));
        }
    }
    getPublishPlanningRecommendation(reason) {
        const recommendations = {
            UNASSIGNED_SHIFT: 'Assigner un agent au shift avant de relancer la pré-publication.',
            [compliance_validation_types_1.ComplianceRuleCode.SHIFT_OVERLAP]: 'Réassigner ou déplacer le shift en chevauchement.',
            [compliance_validation_types_1.ComplianceRuleCode.APPROVED_LEAVE_OVERLAP]: 'Choisir un remplaçant disponible ou déplacer le shift conflictuel avec un congé approuvé.',
            [compliance_validation_types_1.ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT]: 'Respecter le repos minimum avant garde ou approuver une exception justifiée.',
            [compliance_validation_types_1.ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT]: 'Respecter le repos minimum après garde ou approuver une exception justifiée.',
            [compliance_validation_types_1.ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: 'Répartir la charge sur un autre agent ou approuver une exception contrôlée.',
            [compliance_validation_types_1.ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED]: 'Affecter un agent disposant des compétences obligatoires.',
            [compliance_validation_types_1.ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED]: 'Mettre à jour les certificats obligatoires avant publication.',
            [compliance_validation_types_1.ComplianceRuleCode.MAX_GUARD_DURATION_EXCEEDED]: 'Réduire la durée de garde ou adapter la politique applicable.',
        };
        return (recommendations[reason] ||
            'Corriger la violation de conformité puis relancer la pré-publication.');
    }
    toDecisionRecommendation(item) {
        const priority = this.getSeverityRank(item.severity) * 100 +
            this.getCategoryPriority(item.category);
        return {
            id: this.getRecommendationId(item),
            priority,
            category: item.category,
            severity: item.severity,
            title: item.title,
            rationale: this.getRecommendationRationale(item),
            ruleCode: item.ruleCode,
            agentId: item.agentId,
            shiftId: item.shiftId,
            alertId: item.alertId,
            dueAt: item.dueAt || item.detectedAt,
            recommendedActions: this.getRecommendedActionsForRules([item.ruleCode], Boolean(item.agentId)),
            metadata: item.metadata,
        };
    }
    getRecommendationId(item) {
        const target = item.alertId
            ? `alert:${item.alertId}`
            : item.shiftId
                ? `shift:${item.shiftId}`
                : `agent:${item.agentId || 'unknown'}`;
        return `recommendation:${item.source.toLowerCase()}:${target}:${item.ruleCode}`;
    }
    getCategoryPriority(category) {
        return ({
            LEAVE_CONFLICT: 40,
            REST_INSUFFICIENT: 30,
            WEEKLY_OVERLOAD: 20,
            MISSING_COMPETENCY: 10,
        }[category] || 0);
    }
    getRecommendationRationale(item) {
        if (item.category === 'LEAVE_CONFLICT') {
            return 'Conflit avec un congé approuvé: corriger avant publication pour éviter une affectation impossible.';
        }
        if (item.category === 'REST_INSUFFICIENT') {
            return 'Repos réglementaire insuffisant: privilégier une réassignation ou une demande de remplacement.';
        }
        if (item.category === 'WEEKLY_OVERLOAD') {
            return 'Charge hebdomadaire dépassée: rééquilibrer le shift vers un agent disponible.';
        }
        return 'Compétence obligatoire manquante: vérifier le dossier agent ou réassigner vers un agent habilité.';
    }
    getRecommendedActionsForRules(ruleCodes, hasAssignedAgent) {
        const actions = new Set();
        if (!hasAssignedAgent) {
            actions.add('REASSIGN_SHIFT');
            actions.add('REVALIDATE_SHIFT');
        }
        for (const ruleCode of ruleCodes) {
            if ([
                compliance_validation_types_1.ComplianceRuleCode.APPROVED_LEAVE_OVERLAP,
                compliance_validation_types_1.ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
                compliance_validation_types_1.ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT,
                compliance_validation_types_1.ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
                compliance_validation_types_1.ComplianceRuleCode.SHIFT_OVERLAP,
            ].includes(ruleCode)) {
                actions.add('REASSIGN_SHIFT');
                actions.add('REQUEST_REPLACEMENT');
            }
            if ([
                compliance_validation_types_1.ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED,
                compliance_validation_types_1.ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED,
                compliance_validation_types_1.ComplianceRuleCode.AGENT_INACTIVE,
            ].includes(ruleCode)) {
                actions.add('REVIEW_AGENT_FILE');
                actions.add('REASSIGN_SHIFT');
            }
        }
        actions.add('REVALIDATE_SHIFT');
        return Array.from(actions);
    }
    toShiftReplacementSuggestion(agent, ruleCodes, shift) {
        const reasons = ['AVAILABLE_FOR_SHIFT'];
        let score = 70;
        if (agent.id !== shift.agentId) {
            score += 10;
            reasons.push('DIFFERENT_AGENT');
        }
        if (ruleCodes.includes(compliance_validation_types_1.ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED) &&
            agent.agentCompetencies?.length) {
            score += 15;
            reasons.push('HAS_RELEVANT_COMPETENCY');
        }
        if (agent.hospitalServiceId) {
            score += 5;
            reasons.push('HAS_SERVICE_ASSIGNMENT');
        }
        return {
            agentId: agent.id,
            displayName: agent.nom ||
                [agent.firstName, agent.lastName].filter(Boolean).join(' ') ||
                `Agent #${agent.id}`,
            jobTitle: agent.jobTitle,
            hospitalServiceId: agent.hospitalServiceId,
            score,
            reasons,
        };
    }
    hasApprovedComplianceException(shift) {
        return Boolean(shift.complianceExceptionApproved &&
            shift.complianceExceptionReason &&
            shift.complianceExceptionApprovedById &&
            shift.complianceExceptionApprovedAt);
    }
    getComplianceExceptionSnapshot(shift) {
        return {
            approved: shift.complianceExceptionApproved,
            reason: shift.complianceExceptionReason,
            approvedById: shift.complianceExceptionApprovedById,
            approvedAt: shift.complianceExceptionApprovedAt,
        };
    }
    getShiftAuditSnapshot(shift) {
        return {
            id: shift.id,
            tenantId: shift.tenantId,
            agentId: shift.agent?.id,
            start: shift.start,
            end: shift.end,
            postId: shift.postId,
            type: shift.type,
            status: shift.status,
            facilityId: shift.facilityId,
            complianceException: this.getComplianceExceptionSnapshot(shift),
        };
    }
};
exports.PlanningService = PlanningService;
exports.PlanningService = PlanningService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(1, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(2, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(3, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __param(4, (0, typeorm_1.InjectRepository)(agent_alert_entity_1.AgentAlert)),
    __param(5, (0, typeorm_1.InjectRepository)(shift_application_entity_1.ShiftApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        whatsapp_service_1.WhatsappService,
        events_gateway_1.EventsGateway,
        documents_service_1.DocumentsService,
        compliance_validation_service_1.ComplianceValidationService])
], PlanningService);
//# sourceMappingURL=planning.service.js.map