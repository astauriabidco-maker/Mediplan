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
  OpsNotificationEventType,
  OpsNotificationStatus,
} from './dto/ops-notification.dto';
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
  ) {}

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
    this.assertNotClosed(incident);
    this.assertNotResolved(incident, 'A resolved incident cannot be assigned');
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
    this.assertNotClosed(incident);
    this.assertNotResolved(incident, 'A resolved incident cannot be escalated');
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
    this.assertNotClosed(incident);
    if (
      incident.status === OperationIncidentStatus.DECLARED ||
      incident.status === OperationIncidentStatus.OPEN
    ) {
      throw new BadRequestException(
        'Incident must be assigned or escalated before resolution',
      );
    }
    if (incident.status === OperationIncidentStatus.RESOLVED) {
      throw new BadRequestException('Incident is already resolved');
    }
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
    if (incident.status !== OperationIncidentStatus.RESOLVED) {
      throw new BadRequestException('Only a resolved incident can be closed');
    }
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

  async runOperationalEscalation(
    tenantId: string,
    dto: RunOperationalEscalationDto = {},
    actorId: number,
  ): Promise<OperationalEscalationResult> {
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

  private assertNotClosed(incident: OperationIncident) {
    if (incident.status === OperationIncidentStatus.CLOSED) {
      throw new BadRequestException('A closed incident cannot be changed');
    }
  }

  private assertNotResolved(incident: OperationIncident, message: string) {
    if (incident.status === OperationIncidentStatus.RESOLVED) {
      throw new BadRequestException(message);
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
