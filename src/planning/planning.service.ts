import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Shift, ShiftType } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  ShiftApplication,
  ShiftApplicationStatus,
} from './entities/shift-application.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventsGateway } from '../events/events.gateway';
import { DocumentsService } from '../documents/documents.service';
import {
  ComplianceValidationService,
  ShiftValidationOptions,
  ShiftValidationResult,
} from './compliance-validation.service';
import {
  AgentAlert,
  AlertSeverity,
} from '../agents/entities/agent-alert.entity';
import {
  ComplianceRuleCode,
  ShiftValidationBatchCache,
} from './compliance-validation.types';

export type {
  ShiftValidationOptions,
  ShiftValidationResult,
} from './compliance-validation.service';

export interface CreateShiftInput {
  agentId: number;
  start: Date;
  end: Date;
  postId: string;
  type?: ShiftType;
  facilityId?: number;
}

export interface PublishPlanningViolation {
  shiftId: number;
  agentId?: number;
  blockingReasons: string[];
  metadata: Record<string, unknown>;
}

export interface PublishPlanningWarning {
  shiftId: number;
  agentId?: number;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface PublishPlanningReport {
  start: Date;
  end: Date;
  publishable: boolean;
  totalPending: number;
  validatedShiftIds: number[];
  violations: PublishPlanningViolation[];
  warnings: PublishPlanningWarning[];
  recommendations: string[];
}

export interface PublishPlanningResult {
  message: string;
  affected: number;
  report: PublishPlanningReport;
}

export interface PublishPlanningPreviewResult {
  publishable: boolean;
  report: PublishPlanningReport;
}

export interface ComplianceReportFilters {
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface PlanningComplianceTimelineFilters extends ComplianceReportFilters {
  agentId?: number;
  shiftId?: number;
}

export interface PlanningComplianceTimelineItem {
  id: number;
  timestamp: Date;
  actorId: number;
  action: string;
  entity: {
    type: AuditEntityType;
    id?: string;
  };
  label: string;
  status?: string;
  severity?: AlertSeverity;
  details: Record<string, unknown>;
}

export interface PlanningComplianceTimeline {
  tenantId: string;
  period: {
    from?: Date;
    to?: Date;
  };
  filters: {
    agentId?: number;
    shiftId?: number;
  };
  total: number;
  items: PlanningComplianceTimelineItem[];
}

export interface ComplianceSummaryFilters {
  from?: Date;
  to?: Date;
}

export interface ComplianceSummaryBlockedShift {
  shiftId: number;
  agentId?: number;
  blockingReasons: string[];
}

export interface ComplianceSummary {
  tenantId: string;
  period: {
    from?: Date;
    to?: Date;
  };
  counters: {
    openAlerts: number;
    blockedShifts: number;
    agentsAtRisk: number;
    refusedPublications: number;
  };
  openAlertsBySeverity: Record<AlertSeverity, number>;
  blockedShiftPreview: ComplianceSummaryBlockedShift[];
}

export type ManagerWorklistCategory =
  | 'REST_INSUFFICIENT'
  | 'WEEKLY_OVERLOAD'
  | 'MISSING_COMPETENCY'
  | 'LEAVE_CONFLICT';
export type ManagerWorklistSource = 'ALERT' | 'SHIFT_VALIDATION';

export interface ManagerWorklistItem {
  id: string;
  category: ManagerWorklistCategory;
  source: ManagerWorklistSource;
  severity: AlertSeverity;
  agentId?: number;
  shiftId?: number;
  alertId?: number;
  title: string;
  ruleCode: ComplianceRuleCode;
  detectedAt?: Date;
  dueAt?: Date;
  metadata?: unknown;
}

export interface ManagerWorklist {
  tenantId: string;
  period: {
    from?: Date;
    to?: Date;
  };
  total: number;
  counters: Record<ManagerWorklistCategory, number>;
  items: ManagerWorklistItem[];
}

export type DecisionRecommendationAction =
  | 'REASSIGN_SHIFT'
  | 'REQUEST_REPLACEMENT'
  | 'APPROVE_EXCEPTION'
  | 'REVALIDATE_SHIFT'
  | 'REVIEW_AGENT_FILE';

export interface DecisionRecommendation {
  id: string;
  priority: number;
  category: ManagerWorklistCategory;
  severity: AlertSeverity;
  title: string;
  rationale: string;
  ruleCode: ComplianceRuleCode;
  agentId?: number;
  shiftId?: number;
  alertId?: number;
  dueAt?: Date;
  recommendedActions: DecisionRecommendationAction[];
  metadata?: unknown;
}

export interface DecisionRecommendations {
  tenantId: string;
  period: {
    from?: Date;
    to?: Date;
  };
  total: number;
  recommendations: DecisionRecommendation[];
}

export interface ShiftReplacementSuggestion {
  agentId: number;
  displayName: string;
  jobTitle?: string;
  hospitalServiceId?: number;
  score: number;
  reasons: string[];
}

export interface ShiftDecisionSuggestions {
  shift: Record<string, unknown>;
  validation: ShiftValidationResult;
  recommendedActions: DecisionRecommendationAction[];
  replacements: ShiftReplacementSuggestion[];
}

export interface ServiceComplianceIndicator {
  serviceId: number;
  serviceName: string;
  serviceCode?: string;
  activeAgents: number;
  plannedShifts: number;
  validatedOrPublishedShifts: number;
  pendingShifts: number;
  coverageRate: number;
  weeklyOverloadAgents: number;
  publishedComplianceRate: number;
  exceptionsApproved: number;
  openAlertsBySeverity: Record<AlertSeverity, number>;
}

export interface ServiceComplianceIndicators {
  tenantId: string;
  period: {
    from?: Date;
    to?: Date;
  };
  services: ServiceComplianceIndicator[];
}

export type ProductionObservabilityStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'UNKNOWN';

export interface ProductionObservabilityHealth {
  tenantId: string;
  generatedAt: Date;
  period: {
    from?: Date;
    to?: Date;
  };
  status: ProductionObservabilityStatus;
  reasons: string[];
  lastPublication?: {
    timestamp: Date;
    actorId: number;
    blocked: boolean;
    affected: number;
    totalPending?: number;
    violations: number;
    warnings: number;
  };
  counters: {
    openAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    pendingShifts: number;
    validatedShifts: number;
    publishedShifts: number;
    publicationAttempts: number;
    refusedPublications: number;
    successfulPublications: number;
  };
  jobs: {
    complianceScan: {
      configured: boolean;
      status: ProductionObservabilityStatus;
      recentRuns: number;
      failedRuns: number;
      lastRunAt?: Date;
    };
  };
}

export type CorrectionProblemType = 'SHIFT' | 'ALERT';

export type CorrectionActionCode =
  | 'REASSIGN_SHIFT'
  | 'REQUEST_REPLACEMENT'
  | 'APPROVE_EXCEPTION'
  | 'REVALIDATE_SHIFT'
  | 'RESOLVE_ALERT';

export interface CorrectionAction {
  code: CorrectionActionCode;
  label: string;
  description: string;
  permissions: string[];
  method: 'POST' | 'PATCH';
  endpoint: string;
  body?: Record<string, unknown>;
}

export interface CorrectionGuidanceProblem {
  type: CorrectionProblemType;
  id: number;
  title: string;
  severity?: AlertSeverity;
  agentId?: number;
  shiftId?: number;
  alertId?: number;
  status?: string;
  detectedAt?: Date;
  metadata?: unknown;
}

export interface CorrectionGuidance {
  tenantId: string;
  problem: CorrectionGuidanceProblem;
  reasons: ComplianceRuleCode[] | string[];
  validation?: ShiftValidationResult;
  availableActions: CorrectionAction[];
}

export interface ManagerCockpitAction {
  type:
    | 'OPEN_WORKLIST'
    | 'REASSIGN_SHIFT'
    | 'REQUEST_REPLACEMENT'
    | 'APPROVE_EXCEPTION'
    | 'REVALIDATE_SHIFT'
    | 'PUBLISH_PLANNING';
  label: string;
  shiftId?: number;
  alertId?: number;
  endpoint?: Record<string, unknown>;
}

export interface ManagerCockpit {
  tenantId: string;
  generatedAt: Date;
  period: {
    from?: Date;
    to?: Date;
  };
  status: ProductionObservabilityStatus;
  reasons: string[];
  counters: {
    openAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    blockedShifts: number;
    agentsAtRisk: number;
    weeklyOverloadAgents: number;
    pendingCorrections: number;
    refusedPublications: number;
    pendingShifts: number;
    validatedShifts: number;
    publishedShifts: number;
    servicesUnderCovered: number;
    servicesWithOpenAlerts: number;
  };
  summary: ComplianceSummary;
  worklist: ManagerWorklist;
  serviceIndicators: ServiceComplianceIndicators;
  observability: ProductionObservabilityHealth;
  priorityActions: ManagerWorklistItem[];
  recommendedActions: ManagerCockpitAction[];
}

const MANAGER_WORKLIST_RULES: Partial<
  Record<
    ComplianceRuleCode,
    {
      category: ManagerWorklistCategory;
      title: string;
      severity: AlertSeverity;
    }
  >
> = {
  [ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT]: {
    category: 'REST_INSUFFICIENT',
    title: 'Repos insuffisant avant garde',
    severity: AlertSeverity.HIGH,
  },
  [ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT]: {
    category: 'REST_INSUFFICIENT',
    title: 'Repos insuffisant après garde',
    severity: AlertSeverity.HIGH,
  },
  [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
    category: 'WEEKLY_OVERLOAD',
    title: 'Surcharge hebdomadaire',
    severity: AlertSeverity.HIGH,
  },
  [ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED]: {
    category: 'MISSING_COMPETENCY',
    title: 'Compétence obligatoire manquante ou expirée',
    severity: AlertSeverity.HIGH,
  },
  [ComplianceRuleCode.APPROVED_LEAVE_OVERLAP]: {
    category: 'LEAVE_CONFLICT',
    title: 'Conflit avec congé approuvé',
    severity: AlertSeverity.HIGH,
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

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Leave)
    private leaveRepository: Repository<Leave>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(HospitalService)
    private hospitalServiceRepository: Repository<HospitalService>,
    @InjectRepository(AgentAlert)
    private alertRepository: Repository<AgentAlert>,
    @InjectRepository(ShiftApplication)
    private shiftApplicationRepository: Repository<ShiftApplication>,
    private auditService: AuditService,
    private whatsappService: WhatsappService,
    private eventsGateway: EventsGateway,
    private documentsService: DocumentsService,
    private complianceValidationService: ComplianceValidationService,
  ) {}

  async validateShift(
    tenantId: string,
    agentId: number,
    start: Date,
    end: Date,
    options: ShiftValidationOptions = {},
  ): Promise<ShiftValidationResult> {
    return this.complianceValidationService.validateShift(
      tenantId,
      agentId,
      start,
      end,
      options,
    );
  }

  // Helper to check overlapping APPROVED leaves (Public for Optimization)
  public async checkAvailability(
    tenantId: string,
    agentId: number,
    date: Date,
  ): Promise<boolean> {
    return this.checkLeaveAvailability(tenantId, agentId, date, date);
  }

  // New helper to check overlapping APPROVED leaves
  private async checkLeaveAvailability(
    tenantId: string,
    agentId: number,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const count = await this.leaveRepository
      .createQueryBuilder('leave')
      .where('leave.tenantId = :tenantId', { tenantId })
      .andWhere('leave.agentId = :agentId', { agentId })
      .andWhere('leave.status = :status', { status: 'APPROVED' }) // Hardcoded enum string to avoid import coupling issues if any
      .andWhere('leave.start < :end', { end })
      .andWhere('leave.end > :start', { start })
      .getCount();

    return count === 0;
  }

  public async getWeeklyHours(
    tenantId: string,
    agentId: number,
    date: Date,
  ): Promise<number> {
    // Basic calculation for the current week starting Monday
    const startOfWeek = new Date(date);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(
      date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1),
    );

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const shifts = await this.shiftRepository.find({
      where: {
        agent: { id: agentId },
        tenantId: tenantId, // Filter by tenant
        start: Between(startOfWeek, endOfWeek),
      },
    });

    return shifts.reduce((total, shift) => {
      const duration =
        (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);
  }

  async getShifts(
    tenantId: string,
    start: Date,
    end: Date,
    facilityId?: number,
    serviceId?: number,
  ): Promise<Shift[]> {
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

  async createShift(
    tenantId: string,
    actorId: number,
    input: CreateShiftInput,
  ): Promise<Shift> {
    this.assertValidShiftDates(input.start, input.end);

    const validation = await this.validateShift(
      tenantId,
      input.agentId,
      input.start,
      input.end,
    );
    if (!validation.isValid) {
      throw new BadRequestException(this.formatValidationFailure(validation));
    }

    const shift = this.shiftRepository.create({
      tenantId,
      agent: { id: input.agentId } as any,
      start: input.start,
      end: input.end,
      postId: input.postId,
      type: input.type || ShiftType.NORMAL,
      facilityId: input.facilityId,
      status: 'PENDING',
    });

    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.CREATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'CREATE_SHIFT',
        validation,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    return savedShift;
  }

  async assignReplacement(
    tenantId: string,
    actorId: number,
    agentId: number,
    start: Date,
    end: Date,
    postId: string,
  ): Promise<Shift> {
    this.assertValidShiftDates(start, end);

    const validation = await this.validateShift(tenantId, agentId, start, end);
    if (!validation.isValid) {
      throw new BadRequestException(this.formatValidationFailure(validation));
    }

    const shift = this.shiftRepository.create({
      tenantId,
      agent: { id: agentId } as any,
      start,
      end,
      postId,
      status: 'VALIDATED',
    });

    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.CREATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'ASSIGN_REPLACEMENT',
        agentId,
        validation,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    return savedShift;
  }

  async updateShift(
    tenantId: string,
    shiftId: string | number,
    start: Date,
    end: Date,
    actorId: number,
  ): Promise<Shift> {
    this.assertValidShiftDates(start, end);

    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const before = this.getShiftAuditSnapshot(shift);

    if (shift.agent) {
      const validation = await this.validateShift(
        tenantId,
        shift.agent.id,
        start,
        end,
        { excludeShiftId: Number(shiftId) },
      );
      if (!validation.isValid) {
        throw new BadRequestException(this.formatValidationFailure(validation));
      }
    }

    shift.start = start;
    shift.end = end;

    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'UPDATE_SHIFT',
        before,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    return savedShift;
  }

  async publishPlanning(
    tenantId: string,
    actorId: number,
    start: Date,
    end: Date,
  ): Promise<PublishPlanningResult> {
    const { pendingShifts, report } = await this.buildPublishPlanningReport(
      tenantId,
      start,
      end,
    );

    if (report.violations.length > 0) {
      await this.auditService.log(
        tenantId,
        actorId,
        AuditAction.UPDATE,
        AuditEntityType.PLANNING,
        `${start.toISOString()}_${end.toISOString()}`,
        {
          action: 'PUBLISH_PLANNING',
          blocked: true,
          report,
        },
      );

      throw new BadRequestException({
        message: 'Planning publication blocked by compliance violations',
        report,
      });
    }

    for (const shift of pendingShifts) {
      shift.status = 'VALIDATED';
    }
    await this.shiftRepository.save(pendingShifts);

    const affected = pendingShifts.length;

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      `${start.toISOString()}_${end.toISOString()}`,
      {
        action: 'PUBLISH_PLANNING',
        blocked: false,
        affected,
        report,
      },
    );

    return { message: 'Planning publié avec succès', affected, report };
  }

  async previewPublishPlanning(
    tenantId: string,
    start: Date,
    end: Date,
  ): Promise<PublishPlanningPreviewResult> {
    const { report } = await this.buildPublishPlanningReport(
      tenantId,
      start,
      end,
      { skipAlertSync: true },
    );

    return {
      publishable: report.publishable,
      report,
    };
  }

  async getComplianceReports(
    tenantId: string,
    filters: ComplianceReportFilters = {},
  ) {
    const logs = await this.auditService.getLogs(tenantId, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
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

  async getPlanningComplianceTimeline(
    tenantId: string,
    filters: PlanningComplianceTimelineFilters = {},
  ): Promise<PlanningComplianceTimeline> {
    const logs = await this.auditService.getLogs(tenantId, {
      from: filters.from,
      to: filters.to,
      limit: filters.limit || 100,
    });

    const items = logs
      .filter((log) => {
        const action = this.getAuditBusinessAction(log);
        return action && PLANNING_TIMELINE_ACTIONS.has(action);
      })
      .filter((log) => this.matchesTimelineFilters(log, filters))
      .map((log) => this.toPlanningTimelineItem(log));

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

  async getComplianceSummary(
    tenantId: string,
    filters: ComplianceSummaryFilters = {},
  ): Promise<ComplianceSummary> {
    const openAlerts = await this.alertRepository.find({
      where: {
        tenantId,
        isResolved: false,
      },
    });

    const openAlertsBySeverity = {
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.LOW]: 0,
    };
    const agentIdsAtRisk = new Set<number>();

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
    const blockedShiftPreview: ComplianceSummaryBlockedShift[] = [];
    const validationBatchCache = this.createValidationBatchCache();

    for (const shift of pendingShifts) {
      if (!shift.agent?.id) {
        blockedShiftPreview.push({
          shiftId: shift.id,
          blockingReasons: ['UNASSIGNED_SHIFT'],
        });
        continue;
      }

      const validation = await this.validateShift(
        tenantId,
        shift.agent.id,
        shift.start,
        shift.end,
        {
          excludeShiftId: shift.id,
          skipAlertSync: true,
          batchCache: validationBatchCache,
        },
      );

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
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
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
        refusedPublications: publicationLogs.filter((log) =>
          Boolean(log.details?.blocked),
        ).length,
      },
      openAlertsBySeverity,
      blockedShiftPreview: blockedShiftPreview.slice(0, 10),
    };
  }

  async getManagerWorklist(
    tenantId: string,
    filters: ComplianceSummaryFilters = {},
  ): Promise<ManagerWorklist> {
    const items = new Map<string, ManagerWorklistItem>();
    const openAlerts = await this.alertRepository.find({
      where: {
        tenantId,
        isResolved: false,
      },
    });

    for (const alert of openAlerts) {
      const ruleCode = this.extractAlertRuleCode(alert);
      if (!ruleCode) continue;

      const definition = MANAGER_WORKLIST_RULES[ruleCode];
      if (!definition) continue;

      const item: ManagerWorklistItem = {
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
      if (!shift.agent?.id) continue;

      const validation = await this.validateShift(
        tenantId,
        shift.agent.id,
        shift.start,
        shift.end,
        {
          excludeShiftId: shift.id,
          skipAlertSync: true,
          batchCache: validationBatchCache,
        },
      );

      for (const ruleCode of validation.blockingReasons) {
        if (this.hasApprovedComplianceException(shift)) {
          continue;
        }

        const definition = MANAGER_WORKLIST_RULES[ruleCode];
        if (!definition) continue;

        const item: ManagerWorklistItem = {
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
      const severityDelta =
        this.getSeverityRank(b.severity) - this.getSeverityRank(a.severity);
      if (severityDelta !== 0) return severityDelta;

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

  async getDecisionRecommendations(
    tenantId: string,
    filters: ComplianceSummaryFilters = {},
  ): Promise<DecisionRecommendations> {
    const worklist = await this.getManagerWorklist(tenantId, filters);
    const recommendations = worklist.items
      .map((item) => this.toDecisionRecommendation(item))
      .sort((a, b) => {
        const priorityDelta = b.priority - a.priority;
        if (priorityDelta !== 0) return priorityDelta;
        return (a.dueAt?.getTime() || 0) - (b.dueAt?.getTime() || 0);
      });

    return {
      tenantId,
      period: worklist.period,
      total: recommendations.length,
      recommendations,
    };
  }

  async getShiftDecisionSuggestions(
    tenantId: string,
    shiftId: string | number,
    replacementCandidates: Agent[] = [],
  ): Promise<ShiftDecisionSuggestions> {
    const compliance = await this.explainShiftCompliance(tenantId, shiftId);
    const validation = compliance.validation as ShiftValidationResult;

    return {
      shift: compliance.shift,
      validation,
      recommendedActions: this.getRecommendedActionsForRules(
        validation.blockingReasons,
        Boolean((compliance.shift as { agentId?: number }).agentId),
      ),
      replacements: replacementCandidates
        .map((agent) =>
          this.toShiftReplacementSuggestion(
            agent,
            validation.blockingReasons,
            compliance.shift as { agentId?: number },
          ),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    };
  }

  async getShiftSuggestionContext(
    tenantId: string,
    shiftId: string | number,
  ): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async getShiftCorrectionGuidance(
    tenantId: string,
    shiftId: string | number,
  ): Promise<CorrectionGuidance> {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const validation: ShiftValidationResult = shift.agent?.id
      ? await this.validateShift(
          tenantId,
          shift.agent.id,
          shift.start,
          shift.end,
          {
            excludeShiftId: shift.id,
            skipAlertSync: true,
          },
        )
      : {
          isValid: false,
          blockingReasons: [ComplianceRuleCode.AGENT_NOT_FOUND],
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

  async getAlertCorrectionGuidance(
    tenantId: string,
    alertId: string | number,
  ): Promise<CorrectionGuidance> {
    const alert = await this.alertRepository.findOne({
      where: { id: Number(alertId), tenantId },
      relations: ['agent'],
    });

    if (!alert) {
      throw new NotFoundException('Agent alert not found');
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
              description:
                'Marque l’alerte comme traitée après correction ou justification.',
              permissions: ['planning:write', 'alerts:manage'],
              method: 'PATCH',
              endpoint: `/planning/alerts/${alert.id}/resolve`,
              body: {
                reason: {
                  type: 'string',
                  required: false,
                },
              },
            },
          ],
    };
  }

  async getServiceComplianceIndicators(
    tenantId: string,
    filters: ComplianceSummaryFilters = {},
  ): Promise<ServiceComplianceIndicators> {
    const services = await this.hospitalServiceRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
    const agents = await this.agentRepository.find({
      where: { tenantId },
    });

    const shiftWhere: Record<string, unknown> = { tenantId };
    if (filters.from) {
      shiftWhere.start = MoreThanOrEqual(filters.from);
    }
    if (filters.to) {
      shiftWhere.end = LessThanOrEqual(filters.to);
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

    const indicators = new Map<number, ServiceComplianceIndicator>();
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
          [AlertSeverity.HIGH]: 0,
          [AlertSeverity.MEDIUM]: 0,
          [AlertSeverity.LOW]: 0,
        },
      });
    }

    const hoursByService = new Map<number, number>();
    const hoursByAgent = new Map<number, number>();
    const agentServiceIds = new Map<number, number>();

    for (const agent of agents) {
      if (!agent.hospitalServiceId) continue;
      agentServiceIds.set(agent.id, agent.hospitalServiceId);
      const indicator = indicators.get(agent.hospitalServiceId);
      if (indicator) {
        indicator.activeAgents += 1;
      }
    }

    for (const shift of shifts) {
      const serviceId = shift.agent?.hospitalServiceId;
      if (!serviceId) continue;

      const indicator = indicators.get(serviceId);
      if (!indicator) continue;

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

      hoursByService.set(
        serviceId,
        (hoursByService.get(serviceId) || 0) + durationHours,
      );
      if (shift.agent?.id) {
        hoursByAgent.set(
          shift.agent.id,
          (hoursByAgent.get(shift.agent.id) || 0) + durationHours,
        );
      }
    }

    for (const [agentId, hours] of hoursByAgent.entries()) {
      if (hours <= weeklyLimit) continue;
      const serviceId = agentServiceIds.get(agentId);
      if (!serviceId) continue;
      const indicator = indicators.get(serviceId);
      if (indicator) {
        indicator.weeklyOverloadAgents += 1;
      }
    }

    for (const alert of openAlerts) {
      const serviceId = alert.agent?.hospitalServiceId;
      if (!serviceId) continue;
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
          ? Math.round(
              (indicator.validatedOrPublishedShifts / indicator.plannedShifts) *
                100,
            )
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

  async getProductionObservabilityHealth(
    tenantId: string,
    filters: ComplianceSummaryFilters = {},
  ): Promise<ProductionObservabilityHealth> {
    const shiftWhere: Record<string, unknown> = { tenantId };
    if (filters.from) {
      shiftWhere.start = MoreThanOrEqual(filters.from);
    }
    if (filters.to) {
      shiftWhere.end = LessThanOrEqual(filters.to);
    }

    const [openAlerts, shifts, publicationLogs, complianceScanLogs] =
      await Promise.all([
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
          action: AuditAction.UPDATE,
          entityType: AuditEntityType.PLANNING,
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
      ]);

    const alertCounters = {
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.LOW]: 0,
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
      if (shift.status === 'PENDING') shiftCounters.pending += 1;
      if (shift.status === 'VALIDATED') shiftCounters.validated += 1;
      if (shift.status === 'PUBLISHED') shiftCounters.published += 1;
    }

    const latestPublicationLog = publicationLogs[0];
    const lastPublication = latestPublicationLog
      ? {
          timestamp: latestPublicationLog.timestamp,
          actorId: latestPublicationLog.actorId,
          blocked: Boolean(latestPublicationLog.details?.blocked),
          affected: latestPublicationLog.details?.affected || 0,
          totalPending: latestPublicationLog.details?.report?.totalPending,
          violations:
            latestPublicationLog.details?.report?.violations?.length || 0,
          warnings: latestPublicationLog.details?.report?.warnings?.length || 0,
        }
      : undefined;

    const failedScanLogs = complianceScanLogs.filter(
      (log) => log.details?.status === 'FAILED' || Boolean(log.details?.error),
    );
    const lastScanLog = complianceScanLogs[0];
    const complianceScanStatus = lastScanLog
      ? failedScanLogs.length > 0
        ? 'DEGRADED'
        : 'HEALTHY'
      : 'UNKNOWN';

    const reasons: string[] = [];
    if (alertCounters[AlertSeverity.HIGH] > 0) {
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

    let status: ProductionObservabilityStatus = 'HEALTHY';
    if (
      alertCounters[AlertSeverity.HIGH] > 0 ||
      lastPublication?.blocked ||
      failedScanLogs.length > 0
    ) {
      status = 'CRITICAL';
    } else if (!lastPublication || shiftCounters.pending > 0) {
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
        highAlerts: alertCounters[AlertSeverity.HIGH],
        mediumAlerts: alertCounters[AlertSeverity.MEDIUM],
        lowAlerts: alertCounters[AlertSeverity.LOW],
        pendingShifts: shiftCounters.pending,
        validatedShifts: shiftCounters.validated,
        publishedShifts: shiftCounters.published,
        publicationAttempts: publicationLogs.length,
        refusedPublications: publicationLogs.filter((log) =>
          Boolean(log.details?.blocked),
        ).length,
        successfulPublications: publicationLogs.filter(
          (log) => !Boolean(log.details?.blocked),
        ).length,
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

  async getManagerCockpit(
    tenantId: string,
    filters: ComplianceSummaryFilters = {},
  ): Promise<ManagerCockpit> {
    const [summary, worklist, serviceIndicators, observability] =
      await Promise.all([
        this.getComplianceSummary(tenantId, filters),
        this.getManagerWorklist(tenantId, filters),
        this.getServiceComplianceIndicators(tenantId, filters),
        this.getProductionObservabilityHealth(tenantId, filters),
      ]);

    const weeklyOverloadAgents = serviceIndicators.services.reduce(
      (total, service) => total + service.weeklyOverloadAgents,
      0,
    );
    const servicesUnderCovered = serviceIndicators.services.filter(
      (service) => service.activeAgents > 0 && service.coverageRate < 80,
    ).length;
    const servicesWithOpenAlerts = serviceIndicators.services.filter(
      (service) =>
        service.openAlertsBySeverity[AlertSeverity.HIGH] +
          service.openAlertsBySeverity[AlertSeverity.MEDIUM] +
          service.openAlertsBySeverity[AlertSeverity.LOW] >
        0,
    ).length;

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
        highAlerts: summary.openAlertsBySeverity[AlertSeverity.HIGH],
        mediumAlerts: summary.openAlertsBySeverity[AlertSeverity.MEDIUM],
        lowAlerts: summary.openAlertsBySeverity[AlertSeverity.LOW],
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

  async explainShiftCompliance(tenantId: string, shiftId: string | number) {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
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

    const validation = await this.validateShift(
      tenantId,
      shift.agent.id,
      shift.start,
      shift.end,
      { excludeShiftId: shift.id },
    );

    return {
      shift: this.getShiftAuditSnapshot(shift),
      validation,
    };
  }

  async approveShiftException(
    tenantId: string,
    actorId: number,
    shiftId: string | number,
    reason: string,
  ): Promise<Shift> {
    const justification = reason?.trim();
    if (!justification) {
      throw new BadRequestException('Compliance exception reason is required');
    }

    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (!shift.agent?.id) {
      throw new BadRequestException(
        'Cannot approve exception for an unassigned shift',
      );
    }

    const validation = await this.validateShift(
      tenantId,
      shift.agent.id,
      shift.start,
      shift.end,
      {
        excludeShiftId: shift.id,
        skipAlertSync: true,
      },
    );

    if (validation.isValid) {
      throw new BadRequestException(
        'Cannot approve exception for a compliant shift',
      );
    }

    const before = this.getShiftAuditSnapshot(shift);
    shift.complianceExceptionApproved = true;
    shift.complianceExceptionReason = justification;
    shift.complianceExceptionApprovedById = actorId;
    shift.complianceExceptionApprovedAt = new Date();

    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'APPROVE_COMPLIANCE_EXCEPTION',
        reason: justification,
        validation,
        before,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    return savedShift;
  }

  async revalidateShift(
    tenantId: string,
    actorId: number,
    shiftId: string | number,
  ) {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const validation = shift.agent?.id
      ? await this.validateShift(
          tenantId,
          shift.agent.id,
          shift.start,
          shift.end,
          {
            excludeShiftId: shift.id,
          },
        )
      : {
          isValid: false,
          blockingReasons: ['UNASSIGNED_SHIFT'],
          warnings: [],
          metadata: { status: shift.status },
        };

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      shift.id,
      {
        action: 'REVALIDATE_SHIFT',
        validation,
        shift: this.getShiftAuditSnapshot(shift),
      },
    );

    return {
      shift: this.getShiftAuditSnapshot(shift),
      validation,
    };
  }

  async reassignShift(
    tenantId: string,
    actorId: number,
    shiftId: string | number,
    agentId: number,
  ): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const agent = await this.agentRepository.findOne({
      where: { id: agentId, tenantId },
      relations: ['hospitalService', 'grade'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const before = this.getShiftAuditSnapshot(shift);
    const validation = await this.validateShift(
      tenantId,
      agent.id,
      shift.start,
      shift.end,
      {
        excludeShiftId: shift.id,
      },
    );

    if (!validation.isValid) {
      throw new BadRequestException(this.formatValidationFailure(validation));
    }

    shift.agent = agent;
    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'REASSIGN_SHIFT',
        previousAgentId: before.agentId,
        newAgentId: agent.id,
        validation,
        before,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    this.eventsGateway.broadcastPlanningUpdate();
    return savedShift;
  }

  async requestReplacement(
    tenantId: string,
    actorId: number,
    shiftId: string | number,
    reason?: string,
  ): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.start <= new Date()) {
      throw new BadRequestException(
        'Cannot request replacement for a past shift',
      );
    }

    if (shift.isSwapRequested) {
      throw new BadRequestException(
        'Replacement already requested for this shift',
      );
    }

    const before = this.getShiftAuditSnapshot(shift);
    shift.isSwapRequested = true;
    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'REQUEST_REPLACEMENT',
        reason: reason?.trim() || undefined,
        before,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    this.eventsGateway.broadcastPlanningUpdate();
    return savedShift;
  }

  async resolvePlanningAlert(
    tenantId: string,
    actorId: number,
    alertId: string | number,
    reason?: string,
  ): Promise<AgentAlert> {
    const alert = await this.alertRepository.findOne({
      where: { id: Number(alertId), tenantId },
    });

    if (!alert) {
      throw new NotFoundException('Agent alert not found');
    }

    alert.isResolved = true;
    alert.isAcknowledged = true;
    alert.resolvedAt = new Date();
    alert.resolutionReason =
      reason?.trim() || 'Resolved from planning worklist';

    const savedAlert = await this.alertRepository.save(alert);

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      alert.agentId.toString(),
      {
        action: 'RESOLVE_PLANNING_ALERT',
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        resolutionReason: alert.resolutionReason,
      },
    );

    return savedAlert;
  }

  async getShiftApplications(tenantId: string): Promise<ShiftApplication[]> {
    return this.shiftApplicationRepository.find({
      where: { tenantId },
      relations: ['agent', 'shift', 'shift.facility'],
      order: { appliedAt: 'DESC' },
    });
  }

  async approveGhtApplication(
    tenantId: string,
    applicationId: string | number,
    actorId: number,
  ): Promise<ShiftApplication> {
    const application = await this.shiftApplicationRepository.findOne({
      where: { id: Number(applicationId), tenantId },
      relations: ['shift', 'agent'],
    });

    if (!application) throw new Error('Application not found');
    if (application.status !== ShiftApplicationStatus.PENDING_GHT_APPROVAL)
      throw new Error('Application is not pending GHT approval');

    // Approve
    application.status = ShiftApplicationStatus.ACCEPTED;
    const shift = await this.shiftRepository.findOne({
      where: { id: application.shift.id, tenantId },
    });

    if (shift) {
      shift.status = 'PUBLISHED';
      await this.shiftRepository.save(shift);
    }

    await this.shiftApplicationRepository.save(application);

    // Notify Agent
    if (application.agent.telephone) {
      this.whatsappService
        .sendMessage(
          application.agent.telephone,
          `✅ Bonne nouvelle ! Le Superviseur RH GHT a validé votre déplacement pour la garde #${application.shift.id}. La garde vous est officiellement affectée.`,
        )
        .catch(() => {});
    }

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      shift?.id || 0,
      { action: 'approve_ght' },
    );

    this.eventsGateway.broadcastPlanningUpdate();

    // 3. Generate Contract Auto and trigger GED/WhatsApp 2FA
    await this.documentsService.generateContractForShift(
      tenantId,
      shift,
      application.agent,
    );

    return application;
  }

  async rejectGhtApplication(
    tenantId: string,
    applicationId: string | number,
    actorId: number,
  ): Promise<ShiftApplication> {
    const application = await this.shiftApplicationRepository.findOne({
      where: { id: Number(applicationId), tenantId },
      relations: ['shift', 'agent'],
    });

    if (!application) throw new Error('Application not found');
    if (application.status !== ShiftApplicationStatus.PENDING_GHT_APPROVAL)
      throw new Error('Application is not pending GHT approval');

    // Reject
    application.status = ShiftApplicationStatus.REJECTED;

    const shift = await this.shiftRepository.findOne({
      where: { id: application.shift.id, tenantId },
    });
    if (shift) {
      // Re-open shift by unassigning
      shift.agent = null as any;
      shift.status = 'BROADCASTED_GHT'; // or PLANNED
      await this.shiftRepository.save(shift);
    }

    await this.shiftApplicationRepository.save(application);

    // Notify
    if (application.agent.telephone) {
      this.whatsappService
        .sendMessage(
          application.agent.telephone,
          `❌ Désolé, le Superviseur RH GHT a refusé la validation de votre déplacement pour la garde #${application.shift.id}.`,
        )
        .catch(() => {});
    }

    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      shift?.id || 0,
      { action: 'reject_ght' },
    );

    this.eventsGateway.broadcastPlanningUpdate();

    return application;
  }

  // --- BOURSE D'ÉCHANGE DE GARDES (SHIFT SWAPPING) ---

  async requestSwap(
    tenantId: string,
    shiftId: number,
    agentId: number,
  ): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) throw new NotFoundException('Shift not found');
    this.assertShiftCanEnterSwap(shift);

    if (!shift.agent || Number(shift.agent.id) !== Number(agentId)) {
      throw new BadRequestException(
        'You can only request swaps for your own shifts',
      );
    }

    if (shift.isSwapRequested) {
      throw new BadRequestException('Shift is already available for swap');
    }

    const before = this.getShiftAuditSnapshot(shift);
    shift.isSwapRequested = true;
    const savedShift = await this.shiftRepository.save(shift);

    await this.auditService.log(
      tenantId,
      agentId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'REQUEST_SWAP',
        before,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    this.eventsGateway.broadcastPlanningUpdate();
    return savedShift;
  }

  async getAvailableSwaps(tenantId: string, agentId: number): Promise<Shift[]> {
    const currentAgent = await this.agentRepository.findOne({
      where: { id: agentId, tenantId },
      relations: ['hospitalService', 'grade'],
    });

    if (!currentAgent) throw new Error('Agent introuvable');

    const query = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.agent', 'agent')
      .leftJoinAndSelect('shift.facility', 'facility')
      .where('shift.tenantId = :tenantId', { tenantId })
      .andWhere('shift.isSwapRequested = :isSwapRequested', {
        isSwapRequested: true,
      })
      .andWhere('shift.start > :now', { now: new Date() })
      // Sauf s'il s'agit de la propre garde de l'agent
      .andWhere('shift.agent.id != :agentId', { agentId });

    // Règles QVT: Les médecins (ex: MDECIN) peuvent cross-service. Les autres non.
    if (
      currentAgent.grade?.name?.toUpperCase() !== 'MDECIN' &&
      currentAgent.grade?.name?.toUpperCase() !== 'MEDECIN'
    ) {
      query.andWhere('agent.hospitalServiceId = :hospitalServiceId', {
        hospitalServiceId: currentAgent.hospitalServiceId,
      });
    }

    return query.getMany();
  }

  async applyForSwap(
    tenantId: string,
    shiftId: number,
    agentId: number,
  ): Promise<{ success: boolean; message: string }> {
    const shift = await this.shiftRepository.findOne({
      where: { id: Number(shiftId), tenantId },
      relations: ['agent'],
    });

    if (!shift) throw new NotFoundException('Shift not found');
    this.assertShiftCanEnterSwap(shift);
    if (!shift.isSwapRequested) {
      throw new BadRequestException('Shift is not available for swap');
    }
    if (!shift.agent) {
      throw new BadRequestException('Cannot swap an unassigned shift');
    }
    if (Number(shift.agent.id) === Number(agentId)) {
      throw new BadRequestException('You cannot apply to your own swap');
    }

    const applyingAgent = await this.agentRepository.findOne({
      where: { id: agentId, tenantId },
    });

    if (!applyingAgent) throw new NotFoundException('Agent not found');

    const validation = await this.validateShift(
      tenantId,
      agentId,
      shift.start,
      shift.end,
      { excludeShiftId: Number(shiftId) },
    );

    if (!validation.isValid) {
      throw new BadRequestException(this.formatValidationFailure(validation));
    }

    const formerAgent = shift.agent;
    const before = this.getShiftAuditSnapshot(shift);

    shift.agent = applyingAgent;
    shift.isSwapRequested = false;
    const savedShift = await this.shiftRepository.save(shift);

    if (formerAgent?.telephone) {
      Promise.resolve(
        this.whatsappService.sendMessage(
          formerAgent.telephone,
          `✅ Bonne nouvelle ! Votre garde du ${shift.start.toLocaleDateString()} a été reprise par ${applyingAgent.nom} via la Bourse d'Échange.`,
        ),
      ).catch(() => {});
    }

    await this.auditService.log(
      tenantId,
      agentId,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      savedShift.id,
      {
        action: 'APPLY_SWAP',
        formerAgentId: formerAgent.id,
        newAgentId: applyingAgent.id,
        validation,
        before,
        after: this.getShiftAuditSnapshot(savedShift),
      },
    );

    this.eventsGateway.broadcastPlanningUpdate();
    return {
      success: true,
      message: 'Échange auto-validé ! La garde a été ajoutée à votre planning.',
    };
  }

  private getAuditBusinessAction(log: {
    action?: AuditAction;
    details?: Record<string, any>;
  }): string {
    return log.details?.action || log.action || 'UNKNOWN';
  }

  private matchesTimelineFilters(
    log: {
      actorId?: number;
      entityType?: AuditEntityType;
      entityId?: string;
      details?: Record<string, any>;
    },
    filters: PlanningComplianceTimelineFilters,
  ): boolean {
    if (
      filters.agentId !== undefined &&
      !this.auditLogInvolvesAgent(log, filters.agentId)
    ) {
      return false;
    }

    if (
      filters.shiftId !== undefined &&
      !this.auditLogInvolvesShift(log, filters.shiftId)
    ) {
      return false;
    }

    return true;
  }

  private auditLogInvolvesAgent(
    log: {
      actorId?: number;
      entityType?: AuditEntityType;
      entityId?: string;
      details?: Record<string, any>;
    },
    agentId: number,
  ): boolean {
    const details = log.details || {};
    const numericEntityId = Number(log.entityId);
    if (
      log.entityType === AuditEntityType.AGENT &&
      Number.isFinite(numericEntityId) &&
      numericEntityId === agentId
    ) {
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
    return [...(report?.violations || []), ...(report?.warnings || [])].some(
      (item) => Number(item?.agentId) === agentId,
    );
  }

  private auditLogInvolvesShift(
    log: {
      entityType?: AuditEntityType;
      entityId?: string;
      details?: Record<string, any>;
    },
    shiftId: number,
  ): boolean {
    const details = log.details || {};
    const numericEntityId = Number(log.entityId);
    if (
      log.entityType === AuditEntityType.SHIFT &&
      Number.isFinite(numericEntityId) &&
      numericEntityId === shiftId
    ) {
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
    return (
      (report?.validatedShiftIds || []).some(
        (id: unknown) => Number(id) === shiftId,
      ) ||
      [...(report?.violations || []), ...(report?.warnings || [])].some(
        (item) => Number(item?.shiftId) === shiftId,
      )
    );
  }

  private toPlanningTimelineItem(log: {
    id: number;
    timestamp: Date;
    actorId: number;
    entityType: AuditEntityType;
    entityId?: string;
    details?: Record<string, any>;
  }): PlanningComplianceTimelineItem {
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

  private getTimelineLabel(
    action: string,
    details?: Record<string, any>,
  ): string {
    const labels: Record<string, string> = {
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

  private getTimelineStatus(
    action: string,
    details?: Record<string, any>,
  ): string | undefined {
    if (action === 'PUBLISH_PLANNING') {
      return details?.blocked ? 'BLOCKED' : 'SUCCESS';
    }
    if (action === 'COMPLIANCE_SCAN') {
      return details?.status || (details?.error ? 'FAILED' : 'SUCCESS');
    }
    if (details?.validation) {
      return details.validation.isValid ? 'VALID' : 'BLOCKED';
    }
    if (action === 'APPROVE_COMPLIANCE_EXCEPTION') return 'APPROVED';
    if (action === 'RESOLVE_PLANNING_ALERT') return 'RESOLVED';
    if (['REQUEST_REPLACEMENT', 'REQUEST_SWAP'].includes(action)) {
      return 'REQUESTED';
    }
    if (
      ['REASSIGN_SHIFT', 'APPLY_SWAP', 'ASSIGN_REPLACEMENT'].includes(action)
    ) {
      return 'CORRECTED';
    }

    return undefined;
  }

  private getTimelineSeverity(
    action: string,
    details?: Record<string, any>,
  ): AlertSeverity | undefined {
    if (
      details?.severity &&
      Object.values(AlertSeverity).includes(details.severity)
    ) {
      return details.severity;
    }

    if (action === 'PUBLISH_PLANNING' && details?.blocked) {
      return AlertSeverity.HIGH;
    }
    if (
      action === 'COMPLIANCE_SCAN' &&
      (details?.status === 'FAILED' || details?.error)
    ) {
      return AlertSeverity.HIGH;
    }
    if (details?.validation?.isValid === false) {
      return AlertSeverity.HIGH;
    }
    if (action === 'APPROVE_COMPLIANCE_EXCEPTION') {
      return AlertSeverity.MEDIUM;
    }

    return undefined;
  }

  private summarizeTimelineDetails(
    action: string,
    details: Record<string, any>,
  ): Record<string, unknown> {
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
      return {
        previousAgentId: details.previousAgentId || details.formerAgentId,
        newAgentId: details.newAgentId,
        validation: this.summarizeValidation(details.validation),
      };
    }

    if (action === 'REVALIDATE_SHIFT') {
      return {
        shiftId: details.shift?.id,
        validation: this.summarizeValidation(details.validation),
      };
    }

    if (action === 'APPROVE_COMPLIANCE_EXCEPTION') {
      return {
        reason: details.reason,
        validation: this.summarizeValidation(details.validation),
      };
    }

    if (action === 'REQUEST_REPLACEMENT') {
      return {
        reason: details.reason,
        previousAgentId: details.before?.agentId,
      };
    }

    if (action === 'RESOLVE_PLANNING_ALERT') {
      return {
        alertId: details.alertId,
        type: details.type,
        severity: details.severity,
        resolutionReason: details.resolutionReason,
      };
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

  private summarizeValidation(
    validation?: ShiftValidationResult,
  ): Record<string, unknown> | undefined {
    if (!validation) return undefined;

    return {
      isValid: validation.isValid,
      blockingReasons: validation.blockingReasons,
      warnings: validation.warnings,
    };
  }

  private assertShiftCanEnterSwap(shift: Shift): void {
    if (shift.start <= new Date()) {
      throw new BadRequestException('Cannot swap a past shift');
    }

    if (!['VALIDATED', 'PUBLISHED'].includes(shift.status)) {
      throw new BadRequestException('Shift status does not allow swaps');
    }
  }

  private assertValidShiftDates(start: Date, end: Date): void {
    if (
      !(start instanceof Date) ||
      Number.isNaN(start.getTime()) ||
      !(end instanceof Date) ||
      Number.isNaN(end.getTime())
    ) {
      throw new BadRequestException('Invalid shift dates');
    }

    if (start >= end) {
      throw new BadRequestException('Shift start must be before shift end');
    }
  }

  private formatValidationFailure(validation: ShiftValidationResult): string {
    return `Shift validation failed: ${validation.blockingReasons.join(', ')}`;
  }

  private extractAlertRuleCode(alert: AgentAlert): ComplianceRuleCode | null {
    const ruleCode = alert.metadata?.ruleCode;
    if (Object.values(ComplianceRuleCode).includes(ruleCode)) {
      return ruleCode;
    }

    return null;
  }

  private getShiftCorrectionActions(
    shift: Shift,
    validation: ShiftValidationResult,
  ): CorrectionAction[] {
    const actionCodes = this.getRecommendedActionsForRules(
      validation.blockingReasons,
      Boolean(shift.agent?.id),
    );
    const actions: CorrectionAction[] = [];

    if (actionCodes.includes('REASSIGN_SHIFT')) {
      actions.push({
        code: 'REASSIGN_SHIFT',
        label: 'Réassigner le shift',
        description:
          'Teste un nouvel agent avec la validation conformité stricte avant mutation.',
        permissions: ['planning:write'],
        method: 'POST',
        endpoint: `/planning/shifts/${shift.id}/reassign`,
        body: {
          agentId: {
            type: 'number',
            required: true,
          },
        },
      });
    }

    if (
      actionCodes.includes('REQUEST_REPLACEMENT') &&
      shift.start > new Date() &&
      !shift.isSwapRequested
    ) {
      actions.push({
        code: 'REQUEST_REPLACEMENT',
        label: 'Demander un remplacement',
        description:
          'Ouvre une demande de remplacement sans contourner la conformité.',
        permissions: ['planning:write'],
        method: 'POST',
        endpoint: `/planning/shifts/${shift.id}/request-replacement`,
        body: {
          reason: {
            type: 'string',
            required: false,
          },
        },
      });
    }

    if (
      actionCodes.includes('APPROVE_EXCEPTION') ||
      (!validation.isValid && shift.agent?.id)
    ) {
      if (!this.hasApprovedComplianceException(shift)) {
        actions.push({
          code: 'APPROVE_EXCEPTION',
          label: 'Autoriser une exception',
          description:
            'Autorise une exception contrôlée avec justification et audit fort.',
          permissions: ['planning:exception'],
          method: 'POST',
          endpoint: `/planning/shifts/${shift.id}/exception`,
          body: {
            reason: {
              type: 'string',
              required: true,
            },
          },
        });
      }
    }

    actions.push({
      code: 'REVALIDATE_SHIFT',
      label: 'Relancer la validation',
      description:
        'Rejoue la validation structurée après correction ou changement de contexte.',
      permissions: ['planning:write'],
      method: 'POST',
      endpoint: `/planning/shifts/${shift.id}/revalidate`,
    });

    return actions;
  }

  private getSeverityRank(severity: AlertSeverity): number {
    return (
      {
        [AlertSeverity.HIGH]: 3,
        [AlertSeverity.MEDIUM]: 2,
        [AlertSeverity.LOW]: 1,
      }[severity] || 0
    );
  }

  private getShiftDurationHours(shift: Shift): number {
    return Math.max(
      0,
      (new Date(shift.end).getTime() - new Date(shift.start).getTime()) /
        (1000 * 60 * 60),
    );
  }

  private createValidationBatchCache(): ShiftValidationBatchCache {
    return {
      agents: new Map(),
      constraints: new Map(),
      mandatoryHealthRecords: new Map(),
      mandatoryCompetencies: new Map(),
      weeklyHours: new Map(),
      tenantWeeklyLimits: new Map(),
    };
  }

  private toManagerCockpitActions(
    items: ManagerWorklistItem[],
  ): ManagerCockpitAction[] {
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
      const actions: ManagerCockpitAction[] = [
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
        actions.push(
          {
            type: 'REASSIGN_SHIFT',
            label: 'Réassigner le shift',
            shiftId: item.shiftId,
            endpoint: {
              method: 'POST',
              path: `/planning/shifts/${item.shiftId}/reassign`,
            },
          },
          {
            type: 'REQUEST_REPLACEMENT',
            label: 'Demander un remplacement',
            shiftId: item.shiftId,
            endpoint: {
              method: 'POST',
              path: `/planning/shifts/${item.shiftId}/request-replacement`,
            },
          },
          {
            type: 'REVALIDATE_SHIFT',
            label: 'Relancer la validation',
            shiftId: item.shiftId,
            endpoint: {
              method: 'POST',
              path: `/planning/shifts/${item.shiftId}/revalidate`,
            },
          },
        );
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

  private getManagerWorklistCounters(
    items: ManagerWorklistItem[],
  ): Record<ManagerWorklistCategory, number> {
    return items.reduce<Record<ManagerWorklistCategory, number>>(
      (acc, item) => {
        acc[item.category] += 1;
        return acc;
      },
      {
        REST_INSUFFICIENT: 0,
        WEEKLY_OVERLOAD: 0,
        MISSING_COMPETENCY: 0,
        LEAVE_CONFLICT: 0,
      },
    );
  }

  private async buildPublishPlanningReport(
    tenantId: string,
    start: Date,
    end: Date,
    options: { skipAlertSync?: boolean } = {},
  ): Promise<{ pendingShifts: Shift[]; report: PublishPlanningReport }> {
    this.assertValidShiftDates(start, end);

    const pendingShifts = await this.shiftRepository.find({
      where: {
        tenantId,
        status: 'PENDING',
        start: MoreThanOrEqual(start),
        end: LessThanOrEqual(end),
      },
      relations: ['agent'],
    });

    const report: PublishPlanningReport = {
      start,
      end,
      publishable: true,
      totalPending: pendingShifts.length,
      validatedShiftIds: [],
      violations: [],
      warnings: [],
      recommendations: [],
    };
    const recommendations = new Set<string>();
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
        this.addPublishPlanningRecommendations(
          recommendations,
          blockingReasons,
        );
        continue;
      }

      const validation = await this.validateShift(
        tenantId,
        agentId,
        shift.start,
        shift.end,
        {
          excludeShiftId: shift.id,
          skipAlertSync: options.skipAlertSync,
          batchCache: validationBatchCache,
        },
      );

      if (!validation.isValid) {
        this.addPublishPlanningRecommendations(
          recommendations,
          validation.blockingReasons,
        );

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
        this.addPublishPlanningRecommendations(
          recommendations,
          validation.warnings,
        );
      }
    }

    report.publishable = report.violations.length === 0;
    report.recommendations = [...recommendations];

    return { pendingShifts, report };
  }

  private addPublishPlanningRecommendations(
    recommendations: Set<string>,
    reasons: string[],
  ): void {
    for (const reason of reasons) {
      recommendations.add(this.getPublishPlanningRecommendation(reason));
    }
  }

  private getPublishPlanningRecommendation(reason: string): string {
    const recommendations: Record<string, string> = {
      UNASSIGNED_SHIFT:
        'Assigner un agent au shift avant de relancer la pré-publication.',
      [ComplianceRuleCode.SHIFT_OVERLAP]:
        'Réassigner ou déplacer le shift en chevauchement.',
      [ComplianceRuleCode.APPROVED_LEAVE_OVERLAP]:
        'Choisir un remplaçant disponible ou déplacer le shift conflictuel avec un congé approuvé.',
      [ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT]:
        'Respecter le repos minimum avant garde ou approuver une exception justifiée.',
      [ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT]:
        'Respecter le repos minimum après garde ou approuver une exception justifiée.',
      [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]:
        'Répartir la charge sur un autre agent ou approuver une exception contrôlée.',
      [ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED]:
        'Affecter un agent disposant des compétences obligatoires.',
      [ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED]:
        'Mettre à jour les certificats obligatoires avant publication.',
      [ComplianceRuleCode.MAX_GUARD_DURATION_EXCEEDED]:
        'Réduire la durée de garde ou adapter la politique applicable.',
    };

    return (
      recommendations[reason] ||
      'Corriger la violation de conformité puis relancer la pré-publication.'
    );
  }

  private toDecisionRecommendation(
    item: ManagerWorklistItem,
  ): DecisionRecommendation {
    const priority =
      this.getSeverityRank(item.severity) * 100 +
      this.getCategoryPriority(item.category);

    return {
      id: `recommendation:${item.id}`,
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
      recommendedActions: this.getRecommendedActionsForRules(
        [item.ruleCode],
        Boolean(item.agentId),
      ),
      metadata: item.metadata,
    };
  }

  private getCategoryPriority(category: ManagerWorklistCategory): number {
    return (
      {
        LEAVE_CONFLICT: 40,
        REST_INSUFFICIENT: 30,
        WEEKLY_OVERLOAD: 20,
        MISSING_COMPETENCY: 10,
      }[category] || 0
    );
  }

  private getRecommendationRationale(item: ManagerWorklistItem): string {
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

  private getRecommendedActionsForRules(
    ruleCodes: ComplianceRuleCode[],
    hasAssignedAgent: boolean,
  ): DecisionRecommendationAction[] {
    const actions = new Set<DecisionRecommendationAction>();

    if (!hasAssignedAgent) {
      actions.add('REASSIGN_SHIFT');
      actions.add('REVALIDATE_SHIFT');
    }

    for (const ruleCode of ruleCodes) {
      if (
        [
          ComplianceRuleCode.APPROVED_LEAVE_OVERLAP,
          ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
          ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT,
          ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          ComplianceRuleCode.SHIFT_OVERLAP,
        ].includes(ruleCode)
      ) {
        actions.add('REASSIGN_SHIFT');
        actions.add('REQUEST_REPLACEMENT');
      }

      if (
        [
          ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED,
          ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED,
          ComplianceRuleCode.AGENT_INACTIVE,
        ].includes(ruleCode)
      ) {
        actions.add('REVIEW_AGENT_FILE');
        actions.add('REASSIGN_SHIFT');
      }
    }

    actions.add('REVALIDATE_SHIFT');
    return Array.from(actions);
  }

  private toShiftReplacementSuggestion(
    agent: Agent,
    ruleCodes: ComplianceRuleCode[],
    shift: { agentId?: number },
  ): ShiftReplacementSuggestion {
    const reasons = ['AVAILABLE_FOR_SHIFT'];
    let score = 70;

    if (agent.id !== shift.agentId) {
      score += 10;
      reasons.push('DIFFERENT_AGENT');
    }

    if (
      ruleCodes.includes(ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED) &&
      agent.agentCompetencies?.length
    ) {
      score += 15;
      reasons.push('HAS_RELEVANT_COMPETENCY');
    }

    if (agent.hospitalServiceId) {
      score += 5;
      reasons.push('HAS_SERVICE_ASSIGNMENT');
    }

    return {
      agentId: agent.id,
      displayName:
        agent.nom ||
        [agent.firstName, agent.lastName].filter(Boolean).join(' ') ||
        `Agent #${agent.id}`,
      jobTitle: agent.jobTitle,
      hospitalServiceId: agent.hospitalServiceId,
      score,
      reasons,
    };
  }

  private hasApprovedComplianceException(shift: Shift): boolean {
    return Boolean(
      shift.complianceExceptionApproved &&
      shift.complianceExceptionReason &&
      shift.complianceExceptionApprovedById &&
      shift.complianceExceptionApprovedAt,
    );
  }

  private getComplianceExceptionSnapshot(
    shift: Shift,
  ): Record<string, unknown> {
    return {
      approved: shift.complianceExceptionApproved,
      reason: shift.complianceExceptionReason,
      approvedById: shift.complianceExceptionApprovedById,
      approvedAt: shift.complianceExceptionApprovedAt,
    };
  }

  private getShiftAuditSnapshot(shift: Shift): Record<string, unknown> {
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
}
