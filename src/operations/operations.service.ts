import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
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
} from './dto/operation-incident.dto';
import {
  OperationIncident,
  OperationIncidentEvidence,
  OperationIncidentStatus,
  OperationIncidentTimelineEntry,
} from './entities/operation-incident.entity';
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

export const OPERATION_INCIDENT_AUDIT_ACTIONS = [
  'DECLARE_INCIDENT',
  'ASSIGN_INCIDENT',
  'ESCALATE_INCIDENT',
  'RESOLVE_INCIDENT',
  'CLOSE_INCIDENT',
] as const;

type IncidentAuditAction = (typeof OPERATION_INCIDENT_AUDIT_ACTIONS)[number];
type EvidenceType = OperationIncidentEvidence['type'];

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(OperationsJournalEntry)
    private readonly journalRepository: Repository<OperationsJournalEntry>,
    @InjectRepository(OperationIncident)
    private readonly incidentRepository: Repository<OperationIncident>,
    private readonly auditService: AuditService,
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

    return savedIncident;
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
    if (incident.status === OperationIncidentStatus.DECLARED) {
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

    return savedIncident;
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

  private evidenceOf(incident: OperationIncident) {
    return incident.evidence || [];
  }

  private timelineOf(incident: OperationIncident) {
    return incident.timeline || [];
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
      occurredAt: entry.occurredAt?.toISOString?.() || entry.occurredAt,
      resolvedAt: entry.resolvedAt?.toISOString?.() || entry.resolvedAt,
    };
  }
}
