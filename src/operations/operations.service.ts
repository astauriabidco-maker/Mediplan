import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  AssignOperationIncidentDto,
  CloseOperationIncidentDto,
  DeclareOperationIncidentDto,
  EscalateOperationIncidentDto,
  OperationIncidentFiltersDto,
  ResolveOperationIncidentDto,
  RunOperationalEscalationDto,
} from './dto/operation-incident.dto';
import {
  OperationIncident,
  OperationIncidentEvidence,
  OperationIncidentSeverity,
  OperationIncidentStatus,
  OperationIncidentTimelineEntry,
} from './entities/operation-incident.entity';
import {
  OperationalAlertFiltersDto,
  RaiseOperationalAlertDto,
  ResolveOperationalAlertDto,
} from './dto/operational-alert.dto';
import {
  OperationalAlert,
  OperationalAlertSeverity,
  OperationalAlertStatus,
  OperationalAlertType,
} from './entities/operational-alert.entity';
import {
  OperationsJournalEntry,
  OperationsJournalEntrySeverity,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from './entities/operations-journal-entry.entity';
import {
  CreateOperationsJournalEntryDto,
  OperationsJournalQueryDto,
  UpdateOperationsJournalEntryDto,
} from './dto/operations-journal.dto';
import {
  OperationsRunbookAction,
  OperationsRunbookCheck,
  OperationsRunbookDto,
  OperationsRunbookEvidence,
  OperationsRunbookNext,
  OperationsRunbookReference,
  OperationsRunbookRequirement,
  OperationsRunbookSourceType,
  OperationsRunbookStep,
} from './dto/operations-runbook.dto';
import {
  OpsNotificationEventType,
  OpsNotificationStatus,
} from './dto/ops-notification.dto';
import {
  OpsActionCenterItem,
  OpsActionCenterItemType,
  OpsActionCenterPriority,
  OpsActionCenterQueryDto,
  OpsActionCenterResponse,
  OpsActionCenterStatus,
} from './dto/ops-action-center.dto';
import { OpsPreActionValidationService } from './ops-pre-action-validation.service';
import { OpsNotificationService } from './ops-notification.service';

export const OPERATION_INCIDENT_AUDIT_ACTIONS = [
  'AUTO_CREATE_INCIDENT',
  'AUTO_UPDATE_INCIDENT',
  'DECLARE_INCIDENT',
  'ASSIGN_INCIDENT',
  'ESCALATE_INCIDENT',
  'RESOLVE_INCIDENT',
  'CLOSE_INCIDENT',
  'AUTO_ESCALATE_INCIDENT',
] as const;

type IncidentAuditAction = (typeof OPERATION_INCIDENT_AUDIT_ACTIONS)[number];
type EvidenceType = OperationIncidentEvidence['type'];
type AutomaticIncidentSourceType = 'ALERT' | 'SLO' | 'BACKUP' | 'AUDIT';
type EscalationTrigger = 'UNASSIGNED' | 'UNRESOLVED';
type EscalatableSeverity =
  | OperationIncidentSeverity.CRITICAL
  | OperationIncidentSeverity.HIGH;

interface OperationalEscalationRules {
  criticalUnassignedDelayMinutes: number;
  criticalUnresolvedDelayMinutes: number;
  highUnassignedDelayMinutes: number;
  highUnresolvedDelayMinutes: number;
}

interface OperationalEscalationRecord {
  trigger: EscalationTrigger;
  escalatedAt: string;
  thresholdMinutes: number;
  ageMinutes: number;
  escalationUserId: number | null;
}

interface RunbookBuildContext {
  description: string;
  isOpen: boolean;
  isAssigned: boolean;
  isResolved: boolean;
  hasEvidence: boolean;
  ownerId: number | null;
  metadata: Record<string, unknown> | null;
}

export interface OperationalEscalationResult {
  escalatedIncidents: OperationIncident[];
  escalatedAlerts: OperationalAlert[];
  escalatedJournalEntries: OperationsJournalEntry[];
  skipped: {
    incidents: number;
    alerts: number;
    journalEntries: number;
  };
}

const DEFAULT_OPERATIONAL_ESCALATION_RULES: OperationalEscalationRules = {
  criticalUnassignedDelayMinutes: 15,
  criticalUnresolvedDelayMinutes: 60,
  highUnassignedDelayMinutes: 60,
  highUnresolvedDelayMinutes: 240,
};

export interface AutomaticIncidentSignal {
  sourceType: AutomaticIncidentSourceType;
  reference: string;
  title: string;
  description: string;
  severity?: OperationIncidentSeverity | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  checkStatus?: 'OK' | 'KO';
  impactedService?: string;
  evidenceUrl?: string;
  evidenceLabel?: string;
  occurredAt?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface AutomaticIncidentResult {
  incident: OperationIncident | null;
  created: boolean;
  updated: boolean;
  ignoredReason?: 'NON_CRITICAL_ALERT' | 'CONTROL_OK';
}

export interface OperationalAlertSignal {
  type: OperationalAlertType;
  source: string;
  reference: string;
  checkStatus: 'OK' | 'KO';
  message: string;
  severity?: OperationalAlertSeverity;
  metadata?: Record<string, unknown>;
}

export type OperationalAlertSyncResult =
  | { alert: OperationalAlert; action: 'OPENED_OR_UPDATED' }
  | { alert: OperationalAlert; action: 'RESOLVED' }
  | { alert: null; action: 'NO_OPEN_ALERT' };

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(OperationsJournalEntry)
    private readonly journalRepository: Repository<OperationsJournalEntry>,
    @InjectRepository(OperationIncident)
    private readonly incidentRepository: Repository<OperationIncident>,
    @InjectRepository(OperationalAlert)
    private readonly alertRepository: Repository<OperationalAlert>,
    private readonly auditService: AuditService,
    private readonly opsNotificationService: OpsNotificationService,
    private readonly preActionValidationService: OpsPreActionValidationService,
  ) {}

  async getActionCenter(
    tenantId: string,
    filters: OpsActionCenterQueryDto = {},
  ): Promise<OpsActionCenterResponse> {
    const limit = Math.min(filters.limit || 100, 500);
    const [alerts, incidents, journalEntries] = await Promise.all([
      this.alertRepository.find({
        where: {
          tenantId,
          status: OperationalAlertStatus.OPEN,
        },
        order: { severity: 'DESC', openedAt: 'ASC', id: 'ASC' },
        take: 500,
      }),
      this.incidentRepository.find({
        where: {
          tenantId,
          status: In([
            OperationIncidentStatus.OPEN,
            OperationIncidentStatus.DECLARED,
            OperationIncidentStatus.ASSIGNED,
            OperationIncidentStatus.ESCALATED,
          ]),
        },
        order: { severity: 'DESC', declaredAt: 'ASC', id: 'ASC' },
        take: 500,
      }),
      this.journalRepository.find({
        where: {
          tenantId,
          status: In([
            OperationsJournalEntryStatus.RECORDED,
            OperationsJournalEntryStatus.OPEN,
            OperationsJournalEntryStatus.IN_PROGRESS,
          ]),
        },
        order: { severity: 'DESC', occurredAt: 'ASC', id: 'ASC' },
        take: 500,
      }),
    ]);

    const items = [
      ...alerts.map((alert) => this.toAlertActionCenterItem(alert)),
      ...incidents.flatMap((incident) =>
        this.toIncidentActionCenterItems(incident),
      ),
      ...journalEntries.flatMap((entry) =>
        this.toJournalActionCenterItems(entry),
      ),
    ]
      .filter((item) => !filters.status || item.status === filters.status)
      .filter((item) => !filters.type || item.type === filters.type)
      .sort((left, right) => this.compareActionCenterItems(left, right))
      .slice(0, limit);

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      total: items.length,
      filters: {
        status: filters.status ?? null,
        type: filters.type ?? null,
        limit,
      },
      items,
    };
  }

  findJournalEntries(
    tenantId: string,
    filters: OperationsJournalQueryDto = {},
  ) {
    const where: FindOptionsWhere<OperationsJournalEntry> = { tenantId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.relatedAuditLogId) {
      where.relatedAuditLogId = filters.relatedAuditLogId;
    }
    if (filters.relatedReference) {
      where.relatedReference = filters.relatedReference;
    }

    if (filters.from && filters.to) {
      where.occurredAt = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters.from) {
      where.occurredAt = MoreThanOrEqual(new Date(filters.from));
    } else if (filters.to) {
      where.occurredAt = LessThanOrEqual(new Date(filters.to));
    }

    return this.journalRepository.find({
      where,
      order: { occurredAt: 'DESC', id: 'DESC' },
      take: Math.min(filters.limit || 100, 500),
    });
  }

  findAlerts(tenantId: string, filters: OperationalAlertFiltersDto = {}) {
    const where: FindOptionsWhere<OperationalAlert> = { tenantId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.source) where.source = filters.source;
    if (filters.sourceReference)
      where.sourceReference = filters.sourceReference;

    return this.alertRepository.find({
      where,
      order: { status: 'ASC', lastSeenAt: 'DESC', id: 'DESC' },
      take: Math.min(filters.limit || 100, 500),
    });
  }

  async getAlert(tenantId: string, id: number) {
    return this.getAlertOrThrow(tenantId, id);
  }

  async raiseOperationalAlert(
    tenantId: string,
    dto: RaiseOperationalAlertDto,
    actorId: number,
  ) {
    const existingOpenAlert = await this.alertRepository.findOne({
      where: {
        tenantId,
        type: dto.type,
        source: dto.source,
        sourceReference: dto.sourceReference,
        status: OperationalAlertStatus.OPEN,
      },
    });
    const now = new Date();

    if (existingOpenAlert) {
      const before = this.toAlertAuditSnapshot(existingOpenAlert);
      existingOpenAlert.severity = dto.severity;
      existingOpenAlert.message = dto.message;
      existingOpenAlert.metadata = dto.metadata ?? existingOpenAlert.metadata;
      existingOpenAlert.lastSeenAt = now;
      existingOpenAlert.occurrenceCount =
        (existingOpenAlert.occurrenceCount || 1) + 1;
      const savedAlert = await this.alertRepository.save(existingOpenAlert);
      await this.writeAlertAudit(
        tenantId,
        actorId,
        AuditAction.UPDATE,
        'DEDUP_OPERATIONAL_ALERT',
        savedAlert,
        before,
      );
      return savedAlert;
    }

    const alert = this.alertRepository.create({
      tenantId,
      type: dto.type,
      severity: dto.severity,
      status: OperationalAlertStatus.OPEN,
      source: dto.source,
      sourceReference: dto.sourceReference,
      message: dto.message,
      metadata: dto.metadata ?? null,
      openedAt: now,
      lastSeenAt: now,
      occurrenceCount: 1,
      resolvedAt: null,
      resolvedById: null,
      resolutionSummary: null,
      createAuditLogId: null,
      resolveAuditLogId: null,
    });
    const savedAlert = await this.alertRepository.save(alert);
    const auditLog = await this.writeAlertAudit(
      tenantId,
      actorId,
      AuditAction.CREATE,
      'CREATE_OPERATIONAL_ALERT',
      savedAlert,
      null,
    );
    savedAlert.createAuditLogId = auditLog.id;
    const alertWithAudit = await this.alertRepository.save(savedAlert);
    await this.writeAlertJournalEntry(tenantId, actorId, alertWithAudit);
    return alertWithAudit;
  }

  async resolveAlert(
    tenantId: string,
    id: number,
    dto: ResolveOperationalAlertDto,
    actorId: number,
  ) {
    const alert = await this.getAlertOrThrow(tenantId, id);
    this.preActionValidationService.assertAllowed({
      action: 'RESOLVE_ALERT',
      tenantId,
      resourceTenantId: alert.tenantId,
      currentState: alert.status,
      hasRequiredEvidence: Boolean(dto.resolutionSummary),
    });
    return this.resolveOpenAlert(
      tenantId,
      alert,
      dto.resolutionSummary,
      actorId,
    );
  }

  async resolveOperationalAlertByReference(
    tenantId: string,
    type: OperationalAlertType,
    source: string,
    sourceReference: string,
    resolutionSummary: string,
    actorId: number,
  ) {
    const alert = await this.alertRepository.findOne({
      where: {
        tenantId,
        type,
        source,
        sourceReference,
        status: OperationalAlertStatus.OPEN,
      },
    });

    if (!alert) return null;
    this.preActionValidationService.assertAllowed({
      action: 'RESOLVE_ALERT',
      tenantId,
      resourceTenantId: alert.tenantId,
      currentState: alert.status,
      hasRequiredEvidence: Boolean(resolutionSummary),
    });

    return this.resolveOpenAlert(tenantId, alert, resolutionSummary, actorId);
  }

  async getJournalEntry(tenantId: string, id: number) {
    return this.getJournalEntryOrThrow(tenantId, id);
  }

  async createJournalEntry(
    tenantId: string,
    dto: CreateOperationsJournalEntryDto,
    actorId: number,
  ) {
    this.validateJournalMutation(
      dto.type,
      dto.status,
      dto.resolvedAt,
      dto.evidenceUrl,
    );

    const entry = this.journalRepository.create({
      tenantId,
      type: dto.type,
      status: dto.status || this.defaultJournalStatus(dto.type),
      severity: dto.severity || OperationsJournalEntrySeverity.MEDIUM,
      title: dto.title,
      description: dto.description ?? null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null,
      ownerId: dto.ownerId ?? null,
      createdById: actorId,
      updatedById: null,
      auditLogId: null,
      relatedAuditLogId: dto.relatedAuditLogId ?? null,
      relatedReference: dto.relatedReference ?? null,
      evidenceUrl: dto.evidenceUrl ?? null,
      evidenceLabel: dto.evidenceLabel ?? null,
      metadata: dto.metadata ?? null,
    });

    const savedEntry = await this.journalRepository.save(entry);
    const auditLog = await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.CREATE,
      AuditEntityType.PLANNING,
      `operations-journal:${savedEntry.id}`,
      {
        action: 'CREATE_OPERATIONS_JOURNAL_ENTRY',
        journalEntryId: savedEntry.id,
        journalEntryType: savedEntry.type,
        relatedAuditLogId: savedEntry.relatedAuditLogId,
        after: this.toJournalAuditSnapshot(savedEntry),
      },
    );

    savedEntry.auditLogId = auditLog.id;
    return this.journalRepository.save(savedEntry);
  }

  async updateJournalEntry(
    tenantId: string,
    id: number,
    dto: UpdateOperationsJournalEntryDto,
    actorId: number,
  ) {
    const entry = await this.getJournalEntryOrThrow(tenantId, id);
    const nextStatus = dto.status ?? entry.status;
    this.validateJournalMutation(
      entry.type,
      nextStatus,
      dto.resolvedAt ? new Date(dto.resolvedAt) : entry.resolvedAt,
      dto.evidenceUrl ?? entry.evidenceUrl ?? undefined,
    );
    const before = this.toJournalAuditSnapshot(entry);

    Object.assign(entry, {
      status: nextStatus,
      severity: dto.severity ?? entry.severity,
      title: dto.title ?? entry.title,
      description: dto.description ?? entry.description,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : entry.occurredAt,
      resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : entry.resolvedAt,
      ownerId: dto.ownerId ?? entry.ownerId,
      relatedAuditLogId: dto.relatedAuditLogId ?? entry.relatedAuditLogId,
      relatedReference: dto.relatedReference ?? entry.relatedReference,
      evidenceUrl: dto.evidenceUrl ?? entry.evidenceUrl,
      evidenceLabel: dto.evidenceLabel ?? entry.evidenceLabel,
      metadata: dto.metadata ?? entry.metadata,
      updatedById: actorId,
    });

    const savedEntry = await this.journalRepository.save(entry);
    const auditLog = await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      `operations-journal:${savedEntry.id}`,
      {
        action: 'UPDATE_OPERATIONS_JOURNAL_ENTRY',
        journalEntryId: savedEntry.id,
        journalEntryType: savedEntry.type,
        relatedAuditLogId: savedEntry.relatedAuditLogId,
        before,
        after: this.toJournalAuditSnapshot(savedEntry),
      },
    );

    savedEntry.auditLogId = auditLog.id;
    return this.journalRepository.save(savedEntry);
  }

  findIncidents(tenantId: string, filters: OperationIncidentFiltersDto = {}) {
    const where: FindOptionsWhere<OperationIncident> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    return this.incidentRepository.find({
      where,
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: 200,
    });
  }

  async findIncident(tenantId: string, id: number) {
    return this.getIncidentOrThrow(tenantId, id);
  }

  async declareIncident(
    tenantId: string,
    dto: DeclareOperationIncidentDto,
    actorId: number,
  ) {
    this.preActionValidationService.assertAllowed({
      action: 'DECLARE_INCIDENT',
      tenantId,
      hasRequiredEvidence: Boolean(
        dto.title && dto.description && dto.severity,
      ),
    });
    const now = new Date();
    const evidence = this.createEvidence(
      dto.evidenceUrl,
      dto.evidenceLabel,
      'DECLARATION',
      actorId,
      now,
    );
    const incident = this.incidentRepository.create({
      tenantId,
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      status: OperationIncidentStatus.DECLARED,
      impactedService: dto.impactedService ?? null,
      evidenceUrl: dto.evidenceUrl ?? null,
      evidenceLabel: dto.evidenceLabel ?? null,
      declaredById: actorId,
      declaredAt: now,
      assignedToId: null,
      assignedAt: null,
      escalatedToId: null,
      escalationReason: null,
      escalatedAt: null,
      resolutionSummary: null,
      resolvedById: null,
      resolvedAt: null,
      closureSummary: null,
      closedById: null,
      closedAt: null,
      evidence: evidence ? [evidence] : [],
      timeline: [
        this.createTimelineEntry(
          'DECLARE_INCIDENT',
          actorId,
          null,
          null,
          OperationIncidentStatus.DECLARED,
          {
            severity: dto.severity,
            impactedService: dto.impactedService ?? null,
            evidenceUrl: dto.evidenceUrl ?? null,
          },
          now,
        ),
      ],
      metadata: null,
    });
    const savedIncident = await this.incidentRepository.save(incident);

    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.CREATE,
      'DECLARE_INCIDENT',
      savedIncident,
      null,
    );
    await this.opsNotificationService.notifyIncidentDeclared(savedIncident);

    if (savedIncident.severity === OperationIncidentSeverity.CRITICAL) {
      await this.raiseOperationalAlert(
        tenantId,
        {
          type: OperationalAlertType.CRITICAL_INCIDENT_OPEN,
          severity: OperationalAlertSeverity.CRITICAL,
          source: 'operations.incidents',
          sourceReference: this.incidentAlertReference(savedIncident),
          message: `Incident critique ouvert: ${savedIncident.title}`,
          metadata: {
            incidentId: savedIncident.id,
            impactedService: savedIncident.impactedService,
            status: savedIncident.status,
          },
        },
        actorId,
      );
    }

    return savedIncident;
  }

  async syncAutomaticIncident(
    tenantId: string,
    signal: AutomaticIncidentSignal,
    actorId: number,
  ): Promise<AutomaticIncidentResult> {
    const severity = this.resolveAutomaticSeverity(signal);
    if (!severity) {
      return {
        incident: null,
        created: false,
        updated: false,
        ignoredReason:
          signal.sourceType === 'ALERT' ? 'NON_CRITICAL_ALERT' : 'CONTROL_OK',
      };
    }

    const now = new Date();
    const occurredAt = signal.occurredAt ? new Date(signal.occurredAt) : now;
    const existingIncident = await this.findOpenAutomaticIncident(
      tenantId,
      signal.sourceType,
      signal.reference,
    );

    if (existingIncident) {
      return this.updateAutomaticIncident(
        tenantId,
        existingIncident,
        signal,
        severity,
        actorId,
        now,
      );
    }

    return this.createAutomaticIncident(
      tenantId,
      signal,
      severity,
      actorId,
      now,
      occurredAt,
    );
  }

  async syncOperationalAlert(
    tenantId: string,
    signal: OperationalAlertSignal,
    actorId: number,
  ): Promise<OperationalAlertSyncResult> {
    if (signal.checkStatus === 'OK') {
      const alert = await this.resolveOperationalAlertByReference(
        tenantId,
        signal.type,
        signal.source,
        signal.reference,
        signal.message,
        actorId,
      );

      return alert
        ? { alert, action: 'RESOLVED' }
        : { alert: null, action: 'NO_OPEN_ALERT' };
    }

    const alert = await this.raiseOperationalAlert(
      tenantId,
      {
        type: signal.type,
        severity: signal.severity ?? OperationalAlertSeverity.HIGH,
        source: signal.source,
        sourceReference: signal.reference,
        message: signal.message,
        metadata: signal.metadata,
      },
      actorId,
    );

    return { alert, action: 'OPENED_OR_UPDATED' };
  }

  async assignIncident(
    tenantId: string,
    id: number,
    dto: AssignOperationIncidentDto,
    actorId: number,
  ) {
    const incident = await this.getIncidentOrThrow(tenantId, id);
    this.preActionValidationService.assertAllowed({
      action: 'ASSIGN_INCIDENT',
      tenantId,
      resourceTenantId: incident.tenantId,
      currentState: incident.status,
      hasRequiredEvidence: Boolean(dto.assignedToId),
    });
    const before = this.toAuditSnapshot(incident);
    const previousStatus = incident.status;
    const now = new Date();

    incident.status = OperationIncidentStatus.ASSIGNED;
    incident.assignedToId = dto.assignedToId;
    incident.assignedAt = now;
    incident.timeline = [
      ...this.timelineOf(incident),
      this.createTimelineEntry(
        'ASSIGN_INCIDENT',
        actorId,
        dto.note ?? null,
        previousStatus,
        incident.status,
        { assignedToId: dto.assignedToId },
        now,
      ),
    ];

    const savedIncident = await this.incidentRepository.save(incident);
    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'ASSIGN_INCIDENT',
      savedIncident,
      before,
    );

    return savedIncident;
  }

  async escalateIncident(
    tenantId: string,
    id: number,
    dto: EscalateOperationIncidentDto,
    actorId: number,
  ) {
    const incident = await this.getIncidentOrThrow(tenantId, id);
    this.preActionValidationService.assertAllowed({
      action: 'ESCALATE_INCIDENT',
      tenantId,
      resourceTenantId: incident.tenantId,
      currentState: incident.status,
      hasRequiredEvidence: Boolean(dto.escalatedToId && dto.reason),
    });
    const before = this.toAuditSnapshot(incident);
    const previousStatus = incident.status;
    const now = new Date();
    const evidence = this.createEvidence(
      dto.evidenceUrl,
      dto.evidenceLabel,
      'ESCALATION',
      actorId,
      now,
    );

    incident.status = OperationIncidentStatus.ESCALATED;
    incident.escalatedToId = dto.escalatedToId;
    incident.escalationReason = dto.reason;
    incident.escalatedAt = now;
    incident.evidence = evidence
      ? [...this.evidenceOf(incident), evidence]
      : this.evidenceOf(incident);
    incident.timeline = [
      ...this.timelineOf(incident),
      this.createTimelineEntry(
        'ESCALATE_INCIDENT',
        actorId,
        dto.reason,
        previousStatus,
        incident.status,
        {
          escalatedToId: dto.escalatedToId,
          evidenceUrl: dto.evidenceUrl ?? null,
        },
        now,
      ),
    ];

    const savedIncident = await this.incidentRepository.save(incident);
    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'ESCALATE_INCIDENT',
      savedIncident,
      before,
    );
    await this.opsNotificationService.notifyIncidentEscalated(savedIncident);

    return savedIncident;
  }

  async resolveIncident(
    tenantId: string,
    id: number,
    dto: ResolveOperationIncidentDto,
    actorId: number,
  ) {
    const incident = await this.getIncidentOrThrow(tenantId, id);
    this.preActionValidationService.assertAllowed({
      action: 'RESOLVE_INCIDENT',
      tenantId,
      resourceTenantId: incident.tenantId,
      currentState: incident.status,
      hasRequiredEvidence: Boolean(dto.resolutionSummary && dto.evidenceUrl),
    });
    const before = this.toAuditSnapshot(incident);
    const previousStatus = incident.status;
    const now = new Date();
    const evidence = this.createEvidence(
      dto.evidenceUrl,
      dto.evidenceLabel,
      'RESOLUTION',
      actorId,
      now,
    );

    incident.status = OperationIncidentStatus.RESOLVED;
    incident.resolutionSummary = dto.resolutionSummary;
    incident.resolvedById = actorId;
    incident.resolvedAt = now;
    incident.evidence = [...this.evidenceOf(incident), evidence!];
    incident.timeline = [
      ...this.timelineOf(incident),
      this.createTimelineEntry(
        'RESOLVE_INCIDENT',
        actorId,
        dto.resolutionSummary,
        previousStatus,
        incident.status,
        { evidenceUrl: dto.evidenceUrl },
        now,
      ),
    ];

    const savedIncident = await this.incidentRepository.save(incident);
    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'RESOLVE_INCIDENT',
      savedIncident,
      before,
    );

    if (savedIncident.severity === OperationIncidentSeverity.CRITICAL) {
      await this.resolveOperationalAlertByReference(
        tenantId,
        OperationalAlertType.CRITICAL_INCIDENT_OPEN,
        'operations.incidents',
        this.incidentAlertReference(savedIncident),
        `Incident critique resolu: ${dto.resolutionSummary}`,
        actorId,
      );
    }

    return savedIncident;
  }

  async closeIncident(
    tenantId: string,
    id: number,
    dto: CloseOperationIncidentDto,
    actorId: number,
  ) {
    const incident = await this.getIncidentOrThrow(tenantId, id);
    this.preActionValidationService.assertAllowed({
      action: 'CLOSE_INCIDENT',
      tenantId,
      resourceTenantId: incident.tenantId,
      currentState: incident.status,
      hasRequiredEvidence: Boolean(dto.closureSummary && dto.evidenceUrl),
    });
    const before = this.toAuditSnapshot(incident);
    const previousStatus = incident.status;
    const now = new Date();
    const evidence = this.createEvidence(
      dto.evidenceUrl,
      dto.evidenceLabel,
      'CLOSURE',
      actorId,
      now,
    );

    incident.status = OperationIncidentStatus.CLOSED;
    incident.closureSummary = dto.closureSummary;
    incident.closedById = actorId;
    incident.closedAt = now;
    incident.evidence = [...this.evidenceOf(incident), evidence!];
    incident.timeline = [
      ...this.timelineOf(incident),
      this.createTimelineEntry(
        'CLOSE_INCIDENT',
        actorId,
        dto.closureSummary,
        previousStatus,
        incident.status,
        { evidenceUrl: dto.evidenceUrl },
        now,
      ),
    ];

    const savedIncident = await this.incidentRepository.save(incident);
    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'CLOSE_INCIDENT',
      savedIncident,
      before,
    );

    if (savedIncident.severity === OperationIncidentSeverity.CRITICAL) {
      await this.resolveOperationalAlertByReference(
        tenantId,
        OperationalAlertType.CRITICAL_INCIDENT_OPEN,
        'operations.incidents',
        this.incidentAlertReference(savedIncident),
        `Incident critique clos: ${dto.closureSummary}`,
        actorId,
      );
    }

    return savedIncident;
  }

  async generateAlertRunbook(
    tenantId: string,
    id: number,
  ): Promise<OperationsRunbookDto> {
    const alert = await this.getAlertOrThrow(tenantId, id);
    return this.buildRunbook(
      {
        sourceType: 'ALERT',
        id: alert.id,
        tenantId: alert.tenantId,
        title: alert.message,
        status: alert.status,
        severity: alert.severity,
        occurredAt: alert.openedAt.toISOString(),
        source: alert.source,
        sourceReference: alert.sourceReference,
      },
      {
        description: alert.message,
        isOpen: alert.status === OperationalAlertStatus.OPEN,
        isAssigned: false,
        isResolved: alert.status === OperationalAlertStatus.RESOLVED,
        hasEvidence: false,
        ownerId: null,
        metadata: alert.metadata,
      },
    );
  }

  async generateIncidentRunbook(
    tenantId: string,
    id: number,
  ): Promise<OperationsRunbookDto> {
    const incident = await this.getIncidentOrThrow(tenantId, id);
    return this.buildRunbook(
      {
        sourceType: 'INCIDENT',
        id: incident.id,
        tenantId: incident.tenantId,
        title: incident.title,
        status: incident.status,
        severity: incident.severity,
        occurredAt: incident.declaredAt.toISOString(),
        impactedService: incident.impactedService,
      },
      {
        description: incident.description,
        isOpen: ![
          OperationIncidentStatus.RESOLVED,
          OperationIncidentStatus.CLOSED,
        ].includes(incident.status),
        isAssigned: Boolean(incident.assignedToId || incident.escalatedToId),
        isResolved: [
          OperationIncidentStatus.RESOLVED,
          OperationIncidentStatus.CLOSED,
        ].includes(incident.status),
        hasEvidence: this.evidenceOf(incident).length > 0,
        ownerId: incident.assignedToId ?? incident.escalatedToId,
        metadata: incident.metadata,
      },
    );
  }

  async generateJournalRunbook(
    tenantId: string,
    id: number,
  ): Promise<OperationsRunbookDto> {
    const entry = await this.getJournalEntryOrThrow(tenantId, id);
    return this.buildRunbook(
      {
        sourceType: 'JOURNAL',
        id: entry.id,
        tenantId: entry.tenantId,
        title: entry.title,
        status: entry.status,
        severity: entry.severity,
        occurredAt: entry.occurredAt.toISOString(),
        relatedReference: entry.relatedReference,
      },
      {
        description: entry.description ?? entry.title,
        isOpen: ![
          OperationsJournalEntryStatus.RESOLVED,
          OperationsJournalEntryStatus.CLOSED,
        ].includes(entry.status),
        isAssigned: Boolean(entry.ownerId),
        isResolved: [
          OperationsJournalEntryStatus.RESOLVED,
          OperationsJournalEntryStatus.CLOSED,
        ].includes(entry.status),
        hasEvidence: Boolean(entry.evidenceUrl),
        ownerId: entry.ownerId,
        metadata: entry.metadata,
      },
    );
  }

  async runOperationalEscalation(
    tenantId: string,
    dto: RunOperationalEscalationDto = {},
    actorId: number,
  ): Promise<OperationalEscalationResult> {
    this.preActionValidationService.assertAllowed({
      action: 'RUN_OPERATIONAL_ESCALATION',
      tenantId,
      hasRequiredEvidence: true,
    });
    const now = dto.now ? new Date(dto.now) : new Date();
    const rules = this.resolveEscalationRules(dto);
    const escalationUserId = dto.escalationUserId ?? null;
    const [incidentCandidates, alertCandidates, journalCandidates] =
      await Promise.all([
        this.incidentRepository.find({
          where: {
            tenantId,
            severity: In([
              OperationIncidentSeverity.CRITICAL,
              OperationIncidentSeverity.HIGH,
            ]),
            status: In([
              OperationIncidentStatus.OPEN,
              OperationIncidentStatus.DECLARED,
              OperationIncidentStatus.ASSIGNED,
              OperationIncidentStatus.ESCALATED,
            ]),
          },
          order: { declaredAt: 'ASC', id: 'ASC' },
        }),
        this.alertRepository.find({
          where: {
            tenantId,
            severity: In([
              OperationalAlertSeverity.CRITICAL,
              OperationalAlertSeverity.HIGH,
            ]),
            status: OperationalAlertStatus.OPEN,
          },
          order: { openedAt: 'ASC', id: 'ASC' },
        }),
        this.journalRepository.find({
          where: {
            tenantId,
            severity: In([
              OperationsJournalEntrySeverity.CRITICAL,
              OperationsJournalEntrySeverity.HIGH,
            ]),
            status: In([
              OperationsJournalEntryStatus.OPEN,
              OperationsJournalEntryStatus.IN_PROGRESS,
            ]),
          },
          order: { occurredAt: 'ASC', id: 'ASC' },
        }),
      ]);

    const escalatedIncidents: OperationIncident[] = [];
    const escalatedAlerts: OperationalAlert[] = [];
    const escalatedJournalEntries: OperationsJournalEntry[] = [];
    let skippedIncidents = 0;
    let skippedAlerts = 0;
    let skippedJournalEntries = 0;

    for (const incident of incidentCandidates) {
      const decision = this.getIncidentEscalationDecision(incident, rules, now);
      if (
        !decision ||
        this.hasIncidentOperationalEscalation(incident, decision.trigger)
      ) {
        skippedIncidents += 1;
        continue;
      }

      const savedIncident = await this.escalateIncidentOperationally(
        tenantId,
        incident,
        decision,
        escalationUserId,
        actorId,
        now,
      );
      escalatedIncidents.push(savedIncident);
    }

    for (const alert of alertCandidates) {
      const decision = this.getAlertEscalationDecision(alert, rules, now);
      if (
        !decision ||
        this.hasMetadataOperationalEscalation(alert.metadata, decision.trigger)
      ) {
        skippedAlerts += 1;
        continue;
      }

      const savedAlert = await this.escalateAlertOperationally(
        tenantId,
        alert,
        decision,
        escalationUserId,
        actorId,
        now,
      );
      escalatedAlerts.push(savedAlert);
    }

    for (const entry of journalCandidates) {
      const decision = this.getJournalEscalationDecision(entry, rules, now);
      if (
        !decision ||
        this.hasMetadataOperationalEscalation(entry.metadata, decision.trigger)
      ) {
        skippedJournalEntries += 1;
        continue;
      }

      const savedEntry = await this.escalateJournalEntryOperationally(
        tenantId,
        entry,
        decision,
        escalationUserId,
        actorId,
        now,
      );
      escalatedJournalEntries.push(savedEntry);
    }

    return {
      escalatedIncidents,
      escalatedAlerts,
      escalatedJournalEntries,
      skipped: {
        incidents: skippedIncidents,
        alerts: skippedAlerts,
        journalEntries: skippedJournalEntries,
      },
    };
  }

  private toAlertActionCenterItem(
    alert: OperationalAlert,
  ): OpsActionCenterItem {
    const escalation = this.latestOperationalEscalation(alert.metadata);
    const status = escalation
      ? OpsActionCenterStatus.ESCALATED
      : OpsActionCenterStatus.OPEN;

    return {
      id: `operational-alert:${alert.id}`,
      type: OpsActionCenterItemType.OPERATIONAL_ALERT,
      priority: this.toActionPriority(alert.severity),
      status,
      title: `Alerte ouverte: ${alert.type}`,
      reason: alert.message,
      requiredEvidence: ['Preuve de remediation ou decision de maintien'],
      suggestedActions: [
        'Qualifier impact production',
        'Declarer ou rattacher un incident si impact confirme',
        'Resoudre alerte avec resume et preuve',
      ],
      sourceReference: {
        entity: 'OperationalAlert',
        id: alert.id,
        tenantId: alert.tenantId,
        reference: `${alert.source}:${alert.sourceReference}`,
      },
      timestamps: {
        createdAt: this.toIsoString(alert.createdAt),
        updatedAt: this.toIsoString(alert.updatedAt),
        occurredAt: this.toIsoString(alert.openedAt) || '',
        lastSeenAt: this.toIsoString(alert.lastSeenAt),
        escalatedAt: escalation?.escalatedAt ?? null,
        resolvedAt: this.toIsoString(alert.resolvedAt),
      },
    };
  }

  private toIncidentActionCenterItems(
    incident: OperationIncident,
  ): OpsActionCenterItem[] {
    const items: OpsActionCenterItem[] = [];
    const isAutomaticIncident = this.isAutomaticIncident(incident);

    if (
      isAutomaticIncident ||
      incident.status === OperationIncidentStatus.ESCALATED
    ) {
      items.push(this.toIncidentPrimaryActionCenterItem(incident));
    }

    if (this.isIncidentMissingEvidence(incident)) {
      items.push(this.toIncidentMissingEvidenceActionCenterItem(incident));
    }

    return items;
  }

  private toIncidentPrimaryActionCenterItem(
    incident: OperationIncident,
  ): OpsActionCenterItem {
    const isEscalated = incident.status === OperationIncidentStatus.ESCALATED;
    const auto = this.autoMetadataOf(incident);
    const reference =
      typeof auto.reference === 'string'
        ? auto.reference
        : this.incidentAlertReference(incident);

    return {
      id: isEscalated
        ? `operation-incident:${incident.id}:escalation`
        : `operation-incident:${incident.id}:auto`,
      type: isEscalated
        ? OpsActionCenterItemType.INCIDENT_ESCALATION
        : OpsActionCenterItemType.AUTO_INCIDENT,
      priority: this.toActionPriority(incident.severity),
      status: this.toIncidentActionStatus(incident),
      title: incident.title,
      reason: isEscalated
        ? incident.escalationReason ||
          'Incident escalade en attente de prise en charge'
        : incident.description,
      requiredEvidence: this.isIncidentMissingEvidence(incident)
        ? ['Preuve initiale ou rapport automatique']
        : [],
      suggestedActions: isEscalated
        ? [
            'Confirmer le responsable d escalade',
            'Documenter la decision de mitigation',
            'Resoudre avec preuve de correction',
          ]
        : [
            'Qualifier le signal automatique',
            'Assigner un responsable operations',
            'Ajouter une preuve si le signal est confirme',
          ],
      sourceReference: {
        entity: 'OperationIncident',
        id: incident.id,
        tenantId: incident.tenantId,
        reference,
      },
      timestamps: {
        createdAt: this.toIsoString(incident.createdAt),
        updatedAt: this.toIsoString(incident.updatedAt),
        occurredAt: this.toIsoString(incident.declaredAt) || '',
        escalatedAt: this.toIsoString(incident.escalatedAt),
        resolvedAt: this.toIsoString(incident.resolvedAt),
      },
    };
  }

  private toIncidentMissingEvidenceActionCenterItem(
    incident: OperationIncident,
  ): OpsActionCenterItem {
    return {
      id: `operation-incident:${incident.id}:missing-evidence`,
      type: OpsActionCenterItemType.MISSING_EVIDENCE,
      priority: this.toActionPriority(incident.severity),
      status: OpsActionCenterStatus.WAITING_EVIDENCE,
      title: `Preuve manquante: ${incident.title}`,
      reason: 'Incident actif sans preuve attachee',
      requiredEvidence: ['URL de preuve incident', 'Libelle de preuve'],
      suggestedActions: [
        'Joindre la preuve de detection ou de diagnostic',
        'Completer le journal de production',
      ],
      sourceReference: {
        entity: 'OperationIncident',
        id: incident.id,
        tenantId: incident.tenantId,
        reference: this.incidentAlertReference(incident),
      },
      timestamps: {
        createdAt: this.toIsoString(incident.createdAt),
        updatedAt: this.toIsoString(incident.updatedAt),
        occurredAt: this.toIsoString(incident.declaredAt) || '',
        escalatedAt: this.toIsoString(incident.escalatedAt),
        resolvedAt: this.toIsoString(incident.resolvedAt),
      },
    };
  }

  private toJournalActionCenterItems(
    entry: OperationsJournalEntry,
  ): OpsActionCenterItem[] {
    if (entry.type === OperationsJournalEntryType.DECISION) {
      return [this.toJournalDecisionActionCenterItem(entry)];
    }

    if (
      entry.type === OperationsJournalEntryType.EVIDENCE &&
      !entry.evidenceUrl
    ) {
      return [this.toJournalMissingEvidenceActionCenterItem(entry)];
    }

    if (
      entry.type === OperationsJournalEntryType.ACTION ||
      entry.type === OperationsJournalEntryType.INCIDENT
    ) {
      return [this.toJournalActionCenterItem(entry)];
    }

    return [];
  }

  private toJournalDecisionActionCenterItem(
    entry: OperationsJournalEntry,
  ): OpsActionCenterItem {
    return {
      id: `operations-journal:${entry.id}:decision`,
      type: OpsActionCenterItemType.DECISION_REQUIRED,
      priority: this.toActionPriority(entry.severity),
      status: OpsActionCenterStatus.WAITING_DECISION,
      title: entry.title,
      reason: entry.description || 'Decision production en attente',
      requiredEvidence: ['Decision documentee', 'Responsable decision'],
      suggestedActions: [
        'Capturer la decision go/no-go ou mitigation',
        'Rattacher une reference de preuve',
        'Passer l entree en resolu apres validation',
      ],
      sourceReference: this.toJournalSourceReference(entry),
      timestamps: this.toJournalActionTimestamps(entry),
    };
  }

  private toJournalMissingEvidenceActionCenterItem(
    entry: OperationsJournalEntry,
  ): OpsActionCenterItem {
    return {
      id: `operations-journal:${entry.id}:missing-evidence`,
      type: OpsActionCenterItemType.MISSING_EVIDENCE,
      priority: this.toActionPriority(entry.severity),
      status: OpsActionCenterStatus.WAITING_EVIDENCE,
      title: `Preuve manquante: ${entry.title}`,
      reason: entry.description || 'Entree de preuve sans URL de preuve',
      requiredEvidence: ['URL de preuve', 'Libelle de preuve'],
      suggestedActions: [
        'Ajouter l URL de preuve',
        'Rattacher la reference audit ou production',
      ],
      sourceReference: this.toJournalSourceReference(entry),
      timestamps: this.toJournalActionTimestamps(entry),
    };
  }

  private toJournalActionCenterItem(
    entry: OperationsJournalEntry,
  ): OpsActionCenterItem {
    const escalation = this.latestOperationalEscalation(entry.metadata);

    return {
      id: `operations-journal:${entry.id}:action`,
      type: OpsActionCenterItemType.JOURNAL_ACTION,
      priority: this.toActionPriority(entry.severity),
      status: escalation
        ? OpsActionCenterStatus.ESCALATED
        : this.toJournalActionStatus(entry),
      title: entry.title,
      reason: entry.description || 'Action production ouverte',
      requiredEvidence: entry.evidenceUrl ? [] : ['Preuve de traitement'],
      suggestedActions: [
        'Assigner un responsable si necessaire',
        'Completer les preuves',
        'Resoudre ou fermer apres verification',
      ],
      sourceReference: this.toJournalSourceReference(entry),
      timestamps: {
        ...this.toJournalActionTimestamps(entry),
        escalatedAt: escalation?.escalatedAt ?? null,
      },
    };
  }

  private toJournalSourceReference(entry: OperationsJournalEntry) {
    return {
      entity: 'OperationsJournalEntry' as const,
      id: entry.id,
      tenantId: entry.tenantId,
      reference: entry.relatedReference || `operations-journal:${entry.id}`,
    };
  }

  private toJournalActionTimestamps(entry: OperationsJournalEntry) {
    return {
      createdAt: this.toIsoString(entry.createdAt),
      updatedAt: this.toIsoString(entry.updatedAt),
      occurredAt: this.toIsoString(entry.occurredAt) || '',
      resolvedAt: this.toIsoString(entry.resolvedAt),
    };
  }

  private toIncidentActionStatus(
    incident: OperationIncident,
  ): OpsActionCenterStatus {
    if (incident.status === OperationIncidentStatus.ESCALATED) {
      return OpsActionCenterStatus.ESCALATED;
    }

    if (incident.status === OperationIncidentStatus.ASSIGNED) {
      return OpsActionCenterStatus.IN_PROGRESS;
    }

    return OpsActionCenterStatus.OPEN;
  }

  private toJournalActionStatus(
    entry: OperationsJournalEntry,
  ): OpsActionCenterStatus {
    if (entry.status === OperationsJournalEntryStatus.IN_PROGRESS) {
      return OpsActionCenterStatus.IN_PROGRESS;
    }

    return OpsActionCenterStatus.OPEN;
  }

  private isIncidentMissingEvidence(incident: OperationIncident) {
    return !incident.evidenceUrl && this.evidenceOf(incident).length === 0;
  }

  private isAutomaticIncident(incident: OperationIncident) {
    const metadata = this.metadataOf(incident);
    return (
      metadata.source === 'operations:auto-incident' ||
      Object.keys(this.autoMetadataOf(incident)).length > 0
    );
  }

  private latestOperationalEscalation(
    metadata: Record<string, unknown> | null,
  ) {
    return this.operationalEscalations(metadata).at(-1) ?? null;
  }

  private compareActionCenterItems(
    left: OpsActionCenterItem,
    right: OpsActionCenterItem,
  ) {
    const priorityDelta =
      this.actionPriorityRank(right.priority) -
      this.actionPriorityRank(left.priority);
    if (priorityDelta !== 0) return priorityDelta;

    const leftTime = Date.parse(left.timestamps.occurredAt);
    const rightTime = Date.parse(right.timestamps.occurredAt);
    if (leftTime !== rightTime) return leftTime - rightTime;

    return left.id.localeCompare(right.id);
  }

  private actionPriorityRank(priority: OpsActionCenterPriority) {
    switch (priority) {
      case OpsActionCenterPriority.CRITICAL:
        return 4;
      case OpsActionCenterPriority.HIGH:
        return 3;
      case OpsActionCenterPriority.MEDIUM:
        return 2;
      case OpsActionCenterPriority.LOW:
        return 1;
    }
  }

  private toActionPriority(
    severity:
      | OperationIncidentSeverity
      | OperationalAlertSeverity
      | OperationsJournalEntrySeverity,
  ): OpsActionCenterPriority {
    switch (severity) {
      case OperationIncidentSeverity.CRITICAL:
        return OpsActionCenterPriority.CRITICAL;
      case OperationIncidentSeverity.HIGH:
        return OpsActionCenterPriority.HIGH;
      case OperationIncidentSeverity.MEDIUM:
        return OpsActionCenterPriority.MEDIUM;
      case OperationIncidentSeverity.LOW:
        return OpsActionCenterPriority.LOW;
    }
    return OpsActionCenterPriority.LOW;
  }

  private toIsoString(value: Date | string | null | undefined) {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  }

  private async escalateIncidentOperationally(
    tenantId: string,
    incident: OperationIncident,
    decision: {
      trigger: EscalationTrigger;
      ageMinutes: number;
      thresholdMinutes: number;
    },
    escalationUserId: number | null,
    actorId: number,
    now: Date,
  ) {
    const before = this.toAuditSnapshot(incident);
    const previousStatus = incident.status;
    const reason = this.formatEscalationReason(
      decision.trigger,
      incident.severity,
      decision.ageMinutes,
      decision.thresholdMinutes,
    );

    incident.status = OperationIncidentStatus.ESCALATED;
    incident.escalatedToId = escalationUserId;
    incident.escalationReason = reason;
    incident.escalatedAt = now;
    incident.timeline = [
      ...this.timelineOf(incident),
      this.createTimelineEntry(
        'AUTO_ESCALATE_INCIDENT',
        actorId,
        reason,
        previousStatus,
        incident.status,
        {
          operationalEscalation: this.createEscalationRecord(
            decision,
            escalationUserId,
            now,
          ),
        },
        now,
      ),
    ];

    const savedIncident = await this.incidentRepository.save(incident);
    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'AUTO_ESCALATE_INCIDENT',
      savedIncident,
      before,
    );
    await this.opsNotificationService.notifyIncidentEscalated(savedIncident);
    return savedIncident;
  }

  private async escalateAlertOperationally(
    tenantId: string,
    alert: OperationalAlert,
    decision: {
      trigger: EscalationTrigger;
      ageMinutes: number;
      thresholdMinutes: number;
    },
    escalationUserId: number | null,
    actorId: number,
    now: Date,
  ) {
    const before = this.toAlertAuditSnapshot(alert);
    const escalation = this.createEscalationRecord(
      decision,
      escalationUserId,
      now,
    );
    alert.metadata = this.withOperationalEscalation(alert.metadata, escalation);

    const savedAlert = await this.alertRepository.save(alert);
    const auditLog = await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_ALERT,
      `operational-alert:${savedAlert.id}`,
      {
        action: 'AUTO_ESCALATE_OPERATIONAL_ALERT',
        alertId: savedAlert.id,
        alertType: savedAlert.type,
        escalation,
        before,
        after: this.toAlertAuditSnapshot(savedAlert),
      },
    );
    savedAlert.createAuditLogId = savedAlert.createAuditLogId ?? auditLog.id;
    const savedWithAudit = await this.alertRepository.save(savedAlert);
    await this.notifyAlertEscalated(savedWithAudit, escalationUserId);
    return savedWithAudit;
  }

  private async escalateJournalEntryOperationally(
    tenantId: string,
    entry: OperationsJournalEntry,
    decision: {
      trigger: EscalationTrigger;
      ageMinutes: number;
      thresholdMinutes: number;
    },
    escalationUserId: number | null,
    actorId: number,
    now: Date,
  ) {
    const before = this.toJournalAuditSnapshot(entry);
    const escalation = this.createEscalationRecord(
      decision,
      escalationUserId,
      now,
    );
    entry.status = OperationsJournalEntryStatus.IN_PROGRESS;
    entry.ownerId = entry.ownerId ?? escalationUserId;
    entry.updatedById = actorId;
    entry.metadata = this.withOperationalEscalation(entry.metadata, escalation);

    const savedEntry = await this.journalRepository.save(entry);
    const auditLog = await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      `operations-journal:${savedEntry.id}`,
      {
        action: 'AUTO_ESCALATE_OPERATIONS_JOURNAL_ENTRY',
        journalEntryId: savedEntry.id,
        journalEntryType: savedEntry.type,
        escalation,
        before,
        after: this.toJournalAuditSnapshot(savedEntry),
      },
    );
    savedEntry.auditLogId = auditLog.id;
    const savedWithAudit = await this.journalRepository.save(savedEntry);
    await this.notifyJournalEntryEscalated(savedWithAudit, escalationUserId);
    return savedWithAudit;
  }

  private async notifyAlertEscalated(
    alert: OperationalAlert,
    escalationUserId: number | null,
  ) {
    await this.opsNotificationService.notify({
      tenant: alert.tenantId,
      severity: alert.severity as unknown as OperationIncidentSeverity,
      eventType: OpsNotificationEventType.ESCALATION,
      title: `Alerte escaladee: ${alert.type}`,
      message: alert.message,
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        source: alert.source,
        sourceReference: alert.sourceReference,
      },
      recipients: escalationUserId ? [`user:${escalationUserId}`] : [],
      status: OpsNotificationStatus.PENDING,
    });
  }

  private async notifyJournalEntryEscalated(
    entry: OperationsJournalEntry,
    escalationUserId: number | null,
  ) {
    await this.opsNotificationService.notify({
      tenant: entry.tenantId,
      severity: entry.severity as unknown as OperationIncidentSeverity,
      eventType: OpsNotificationEventType.ESCALATION,
      title: entry.title,
      message: entry.description || entry.title,
      metadata: {
        journalEntryId: entry.id,
        journalEntryType: entry.type,
        relatedReference: entry.relatedReference,
      },
      recipients: escalationUserId ? [`user:${escalationUserId}`] : [],
      status: OpsNotificationStatus.PENDING,
    });
  }

  private buildRunbook(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
  ): OperationsRunbookDto {
    const actions = this.runbookActions(reference, context);
    const checks = this.runbookChecks(reference, context);
    const expectedEvidence = this.runbookExpectedEvidence(reference, context);
    const next = this.runbookNext(reference, context, actions);
    const steps = this.runbookSteps(
      reference,
      context,
      checks,
      expectedEvidence,
      actions,
    );

    return {
      id: `${reference.sourceType.toLowerCase()}-${reference.id}-runbook`,
      generatedAt: new Date().toISOString(),
      reference,
      requiredPermissions: this.runbookRequirements(context),
      why: this.runbookWhy(reference, context),
      next,
      steps,
      checks,
      actions,
      expectedEvidence,
    };
  }

  private runbookWhy(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
  ) {
    if (context.isResolved) {
      return `${reference.sourceType} ${reference.id} is already resolved; preserve evidence and confirm closure criteria.`;
    }

    const service = reference.impactedService
      ? ` on ${reference.impactedService}`
      : '';
    return `${reference.severity} ${reference.sourceType.toLowerCase()} ${reference.id}${service} requires guided triage because it is still ${reference.status}.`;
  }

  private runbookRequirements(
    context: RunbookBuildContext,
  ): OperationsRunbookRequirement[] {
    const requirements: OperationsRunbookRequirement[] = [
      {
        role: 'Ops reader or auditor',
        permission: 'operations:read',
        reason: 'Read the source record, linked context and generated runbook.',
      },
      {
        role: 'Auditor',
        permission: 'audit:read',
        reason: 'Inspect traceability and evidence references when needed.',
      },
    ];

    if (!context.isResolved) {
      requirements.push({
        role: 'Ops lead or incident manager',
        permission: 'operations:write',
        reason: 'Assign, escalate, resolve or close the operational item.',
      });
    }

    return requirements;
  }

  private runbookNext(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
    actions: OperationsRunbookAction[],
  ): OperationsRunbookNext {
    const recommendedAction =
      actions.find((action) => action.enabled && action.id !== 'read-source') ??
      actions.find((action) => action.enabled) ??
      null;
    const waitingOn: string[] = [];

    if (!context.isAssigned && context.isOpen) waitingOn.push('owner');
    if (!context.hasEvidence) waitingOn.push('evidence');
    if (!context.isResolved) waitingOn.push('resolution');

    return {
      why: this.runbookWhy(reference, context),
      whatToDoNext: recommendedAction
        ? recommendedAction.label
        : 'Review evidence and keep the record available for audit.',
      priority: this.runbookPriority(reference.severity),
      recommendedActionId: recommendedAction?.id ?? null,
      waitingOn,
    };
  }

  private runbookSteps(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
    checks: OperationsRunbookCheck[],
    expectedEvidence: OperationsRunbookEvidence[],
    actions: OperationsRunbookAction[],
  ): OperationsRunbookStep[] {
    const scopeChecks = checks.filter((check) =>
      ['source-status', 'impact-scope', 'tenant-scope'].includes(check.id),
    );
    const resolutionChecks = checks.filter((check) =>
      ['owner-set', 'mitigation-tested', 'evidence-attached'].includes(
        check.id,
      ),
    );

    const steps: OperationsRunbookStep[] = [
      {
        order: 1,
        title: 'Qualify the signal',
        why: 'Avoid acting on stale or cross-tenant operational context.',
        instruction:
          'Confirm source, tenant, status, severity and impacted scope before changing state.',
        requiredRole: 'Ops reader or auditor',
        requiredPermission: 'operations:read',
        checks: scopeChecks,
        evidence: [],
        actions: actions.filter((action) => action.id === 'read-source'),
      },
      {
        order: 2,
        title: 'Take ownership',
        why: 'Every open operational item needs an accountable owner or escalation target.',
        instruction:
          'Assign the item when ownership is clear; escalate when impact or delay exceeds the local threshold.',
        requiredRole: 'Ops lead or incident manager',
        requiredPermission: 'operations:write',
        checks: checks.filter((check) => check.id === 'owner-set'),
        evidence: expectedEvidence.filter((evidence) =>
          evidence.requiredFor.includes('assignment'),
        ),
        actions: actions.filter((action) =>
          ['assign-incident', 'escalate-incident', 'run-escalation'].includes(
            action.id,
          ),
        ),
      },
      {
        order: 3,
        title: 'Mitigate and prove',
        why: 'Resolution should be supported by observable checks and durable evidence.',
        instruction:
          'Run the control checks, attach proof, then resolve or update the source record.',
        requiredRole: 'Ops lead or incident manager',
        requiredPermission: 'operations:write',
        checks: resolutionChecks,
        evidence: expectedEvidence,
        actions: actions.filter((action) =>
          ['resolve-alert', 'resolve-incident', 'update-journal'].includes(
            action.id,
          ),
        ),
      },
      {
        order: 4,
        title: 'Close the loop',
        why: 'Closure separates technical recovery from audited operational completion.',
        instruction:
          'Close only after resolution evidence is present and stakeholder impact has been reviewed.',
        requiredRole: 'Ops lead or incident manager',
        requiredPermission: 'operations:write',
        checks: checks.filter((check) => check.id === 'evidence-attached'),
        evidence: expectedEvidence.filter((evidence) =>
          evidence.requiredFor.includes('closure'),
        ),
        actions: actions.filter((action) => action.id === 'close-incident'),
      },
    ];

    return steps.filter(
      (step) =>
        step.actions.length > 0 ||
        step.checks.length > 0 ||
        reference.sourceType !== 'ALERT',
    );
  }

  private runbookChecks(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
  ): OperationsRunbookCheck[] {
    const checks: OperationsRunbookCheck[] = [
      {
        id: 'tenant-scope',
        label: 'Tenant scope confirmed',
        expected: `Record belongs to tenant ${reference.tenantId}.`,
        blocking: true,
      },
      {
        id: 'source-status',
        label: 'Current status reviewed',
        expected: `Status is ${reference.status}; operator understands whether mutation is allowed.`,
        blocking: true,
      },
      {
        id: 'impact-scope',
        label: 'Impact scope described',
        expected:
          reference.impactedService || reference.source
            ? 'Source or impacted service is identified.'
            : 'Operator records the impacted workflow or service before escalation.',
        blocking: this.runbookPriority(reference.severity) !== 'LOW',
      },
      {
        id: 'owner-set',
        label: 'Owner or escalation target set',
        expected: context.ownerId
          ? `Owner/escalation target is user ${context.ownerId}.`
          : 'Assign an owner or escalation target for open HIGH/CRITICAL work.',
        blocking: context.isOpen,
      },
      {
        id: 'mitigation-tested',
        label: 'Mitigation check executed',
        expected: this.mitigationExpectation(reference, context),
        blocking: !context.isResolved,
      },
      {
        id: 'evidence-attached',
        label: 'Evidence attached',
        expected: context.hasEvidence
          ? 'Existing evidence is present; verify it still proves recovery.'
          : 'Attach proof URL, export, screenshot or audit reference before resolution/closure.',
        blocking: !context.isResolved,
      },
    ];

    return checks;
  }

  private mitigationExpectation(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
  ) {
    const source = reference.source ?? reference.relatedReference;
    if (
      source?.includes('backup') ||
      reference.title.toLowerCase().includes('backup')
    ) {
      return 'Latest backup and restore/freshness control are green.';
    }
    if (source?.includes('audit')) {
      return 'Audit chain verification has been replayed successfully.';
    }
    if (reference.title.toLowerCase().includes('slo')) {
      return 'SLO metric has returned below threshold for the agreed observation window.';
    }
    if (context.description.toLowerCase().includes('planning')) {
      return 'Planning workflow smoke check succeeds for the impacted service.';
    }
    return 'Relevant operational control has been replayed and returns OK.';
  }

  private runbookExpectedEvidence(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
  ): OperationsRunbookEvidence[] {
    const evidence: OperationsRunbookEvidence[] = [
      {
        label: 'Triage note',
        expected: 'Short summary of observed impact, source and decision.',
        requiredFor: ['assignment', 'escalation'],
      },
      {
        label: 'Recovery proof',
        expected: this.mitigationExpectation(reference, context),
        requiredFor: ['resolution'],
      },
      {
        label: 'Audit closure proof',
        expected:
          'Final evidence URL or audit reference proving the item can be closed.',
        requiredFor: ['closure'],
      },
    ];

    if (reference.sourceReference || reference.relatedReference) {
      evidence.unshift({
        label: 'Source reference',
        expected: `Reference ${reference.sourceReference ?? reference.relatedReference} is reachable and matches this runbook.`,
        requiredFor: ['assignment', 'resolution'],
      });
    }

    return evidence;
  }

  private runbookActions(
    reference: OperationsRunbookReference,
    context: RunbookBuildContext,
  ): OperationsRunbookAction[] {
    const sourceEndpoint = this.runbookSourceEndpoint(reference);
    const actions: OperationsRunbookAction[] = [
      {
        id: 'read-source',
        label: 'Review source record',
        method: 'GET',
        endpoint: sourceEndpoint,
        requiredPermission: 'operations:read',
        enabled: true,
        why: 'Open the canonical record before mutating operational state.',
      },
    ];

    if (reference.sourceType === 'ALERT') {
      actions.push(
        {
          id: 'resolve-alert',
          label: 'Resolve alert when control is green',
          method: 'PATCH',
          endpoint: `/ops/alerts/${reference.id}/resolve`,
          requiredPermission: 'operations:write',
          enabled: context.isOpen,
          why: 'Close the alert once the failing control is back to nominal.',
        },
        {
          id: 'run-escalation',
          label: 'Run operational escalation',
          method: 'POST',
          endpoint: '/ops/escalations/run',
          requiredPermission: 'operations:write',
          enabled:
            context.isOpen && ['HIGH', 'CRITICAL'].includes(reference.severity),
          why: 'Notify or mark stale HIGH/CRITICAL work before delay grows.',
        },
      );
    }

    if (reference.sourceType === 'INCIDENT') {
      actions.push(
        {
          id: 'assign-incident',
          label: 'Assign incident owner',
          method: 'PATCH',
          endpoint: `/ops/incidents/${reference.id}/assign`,
          requiredPermission: 'operations:write',
          enabled: context.isOpen && !context.isAssigned,
          why: 'An open incident should have a named accountable responder.',
        },
        {
          id: 'escalate-incident',
          label: 'Escalate incident',
          method: 'PATCH',
          endpoint: `/ops/incidents/${reference.id}/escalate`,
          requiredPermission: 'operations:write',
          enabled: context.isOpen,
          why: 'Escalate when impact, severity or elapsed time exceeds the local runbook threshold.',
        },
        {
          id: 'resolve-incident',
          label: 'Resolve incident with proof',
          method: 'PATCH',
          endpoint: `/ops/incidents/${reference.id}/resolve`,
          requiredPermission: 'operations:write',
          enabled: context.isOpen && context.isAssigned,
          why: 'Resolution requires an assigned/escalated incident and evidence URL.',
        },
        {
          id: 'close-incident',
          label: 'Close resolved incident',
          method: 'PATCH',
          endpoint: `/ops/incidents/${reference.id}/close`,
          requiredPermission: 'operations:write',
          enabled: reference.status === OperationIncidentStatus.RESOLVED,
          why: 'Closure records operational acceptance after technical resolution.',
        },
      );
    }

    if (reference.sourceType === 'JOURNAL') {
      actions.push(
        {
          id: 'update-journal',
          label: 'Update journal entry',
          method: 'PATCH',
          endpoint: `/ops/journal/${reference.id}`,
          requiredPermission: 'operations:write',
          enabled: !context.isResolved,
          why: 'Record owner, status, evidence and resolution timestamp on the journal entry.',
        },
        {
          id: 'run-escalation',
          label: 'Run operational escalation',
          method: 'POST',
          endpoint: '/ops/escalations/run',
          requiredPermission: 'operations:write',
          enabled:
            !context.isResolved &&
            ['HIGH', 'CRITICAL'].includes(reference.severity),
          why: 'Escalate stale HIGH/CRITICAL journal entries.',
        },
      );
    }

    return actions;
  }

  private runbookSourceEndpoint(reference: OperationsRunbookReference) {
    const paths: Record<OperationsRunbookSourceType, string> = {
      ALERT: 'alerts',
      INCIDENT: 'incidents',
      JOURNAL: 'journal',
    };
    return `/ops/${paths[reference.sourceType]}/${reference.id}`;
  }

  private runbookPriority(severity: string): OperationsRunbookNext['priority'] {
    if (severity === 'CRITICAL') return 'CRITICAL';
    if (severity === 'HIGH') return 'HIGH';
    if (severity === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  }

  private async getIncidentOrThrow(tenantId: string, id: number) {
    const incident = await this.incidentRepository.findOne({
      where: { tenantId, id },
    });

    if (!incident) {
      throw new NotFoundException('Operation incident not found');
    }

    return incident;
  }

  private async getJournalEntryOrThrow(tenantId: string, id: number) {
    const entry = await this.journalRepository.findOne({
      where: { tenantId, id },
    });

    if (!entry) {
      throw new NotFoundException('Operations journal entry not found');
    }

    return entry;
  }

  private async getAlertOrThrow(tenantId: string, id: number) {
    const alert = await this.alertRepository.findOne({
      where: { tenantId, id },
    });

    if (!alert) {
      throw new NotFoundException('Operational alert not found');
    }

    return alert;
  }

  private async resolveOpenAlert(
    tenantId: string,
    alert: OperationalAlert,
    resolutionSummary: string,
    actorId: number,
  ) {
    if (alert.status === OperationalAlertStatus.RESOLVED) {
      throw new BadRequestException('Operational alert is already resolved');
    }

    const before = this.toAlertAuditSnapshot(alert);
    const now = new Date();
    alert.status = OperationalAlertStatus.RESOLVED;
    alert.resolvedAt = now;
    alert.resolvedById = actorId;
    alert.resolutionSummary = resolutionSummary;

    const savedAlert = await this.alertRepository.save(alert);
    const auditLog = await this.writeAlertAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'RESOLVE_OPERATIONAL_ALERT',
      savedAlert,
      before,
    );
    savedAlert.resolveAuditLogId = auditLog.id;
    const alertWithAudit = await this.alertRepository.save(savedAlert);
    await this.writeAlertJournalEntry(tenantId, actorId, alertWithAudit);
    return alertWithAudit;
  }

  private defaultJournalStatus(type: OperationsJournalEntryType) {
    return type === OperationsJournalEntryType.INCIDENT
      ? OperationsJournalEntryStatus.OPEN
      : OperationsJournalEntryStatus.RECORDED;
  }

  private validateJournalMutation(
    type: OperationsJournalEntryType,
    status: OperationsJournalEntryStatus | undefined,
    resolvedAt: Date | string | null | undefined,
    evidenceUrl: string | undefined,
  ) {
    if (type === OperationsJournalEntryType.EVIDENCE && !evidenceUrl) {
      throw new BadRequestException('Evidence entries require an evidence URL');
    }

    if (status === OperationsJournalEntryStatus.RESOLVED && !resolvedAt) {
      throw new BadRequestException(
        'Resolved journal entries require a resolution timestamp',
      );
    }
  }

  private createEvidence(
    url: string | undefined,
    label: string | undefined,
    type: EvidenceType,
    actorId: number,
    now: Date,
  ): OperationIncidentEvidence | null {
    if (!url) return null;

    return {
      label: label || type.toLowerCase(),
      url,
      addedAt: now.toISOString(),
      addedById: actorId,
      type,
    };
  }

  private createTimelineEntry(
    action: IncidentAuditAction,
    actorId: number,
    note: string | null,
    fromStatus: OperationIncidentStatus | null,
    toStatus: OperationIncidentStatus,
    details: Record<string, unknown>,
    now: Date,
  ): OperationIncidentTimelineEntry {
    return {
      action,
      at: now.toISOString(),
      actorId,
      note,
      fromStatus,
      toStatus,
      details,
    };
  }

  private resolveEscalationRules(
    dto: RunOperationalEscalationDto,
  ): OperationalEscalationRules {
    return {
      criticalUnassignedDelayMinutes:
        dto.criticalUnassignedDelayMinutes ??
        DEFAULT_OPERATIONAL_ESCALATION_RULES.criticalUnassignedDelayMinutes,
      criticalUnresolvedDelayMinutes:
        dto.criticalUnresolvedDelayMinutes ??
        DEFAULT_OPERATIONAL_ESCALATION_RULES.criticalUnresolvedDelayMinutes,
      highUnassignedDelayMinutes:
        dto.highUnassignedDelayMinutes ??
        DEFAULT_OPERATIONAL_ESCALATION_RULES.highUnassignedDelayMinutes,
      highUnresolvedDelayMinutes:
        dto.highUnresolvedDelayMinutes ??
        DEFAULT_OPERATIONAL_ESCALATION_RULES.highUnresolvedDelayMinutes,
    };
  }

  private getIncidentEscalationDecision(
    incident: OperationIncident,
    rules: OperationalEscalationRules,
    now: Date,
  ) {
    const severity = incident.severity as EscalatableSeverity;
    const ageMinutes = this.ageInMinutes(incident.declaredAt, now);
    const unassignedThreshold = this.unassignedThreshold(severity, rules);

    if (!incident.assignedToId && ageMinutes >= unassignedThreshold) {
      return {
        trigger: 'UNASSIGNED' as const,
        ageMinutes,
        thresholdMinutes: unassignedThreshold,
      };
    }

    const unresolvedThreshold = this.unresolvedThreshold(severity, rules);
    if (!incident.resolvedAt && ageMinutes >= unresolvedThreshold) {
      return {
        trigger: 'UNRESOLVED' as const,
        ageMinutes,
        thresholdMinutes: unresolvedThreshold,
      };
    }

    return null;
  }

  private getAlertEscalationDecision(
    alert: OperationalAlert,
    rules: OperationalEscalationRules,
    now: Date,
  ) {
    const severity = alert.severity as unknown as EscalatableSeverity;
    const ageMinutes = this.ageInMinutes(alert.openedAt, now);
    const unresolvedThreshold = this.unresolvedThreshold(severity, rules);

    if (!alert.resolvedAt && ageMinutes >= unresolvedThreshold) {
      return {
        trigger: 'UNRESOLVED' as const,
        ageMinutes,
        thresholdMinutes: unresolvedThreshold,
      };
    }

    return null;
  }

  private getJournalEscalationDecision(
    entry: OperationsJournalEntry,
    rules: OperationalEscalationRules,
    now: Date,
  ) {
    const severity = entry.severity as unknown as EscalatableSeverity;
    const ageMinutes = this.ageInMinutes(entry.occurredAt, now);
    const unassignedThreshold = this.unassignedThreshold(severity, rules);

    if (!entry.ownerId && ageMinutes >= unassignedThreshold) {
      return {
        trigger: 'UNASSIGNED' as const,
        ageMinutes,
        thresholdMinutes: unassignedThreshold,
      };
    }

    const unresolvedThreshold = this.unresolvedThreshold(severity, rules);
    if (!entry.resolvedAt && ageMinutes >= unresolvedThreshold) {
      return {
        trigger: 'UNRESOLVED' as const,
        ageMinutes,
        thresholdMinutes: unresolvedThreshold,
      };
    }

    return null;
  }

  private hasIncidentOperationalEscalation(
    incident: OperationIncident,
    trigger: EscalationTrigger,
  ) {
    return this.timelineOf(incident).some((entry) => {
      const escalation = entry.details.operationalEscalation as
        | { trigger?: unknown }
        | undefined;
      return (
        entry.action === 'AUTO_ESCALATE_INCIDENT' &&
        escalation?.trigger === trigger
      );
    });
  }

  private hasMetadataOperationalEscalation(
    metadata: Record<string, unknown> | null,
    trigger: EscalationTrigger,
  ) {
    return this.operationalEscalations(metadata).some(
      (escalation) => escalation.trigger === trigger,
    );
  }

  private withOperationalEscalation(
    metadata: Record<string, unknown> | null,
    escalation: OperationalEscalationRecord,
  ) {
    return {
      ...(metadata ?? {}),
      operationalEscalations: [
        ...this.operationalEscalations(metadata),
        escalation,
      ],
    };
  }

  private operationalEscalations(
    metadata: Record<string, unknown> | null,
  ): OperationalEscalationRecord[] {
    const escalations = metadata?.operationalEscalations;
    if (!Array.isArray(escalations)) return [];
    return escalations.filter(
      (escalation): escalation is OperationalEscalationRecord =>
        this.isOperationalEscalationRecord(escalation),
    );
  }

  private isOperationalEscalationRecord(
    value: unknown,
  ): value is OperationalEscalationRecord {
    if (!value || typeof value !== 'object') return false;
    const record = value as Partial<OperationalEscalationRecord>;
    return record.trigger === 'UNASSIGNED' || record.trigger === 'UNRESOLVED';
  }

  private createEscalationRecord(
    decision: {
      trigger: EscalationTrigger;
      ageMinutes: number;
      thresholdMinutes: number;
    },
    escalationUserId: number | null,
    now: Date,
  ): OperationalEscalationRecord {
    return {
      trigger: decision.trigger,
      escalatedAt: now.toISOString(),
      thresholdMinutes: decision.thresholdMinutes,
      ageMinutes: decision.ageMinutes,
      escalationUserId,
    };
  }

  private unassignedThreshold(
    severity: EscalatableSeverity,
    rules: OperationalEscalationRules,
  ) {
    return severity === OperationIncidentSeverity.CRITICAL
      ? rules.criticalUnassignedDelayMinutes
      : rules.highUnassignedDelayMinutes;
  }

  private unresolvedThreshold(
    severity: EscalatableSeverity,
    rules: OperationalEscalationRules,
  ) {
    return severity === OperationIncidentSeverity.CRITICAL
      ? rules.criticalUnresolvedDelayMinutes
      : rules.highUnresolvedDelayMinutes;
  }

  private ageInMinutes(from: Date, now: Date) {
    return Math.floor((now.getTime() - from.getTime()) / 60000);
  }

  private formatEscalationReason(
    trigger: EscalationTrigger,
    severity:
      | OperationIncidentSeverity
      | OperationalAlertSeverity
      | OperationsJournalEntrySeverity,
    ageMinutes: number,
    thresholdMinutes: number,
  ) {
    const triggerLabel =
      trigger === 'UNASSIGNED' ? 'non assigne' : 'non resolu';
    return `${severity} ${triggerLabel} depuis ${ageMinutes} min (seuil ${thresholdMinutes} min)`;
  }

  private evidenceOf(incident: OperationIncident) {
    return incident.evidence || [];
  }

  private timelineOf(incident: OperationIncident) {
    return incident.timeline || [];
  }

  private incidentAlertReference(incident: OperationIncident) {
    return `operation-incident:${incident.id}`;
  }

  private async createAutomaticIncident(
    tenantId: string,
    signal: AutomaticIncidentSignal,
    severity: OperationIncidentSeverity,
    actorId: number,
    now: Date,
    occurredAt: Date,
  ): Promise<AutomaticIncidentResult> {
    const evidence = this.createEvidence(
      signal.evidenceUrl,
      signal.evidenceLabel,
      'AUTOMATION',
      actorId,
      now,
    );
    const metadata = this.createAutomaticMetadata(
      signal,
      severity,
      occurredAt,
      {
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        updates: 0,
      },
    );
    const incident = this.incidentRepository.create({
      tenantId,
      title: signal.title,
      description: signal.description,
      severity,
      status: OperationIncidentStatus.OPEN,
      impactedService: signal.impactedService ?? null,
      evidenceUrl: signal.evidenceUrl ?? null,
      evidenceLabel: signal.evidenceLabel ?? null,
      declaredById: actorId,
      declaredAt: occurredAt,
      assignedToId: null,
      assignedAt: null,
      escalatedToId: null,
      escalationReason: null,
      escalatedAt: null,
      resolutionSummary: null,
      resolvedById: null,
      resolvedAt: null,
      closureSummary: null,
      closedById: null,
      closedAt: null,
      evidence: evidence ? [evidence] : [],
      timeline: [
        this.createTimelineEntry(
          'AUTO_CREATE_INCIDENT',
          actorId,
          signal.description,
          null,
          OperationIncidentStatus.OPEN,
          {
            sourceType: signal.sourceType,
            reference: signal.reference,
            severity,
            evidenceUrl: signal.evidenceUrl ?? null,
          },
          now,
        ),
      ],
      metadata,
    });
    const savedIncident = await this.incidentRepository.save(incident);

    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.AUTO_GENERATE,
      'AUTO_CREATE_INCIDENT',
      savedIncident,
      null,
    );
    await this.writeAutomaticJournalEntry(
      tenantId,
      actorId,
      savedIncident,
      signal,
      'AUTO_CREATE_INCIDENT',
      now,
      null,
    );

    return { incident: savedIncident, created: true, updated: false };
  }

  private async updateAutomaticIncident(
    tenantId: string,
    incident: OperationIncident,
    signal: AutomaticIncidentSignal,
    severity: OperationIncidentSeverity,
    actorId: number,
    now: Date,
  ): Promise<AutomaticIncidentResult> {
    const before = this.toAuditSnapshot(incident);
    const previousStatus = incident.status;
    const evidence = this.createEvidence(
      signal.evidenceUrl,
      signal.evidenceLabel,
      'AUTOMATION',
      actorId,
      now,
    );
    const previousMetadata = this.metadataOf(incident);
    const autoMetadata = this.autoMetadataOf(incident);
    const nextUpdateCount =
      typeof autoMetadata.updates === 'number' ? autoMetadata.updates + 1 : 1;

    incident.title = signal.title || incident.title;
    incident.description = signal.description || incident.description;
    incident.severity = this.highestSeverity(incident.severity, severity);
    incident.impactedService =
      signal.impactedService ?? incident.impactedService;
    incident.evidenceUrl = signal.evidenceUrl ?? incident.evidenceUrl;
    incident.evidenceLabel = signal.evidenceLabel ?? incident.evidenceLabel;
    incident.evidence = evidence
      ? [...this.evidenceOf(incident), evidence]
      : this.evidenceOf(incident);
    incident.timeline = [
      ...this.timelineOf(incident),
      this.createTimelineEntry(
        'AUTO_UPDATE_INCIDENT',
        actorId,
        signal.description,
        previousStatus,
        incident.status,
        {
          sourceType: signal.sourceType,
          reference: signal.reference,
          severity: incident.severity,
          updateCount: nextUpdateCount,
          evidenceUrl: signal.evidenceUrl ?? null,
        },
        now,
      ),
    ];
    incident.metadata = this.createAutomaticMetadata(
      signal,
      incident.severity,
      now,
      {
        ...autoMetadata,
        updatedAt: now.toISOString(),
        updates: nextUpdateCount,
      },
      previousMetadata,
    );

    const savedIncident = await this.incidentRepository.save(incident);
    await this.writeAudit(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      'AUTO_UPDATE_INCIDENT',
      savedIncident,
      before,
    );
    await this.writeAutomaticJournalEntry(
      tenantId,
      actorId,
      savedIncident,
      signal,
      'AUTO_UPDATE_INCIDENT',
      now,
      before,
    );

    return { incident: savedIncident, created: false, updated: true };
  }

  private async findOpenAutomaticIncident(
    tenantId: string,
    sourceType: AutomaticIncidentSourceType,
    reference: string,
  ) {
    const incidents = await this.incidentRepository.find({
      where: { tenantId },
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: 200,
    });

    return incidents.find((incident) => {
      if (this.isFinalIncidentStatus(incident.status)) return false;
      const auto = this.autoMetadataOf(incident);
      return auto.sourceType === sourceType && auto.reference === reference;
    });
  }

  private resolveAutomaticSeverity(
    signal: AutomaticIncidentSignal,
  ): OperationIncidentSeverity | null {
    const severity = this.normalizeIncidentSeverity(
      signal.severity || signal.alertSeverity,
    );

    if (signal.sourceType === 'ALERT') {
      if (
        severity === OperationIncidentSeverity.CRITICAL ||
        severity === OperationIncidentSeverity.HIGH
      ) {
        return OperationIncidentSeverity.CRITICAL;
      }

      return null;
    }

    if (signal.checkStatus !== 'KO') return null;

    return severity && severity !== OperationIncidentSeverity.LOW
      ? severity
      : OperationIncidentSeverity.HIGH;
  }

  private normalizeIncidentSeverity(
    severity: AutomaticIncidentSignal['severity'] | undefined,
  ): OperationIncidentSeverity | null {
    if (!severity) return null;
    if (severity === OperationIncidentSeverity.CRITICAL) {
      return OperationIncidentSeverity.CRITICAL;
    }
    if (severity === OperationIncidentSeverity.HIGH) {
      return OperationIncidentSeverity.HIGH;
    }
    if (severity === OperationIncidentSeverity.MEDIUM) {
      return OperationIncidentSeverity.MEDIUM;
    }
    if (severity === OperationIncidentSeverity.LOW) {
      return OperationIncidentSeverity.LOW;
    }
    return null;
  }

  private highestSeverity(
    current: OperationIncidentSeverity,
    next: OperationIncidentSeverity,
  ) {
    const rank = {
      [OperationIncidentSeverity.LOW]: 1,
      [OperationIncidentSeverity.MEDIUM]: 2,
      [OperationIncidentSeverity.HIGH]: 3,
      [OperationIncidentSeverity.CRITICAL]: 4,
    };

    return rank[next] > rank[current] ? next : current;
  }

  private isFinalIncidentStatus(status: OperationIncidentStatus) {
    return (
      status === OperationIncidentStatus.RESOLVED ||
      status === OperationIncidentStatus.CLOSED
    );
  }

  private createAutomaticMetadata(
    signal: AutomaticIncidentSignal,
    severity: OperationIncidentSeverity,
    occurredAt: Date,
    auto: Record<string, unknown>,
    previousMetadata: Record<string, unknown> = {},
  ) {
    return {
      ...previousMetadata,
      source: 'operations:auto-incident',
      auto: {
        sourceType: signal.sourceType,
        reference: signal.reference,
        severity,
        checkStatus: signal.checkStatus ?? null,
        alertSeverity: signal.alertSeverity ?? null,
        occurredAt: occurredAt.toISOString(),
        ...auto,
      },
      signal: signal.metadata ?? null,
    };
  }

  private metadataOf(incident: OperationIncident) {
    return incident.metadata || {};
  }

  private autoMetadataOf(incident: OperationIncident) {
    const metadata = this.metadataOf(incident);
    const auto = metadata.auto;
    return this.isRecord(auto) ? auto : {};
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async writeAutomaticJournalEntry(
    tenantId: string,
    actorId: number,
    incident: OperationIncident,
    signal: AutomaticIncidentSignal,
    action: 'AUTO_CREATE_INCIDENT' | 'AUTO_UPDATE_INCIDENT',
    now: Date,
    before: Record<string, unknown> | null,
  ) {
    const entry = this.journalRepository.create({
      tenantId,
      type: OperationsJournalEntryType.INCIDENT,
      status: OperationsJournalEntryStatus.OPEN,
      severity:
        incident.severity === OperationIncidentSeverity.CRITICAL
          ? OperationsJournalEntrySeverity.CRITICAL
          : OperationsJournalEntrySeverity.HIGH,
      title:
        action === 'AUTO_CREATE_INCIDENT'
          ? `Incident auto: ${incident.title}`
          : `Incident auto mis a jour: ${incident.title}`,
      description: signal.description,
      occurredAt: now,
      resolvedAt: null,
      ownerId: null,
      createdById: actorId,
      updatedById: action === 'AUTO_UPDATE_INCIDENT' ? actorId : null,
      auditLogId: null,
      relatedAuditLogId: null,
      relatedReference: `${signal.sourceType}:${signal.reference}`,
      evidenceUrl: signal.evidenceUrl ?? null,
      evidenceLabel: signal.evidenceLabel ?? null,
      metadata: {
        action,
        incidentId: incident.id,
        source: 'operations:auto-incident',
        sourceType: signal.sourceType,
        reference: signal.reference,
        before,
        after: this.toAuditSnapshot(incident),
      },
    });

    const savedEntry = await this.journalRepository.save(entry);
    const auditLog = await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.AUTO_GENERATE,
      AuditEntityType.OPERATION_INCIDENT,
      `operation-incident:${incident.id}:journal:${savedEntry.id}`,
      {
        action: `${action}_JOURNAL`,
        incidentId: incident.id,
        journalEntryId: savedEntry.id,
        sourceType: signal.sourceType,
        reference: signal.reference,
      },
    );

    savedEntry.auditLogId = auditLog.id;
    await this.journalRepository.save(savedEntry);
  }

  private async writeAudit(
    tenantId: string,
    actorId: number,
    action: AuditAction,
    detailAction: IncidentAuditAction,
    incident: OperationIncident,
    before: Record<string, unknown> | null,
  ) {
    await this.auditService.log(
      tenantId,
      actorId,
      action,
      AuditEntityType.OPERATION_INCIDENT,
      `operation-incident:${incident.id}`,
      {
        action: detailAction,
        incidentId: incident.id,
        before,
        after: this.toAuditSnapshot(incident),
      },
    );
  }

  private async writeAlertAudit(
    tenantId: string,
    actorId: number,
    action: AuditAction,
    detailAction:
      | 'CREATE_OPERATIONAL_ALERT'
      | 'DEDUP_OPERATIONAL_ALERT'
      | 'RESOLVE_OPERATIONAL_ALERT',
    alert: OperationalAlert,
    before: Record<string, unknown> | null,
  ) {
    return this.auditService.log(
      tenantId,
      actorId,
      action,
      AuditEntityType.OPERATION_ALERT,
      `operational-alert:${alert.id}`,
      {
        action: detailAction,
        alertId: alert.id,
        alertType: alert.type,
        source: alert.source,
        sourceReference: alert.sourceReference,
        before,
        after: this.toAlertAuditSnapshot(alert),
      },
    );
  }

  private async writeAlertJournalEntry(
    tenantId: string,
    actorId: number,
    alert: OperationalAlert,
  ) {
    const isResolution = alert.status === OperationalAlertStatus.RESOLVED;
    const entry = this.journalRepository.create({
      tenantId,
      type:
        alert.type === OperationalAlertType.CRITICAL_INCIDENT_OPEN
          ? OperationsJournalEntryType.INCIDENT
          : OperationsJournalEntryType.ACTION,
      status: isResolution
        ? OperationsJournalEntryStatus.RESOLVED
        : OperationsJournalEntryStatus.OPEN,
      severity: this.toJournalSeverity(alert.severity),
      title: isResolution
        ? `Alerte resolue: ${alert.type}`
        : `Alerte ouverte: ${alert.type}`,
      description: isResolution ? alert.resolutionSummary : alert.message,
      occurredAt: isResolution
        ? alert.resolvedAt || new Date()
        : alert.openedAt,
      resolvedAt: isResolution ? alert.resolvedAt : null,
      ownerId: null,
      createdById: actorId,
      updatedById: null,
      auditLogId: isResolution
        ? alert.resolveAuditLogId
        : alert.createAuditLogId,
      relatedAuditLogId: null,
      relatedReference: `operational-alert:${alert.id}`,
      evidenceUrl: null,
      evidenceLabel: null,
      metadata: {
        alertType: alert.type,
        alertStatus: alert.status,
        source: alert.source,
        sourceReference: alert.sourceReference,
        occurrenceCount: alert.occurrenceCount,
      },
    });

    await this.journalRepository.save(entry);
  }

  private toJournalSeverity(severity: OperationalAlertSeverity) {
    switch (severity) {
      case OperationalAlertSeverity.LOW:
        return OperationsJournalEntrySeverity.LOW;
      case OperationalAlertSeverity.MEDIUM:
        return OperationsJournalEntrySeverity.MEDIUM;
      case OperationalAlertSeverity.HIGH:
        return OperationsJournalEntrySeverity.HIGH;
      case OperationalAlertSeverity.CRITICAL:
        return OperationsJournalEntrySeverity.CRITICAL;
    }
  }

  private toAuditSnapshot(incident: OperationIncident) {
    return {
      id: incident.id,
      tenantId: incident.tenantId,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      impactedService: incident.impactedService,
      declaredById: incident.declaredById,
      declaredAt: incident.declaredAt?.toISOString?.() || incident.declaredAt,
      assignedToId: incident.assignedToId,
      assignedAt: incident.assignedAt?.toISOString?.() || incident.assignedAt,
      escalatedToId: incident.escalatedToId,
      escalatedAt:
        incident.escalatedAt?.toISOString?.() || incident.escalatedAt,
      resolvedById: incident.resolvedById,
      resolvedAt: incident.resolvedAt?.toISOString?.() || incident.resolvedAt,
      closedById: incident.closedById,
      closedAt: incident.closedAt?.toISOString?.() || incident.closedAt,
      evidenceCount: this.evidenceOf(incident).length,
      timelineCount: this.timelineOf(incident).length,
      metadata: incident.metadata ?? null,
    };
  }

  private toJournalAuditSnapshot(entry: OperationsJournalEntry) {
    return {
      id: entry.id,
      tenantId: entry.tenantId,
      type: entry.type,
      status: entry.status,
      severity: entry.severity,
      title: entry.title,
      ownerId: entry.ownerId,
      relatedAuditLogId: entry.relatedAuditLogId,
      relatedReference: entry.relatedReference,
      evidenceUrl: entry.evidenceUrl,
      evidenceLabel: entry.evidenceLabel,
      metadata: entry.metadata,
      occurredAt: entry.occurredAt?.toISOString?.() || entry.occurredAt,
      resolvedAt: entry.resolvedAt?.toISOString?.() || entry.resolvedAt,
    };
  }

  private toAlertAuditSnapshot(alert: OperationalAlert) {
    return {
      id: alert.id,
      tenantId: alert.tenantId,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      source: alert.source,
      sourceReference: alert.sourceReference,
      message: alert.message,
      metadata: alert.metadata,
      openedAt: alert.openedAt?.toISOString?.() || alert.openedAt,
      lastSeenAt: alert.lastSeenAt?.toISOString?.() || alert.lastSeenAt,
      occurrenceCount: alert.occurrenceCount,
      resolvedAt: alert.resolvedAt?.toISOString?.() || alert.resolvedAt,
      resolvedById: alert.resolvedById,
      resolutionSummary: alert.resolutionSummary,
      createAuditLogId: alert.createAuditLogId,
      resolveAuditLogId: alert.resolveAuditLogId,
    };
  }
}
