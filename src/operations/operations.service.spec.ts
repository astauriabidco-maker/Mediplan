import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  OperationIncident,
  OperationIncidentSeverity,
  OperationIncidentStatus,
} from './entities/operation-incident.entity';
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
import { OpsNotificationService } from './ops-notification.service';
import { OperationsService } from './operations.service';

type RepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const createRepositoryMock = (): RepositoryMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(
    (
      entity: Partial<
        OperationIncident | OperationsJournalEntry | OperationalAlert
      >,
    ) => entity,
  ),
  save: jest.fn(
    (
      entity: Partial<
        OperationIncident | OperationsJournalEntry | OperationalAlert
      >,
    ) =>
      Promise.resolve({
        id: entity.id ?? 1,
        createdAt: entity.createdAt ?? new Date('2026-05-07T08:00:00.000Z'),
        updatedAt: entity.updatedAt ?? new Date('2026-05-07T08:00:00.000Z'),
        ...entity,
      } as OperationIncident | OperationsJournalEntry | OperationalAlert),
  ),
});

const objectContaining = <T extends object>(value: T): T =>
  expect.objectContaining(value) as unknown as T;

const createIncident = (
  overrides: Partial<OperationIncident> = {},
): OperationIncident =>
  ({
    id: 12,
    tenantId: 'tenant-a',
    title: 'API prod indisponible',
    description: 'Erreur 500 sur publication planning',
    severity: OperationIncidentSeverity.CRITICAL,
    status: OperationIncidentStatus.DECLARED,
    impactedService: 'planning',
    evidenceUrl: null,
    evidenceLabel: null,
    declaredById: 42,
    declaredAt: new Date('2026-05-07T08:00:00.000Z'),
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
    evidence: [],
    timeline: [],
    metadata: null,
    createdAt: new Date('2026-05-07T08:00:00.000Z'),
    updatedAt: new Date('2026-05-07T08:00:00.000Z'),
    ...overrides,
  }) as OperationIncident;

const createAlert = (overrides: Partial<OperationalAlert> = {}) =>
  ({
    id: 44,
    tenantId: 'tenant-a',
    type: OperationalAlertType.SLO_BREACH,
    severity: OperationalAlertSeverity.HIGH,
    status: OperationalAlertStatus.OPEN,
    source: 'production-readiness.slo',
    sourceReference: 'slo:api:p95',
    message: 'P95 API au-dessus du seuil',
    metadata: { objective: 'responseTime' },
    openedAt: new Date('2026-05-07T08:00:00.000Z'),
    lastSeenAt: new Date('2026-05-07T08:00:00.000Z'),
    occurrenceCount: 1,
    resolvedAt: null,
    resolvedById: null,
    resolutionSummary: null,
    createAuditLogId: null,
    resolveAuditLogId: null,
    createdAt: new Date('2026-05-07T08:00:00.000Z'),
    updatedAt: new Date('2026-05-07T08:00:00.000Z'),
    ...overrides,
  }) as OperationalAlert;

describe('OperationsService', () => {
  let service: OperationsService;
  let incidentRepository: RepositoryMock;
  let alertRepository: RepositoryMock;
  let journalRepository: RepositoryMock;
  let auditService: { log: jest.Mock };
  let opsNotificationService: {
    notifyIncidentDeclared: jest.Mock;
    notifyIncidentEscalated: jest.Mock;
    notify: jest.Mock;
  };

  beforeEach(async () => {
    incidentRepository = createRepositoryMock();
    alertRepository = createRepositoryMock();
    journalRepository = createRepositoryMock();
    incidentRepository.find.mockResolvedValue([]);
    incidentRepository.findOne.mockResolvedValue(null);
    alertRepository.find.mockResolvedValue([]);
    alertRepository.findOne.mockResolvedValue(null);
    journalRepository.find.mockResolvedValue([]);
    journalRepository.findOne.mockResolvedValue(null);
    auditService = { log: jest.fn().mockResolvedValue({ id: 99 }) };
    opsNotificationService = {
      notifyIncidentDeclared: jest.fn().mockResolvedValue(undefined),
      notifyIncidentEscalated: jest.fn().mockResolvedValue(undefined),
      notify: jest.fn().mockResolvedValue({ status: 'DRY_RUN' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OperationsService,
        {
          provide: getRepositoryToken(OperationIncident),
          useValue: incidentRepository,
        },
        {
          provide: getRepositoryToken(OperationalAlert),
          useValue: alertRepository,
        },
        {
          provide: getRepositoryToken(OperationsJournalEntry),
          useValue: journalRepository,
        },
        { provide: AuditService, useValue: auditService },
        { provide: OpsNotificationService, useValue: opsNotificationService },
      ],
    }).compile();

    service = moduleRef.get(OperationsService);
  });

  it('declares a post-production incident with initial proof and audit', async () => {
    const incident = await service.declareIncident(
      'tenant-a',
      {
        title: 'API prod indisponible',
        description: 'Erreur 500 sur publication planning',
        severity: OperationIncidentSeverity.CRITICAL,
        impactedService: 'planning',
        evidenceUrl: 'https://evidence.test/incidents/12/declaration',
        evidenceLabel: 'Capture alerte',
      },
      42,
    );

    expect(incident).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        status: OperationIncidentStatus.DECLARED,
        declaredById: 42,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:1',
      expect.objectContaining({
        action: 'DECLARE_INCIDENT',
        before: null,
      }),
    );
    expect(opsNotificationService.notifyIncidentDeclared).toHaveBeenCalledWith(
      incident,
    );
  });

  it('requires assignment or escalation before incident resolution', async () => {
    incidentRepository.findOne.mockResolvedValue(createIncident());

    await expect(
      service.resolveIncident(
        'tenant-a',
        12,
        {
          resolutionSummary: 'Correctif applique',
          evidenceUrl: 'https://evidence.test/incidents/12/resolution',
        },
        51,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns, escalates, resolves and closes an incident with proof', async () => {
    const incident = createIncident();
    incidentRepository.findOne
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({
        ...incident,
        status: OperationIncidentStatus.ASSIGNED,
        assignedToId: 77,
        timeline: [],
      })
      .mockResolvedValueOnce({
        ...incident,
        status: OperationIncidentStatus.ESCALATED,
        escalatedToId: 88,
        timeline: [],
      })
      .mockResolvedValueOnce({
        ...incident,
        status: OperationIncidentStatus.RESOLVED,
        resolvedById: 51,
        resolvedAt: new Date('2026-05-07T09:00:00.000Z'),
        evidence: [
          {
            label: 'Rapport correction',
            url: 'https://evidence.test/incidents/12/resolution',
            addedAt: '2026-05-07T09:00:00.000Z',
            addedById: 51,
            type: 'RESOLUTION',
          },
        ],
        timeline: [],
      });

    const assigned = await service.assignIncident(
      'tenant-a',
      12,
      { assignedToId: 77, note: 'Astreinte L1' },
      42,
    );
    const escalated = await service.escalateIncident(
      'tenant-a',
      12,
      {
        escalatedToId: 88,
        reason: 'Impact patient potentiel',
        evidenceUrl: 'https://evidence.test/incidents/12/escalation',
      },
      42,
    );
    const resolved = await service.resolveIncident(
      'tenant-a',
      12,
      {
        resolutionSummary: 'Correctif applique et smoke API vert',
        evidenceUrl: 'https://evidence.test/incidents/12/resolution',
        evidenceLabel: 'Rapport correction',
      },
      51,
    );
    const closed = await service.closeIncident(
      'tenant-a',
      12,
      {
        closureSummary: 'Reprise validee par exploitation',
        evidenceUrl: 'https://evidence.test/incidents/12/closure',
      },
      52,
    );

    expect(assigned.status).toBe(OperationIncidentStatus.ASSIGNED);
    expect(escalated.status).toBe(OperationIncidentStatus.ESCALATED);
    expect(resolved.status).toBe(OperationIncidentStatus.RESOLVED);
    expect(closed).toEqual(
      expect.objectContaining({
        status: OperationIncidentStatus.CLOSED,
        closedById: 52,
      }),
    );
    expect(closed.evidence).toEqual([
      objectContaining({ type: 'RESOLUTION' }),
      objectContaining({ type: 'CLOSURE' }),
    ]);
    expect(auditService.log).toHaveBeenLastCalledWith(
      'tenant-a',
      52,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:12',
      objectContaining({
        action: 'CLOSE_INCIDENT',
        before: objectContaining({
          status: OperationIncidentStatus.RESOLVED,
        }),
        after: objectContaining({
          status: OperationIncidentStatus.CLOSED,
        }),
      }),
    );
    expect(opsNotificationService.notifyIncidentEscalated).toHaveBeenCalledWith(
      escalated,
    );
  });

  it('prevents closing an unresolved incident', async () => {
    incidentRepository.findOne.mockResolvedValue(
      createIncident({ status: OperationIncidentStatus.ASSIGNED }),
    );

    await expect(
      service.closeIncident(
        'tenant-a',
        12,
        {
          closureSummary: 'Tentative de cloture',
          evidenceUrl: 'https://evidence.test/incidents/12/closure',
        },
        52,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an OPEN CRITICAL incident from a critical alert and records journal/audit traceability', async () => {
    const result = await service.syncAutomaticIncident(
      'tenant-a',
      {
        sourceType: 'ALERT',
        reference: 'agent-alert:7001',
        title: 'Alerte couverture critique',
        description: 'Couverture minimum non respectee en reanimation',
        alertSeverity: 'HIGH',
        impactedService: 'reanimation',
        evidenceUrl: 'https://evidence.test/alerts/7001',
        evidenceLabel: 'Alerte agent',
        occurredAt: '2026-05-07T07:45:00.000Z',
        metadata: { alertId: 7001, ruleCode: 'MIN_COVERAGE' },
      },
      0,
    );

    expect(result).toEqual(
      expect.objectContaining({
        created: true,
        updated: false,
        incident: expect.objectContaining({
          status: OperationIncidentStatus.OPEN,
          severity: OperationIncidentSeverity.CRITICAL,
          impactedService: 'reanimation',
          metadata: expect.objectContaining({
            source: 'operations:auto-incident',
            auto: expect.objectContaining({
              sourceType: 'ALERT',
              reference: 'agent-alert:7001',
              severity: OperationIncidentSeverity.CRITICAL,
            }),
            signal: expect.objectContaining({ alertId: 7001 }),
          }),
        }),
      }),
    );
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OperationsJournalEntryType.INCIDENT,
        status: OperationsJournalEntryStatus.OPEN,
        severity: OperationsJournalEntrySeverity.CRITICAL,
        relatedReference: 'ALERT:agent-alert:7001',
        metadata: expect.objectContaining({
          action: 'AUTO_CREATE_INCIDENT',
          sourceType: 'ALERT',
          reference: 'agent-alert:7001',
        }),
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      0,
      AuditAction.AUTO_GENERATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:1',
      expect.objectContaining({
        action: 'AUTO_CREATE_INCIDENT',
        before: null,
      }),
    );
  });

  it('deduplicates automatic incidents by source/reference and updates the open incident', async () => {
    const existing = createIncident({
      id: 31,
      status: OperationIncidentStatus.OPEN,
      severity: OperationIncidentSeverity.HIGH,
      metadata: {
        source: 'operations:auto-incident',
        auto: {
          sourceType: 'BACKUP',
          reference: 'daily-backup:2026-05-07',
          updates: 0,
        },
      },
      timeline: [],
    });
    incidentRepository.find.mockResolvedValue([existing]);

    const result = await service.syncAutomaticIncident(
      'tenant-a',
      {
        sourceType: 'BACKUP',
        reference: 'daily-backup:2026-05-07',
        title: 'Backup quotidien KO',
        description: 'Sauvegarde quotidienne en echec',
        checkStatus: 'KO',
        severity: OperationIncidentSeverity.CRITICAL,
        evidenceUrl: 'https://evidence.test/backups/2026-05-07',
      },
      0,
    );

    expect(result.created).toBe(false);
    expect(result.updated).toBe(true);
    expect(result.incident).toEqual(
      expect.objectContaining({
        id: 31,
        severity: OperationIncidentSeverity.CRITICAL,
        metadata: expect.objectContaining({
          auto: expect.objectContaining({
            sourceType: 'BACKUP',
            reference: 'daily-backup:2026-05-07',
            updates: 1,
          }),
        }),
      }),
    );
    expect(incidentRepository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Backup quotidien KO' }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      0,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:31',
      expect.objectContaining({
        action: 'AUTO_UPDATE_INCIDENT',
        before: expect.objectContaining({
          status: OperationIncidentStatus.OPEN,
        }),
      }),
    );
  });

  it('creates a HIGH incident from a KO production control and ignores non-critical signals', async () => {
    const backupResult = await service.syncAutomaticIncident(
      'tenant-a',
      {
        sourceType: 'BACKUP',
        reference: 'backup:nightly',
        title: 'Backup nightly KO',
        description: 'Le controle de restauration a echoue',
        checkStatus: 'KO',
      },
      0,
    );
    const alertResult = await service.syncAutomaticIncident(
      'tenant-a',
      {
        sourceType: 'ALERT',
        reference: 'agent-alert:low',
        title: 'Alerte faible',
        description: 'Signal faible sans impact operationnel critique',
        alertSeverity: 'MEDIUM',
      },
      0,
    );
    const okResult = await service.syncAutomaticIncident(
      'tenant-a',
      {
        sourceType: 'SLO',
        reference: 'slo:api:p95',
        title: 'SLO API',
        description: 'Controle nominal',
        checkStatus: 'OK',
      },
      0,
    );

    expect(backupResult.incident).toEqual(
      expect.objectContaining({
        status: OperationIncidentStatus.OPEN,
        severity: OperationIncidentSeverity.HIGH,
      }),
    );
    expect(alertResult).toEqual(
      expect.objectContaining({
        incident: null,
        ignoredReason: 'NON_CRITICAL_ALERT',
      }),
    );
    expect(okResult).toEqual(
      expect.objectContaining({
        incident: null,
        ignoredReason: 'CONTROL_OK',
      }),
    );
  });

  it('creates an operational alert with audit and journal traceability', async () => {
    const alert = await service.raiseOperationalAlert(
      'tenant-a',
      {
        type: OperationalAlertType.SLO_BREACH,
        severity: OperationalAlertSeverity.HIGH,
        source: 'production-readiness.slo',
        sourceReference: 'slo:api:p95',
        message: 'P95 API au-dessus du seuil',
        metadata: { objective: 'responseTime', actualMs: 950 },
      },
      42,
    );

    expect(alert).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        type: OperationalAlertType.SLO_BREACH,
        status: OperationalAlertStatus.OPEN,
        occurrenceCount: 1,
        createAuditLogId: 99,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.OPERATION_ALERT,
      'operational-alert:1',
      expect.objectContaining({
        action: 'CREATE_OPERATIONAL_ALERT',
        alertType: OperationalAlertType.SLO_BREACH,
        sourceReference: 'slo:api:p95',
      }),
    );
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OperationsJournalEntryType.ACTION,
        status: OperationsJournalEntryStatus.OPEN,
        relatedReference: 'operational-alert:1',
      }),
    );
  });

  it('deduplicates open operational alerts by tenant, type, source and reference', async () => {
    alertRepository.findOne.mockResolvedValueOnce(
      createAlert({
        occurrenceCount: 2,
        message: 'Ancienne mesure SLO',
      }),
    );

    const alert = await service.raiseOperationalAlert(
      'tenant-a',
      {
        type: OperationalAlertType.SLO_BREACH,
        severity: OperationalAlertSeverity.CRITICAL,
        source: 'production-readiness.slo',
        sourceReference: 'slo:api:p95',
        message: 'P95 API critique',
        metadata: { actualMs: 1500 },
      },
      42,
    );

    expect(alertRepository.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        type: OperationalAlertType.SLO_BREACH,
        source: 'production-readiness.slo',
        sourceReference: 'slo:api:p95',
        status: OperationalAlertStatus.OPEN,
      },
    });
    expect(alert).toEqual(
      expect.objectContaining({
        id: 44,
        severity: OperationalAlertSeverity.CRITICAL,
        message: 'P95 API critique',
        occurrenceCount: 3,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_ALERT,
      'operational-alert:44',
      expect.objectContaining({
        action: 'DEDUP_OPERATIONAL_ALERT',
        before: expect.objectContaining({ message: 'Ancienne mesure SLO' }),
      }),
    );
  });

  it('resolves an open operational alert and rejects already resolved alerts', async () => {
    alertRepository.findOne
      .mockResolvedValueOnce(createAlert())
      .mockResolvedValueOnce(
        createAlert({
          status: OperationalAlertStatus.RESOLVED,
          resolvedAt: new Date('2026-05-07T09:00:00.000Z'),
        }),
      );

    const resolved = await service.resolveAlert(
      'tenant-a',
      44,
      { resolutionSummary: 'Latence revenue sous le seuil' },
      51,
    );

    expect(resolved).toEqual(
      expect.objectContaining({
        status: OperationalAlertStatus.RESOLVED,
        resolvedById: 51,
        resolutionSummary: 'Latence revenue sous le seuil',
        resolveAuditLogId: 99,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      51,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_ALERT,
      'operational-alert:44',
      expect.objectContaining({
        action: 'RESOLVE_OPERATIONAL_ALERT',
        before: expect.objectContaining({
          status: OperationalAlertStatus.OPEN,
        }),
      }),
    );

    await expect(
      service.resolveAlert(
        'tenant-a',
        44,
        { resolutionSummary: 'Deuxieme resolution' },
        51,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('syncs KO and OK operational controls into open and resolved alerts', async () => {
    const opened = await service.syncOperationalAlert(
      'tenant-a',
      {
        type: OperationalAlertType.BACKUP_STALE,
        source: 'tenant-backups.metrics',
        reference: 'backup:freshness',
        checkStatus: 'KO',
        message: 'Dernier backup trop ancien',
        severity: OperationalAlertSeverity.HIGH,
        metadata: { ageHours: 36 },
      },
      42,
    );
    alertRepository.findOne.mockResolvedValueOnce(
      createAlert({
        type: OperationalAlertType.BACKUP_STALE,
        source: 'tenant-backups.metrics',
        sourceReference: 'backup:freshness',
      }),
    );
    const resolved = await service.syncOperationalAlert(
      'tenant-a',
      {
        type: OperationalAlertType.BACKUP_STALE,
        source: 'tenant-backups.metrics',
        reference: 'backup:freshness',
        checkStatus: 'OK',
        message: 'Backup revenu conforme',
      },
      42,
    );

    expect(opened).toEqual(
      expect.objectContaining({
        action: 'OPENED_OR_UPDATED',
        alert: expect.objectContaining({
          type: OperationalAlertType.BACKUP_STALE,
          status: OperationalAlertStatus.OPEN,
        }),
      }),
    );
    expect(resolved).toEqual(
      expect.objectContaining({
        action: 'RESOLVED',
        alert: expect.objectContaining({
          type: OperationalAlertType.BACKUP_STALE,
          status: OperationalAlertStatus.RESOLVED,
          resolutionSummary: 'Backup revenu conforme',
        }),
      }),
    );
  });

  it('scopes incident lookup by tenant', async () => {
    await expect(service.findIncident('tenant-b', 12)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(incidentRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-b', id: 12 },
    });
  });

  it('creates a journal entry linked to audit evidence', async () => {
    const entry = await service.createJournalEntry(
      'tenant-a',
      {
        type: OperationsJournalEntryType.INCIDENT,
        severity: OperationsJournalEntrySeverity.HIGH,
        title: 'Latence API post-deploiement',
        description: 'P95 au-dessus du seuil sur les routes planning',
        relatedAuditLogId: 12,
        occurredAt: '2026-05-06T08:00:00.000Z',
      },
      42,
    );

    expect(entry).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        type: OperationsJournalEntryType.INCIDENT,
        status: OperationsJournalEntryStatus.OPEN,
        severity: OperationsJournalEntrySeverity.HIGH,
        auditLogId: 99,
        relatedAuditLogId: 12,
        createdById: 42,
      }),
    );
    expect(auditService.log).toHaveBeenLastCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.PLANNING,
      'operations-journal:1',
      expect.objectContaining({
        action: 'CREATE_OPERATIONS_JOURNAL_ENTRY',
        journalEntryId: 1,
        journalEntryType: OperationsJournalEntryType.INCIDENT,
        relatedAuditLogId: 12,
      }),
    );
  });

  it('requires evidence journal entries to include an evidence URL', async () => {
    await expect(
      service.createJournalEntry(
        'tenant-a',
        {
          type: OperationsJournalEntryType.EVIDENCE,
          title: 'Capture audit',
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a journal entry and records before/after snapshots in audit', async () => {
    journalRepository.findOne.mockResolvedValue({
      id: 4,
      tenantId: 'tenant-a',
      type: OperationsJournalEntryType.ACTION,
      status: OperationsJournalEntryStatus.IN_PROGRESS,
      severity: OperationsJournalEntrySeverity.MEDIUM,
      title: 'Verifier sauvegarde',
      description: null,
      occurredAt: new Date('2026-05-06T08:00:00.000Z'),
      resolvedAt: null,
      ownerId: null,
      createdById: 1,
      updatedById: null,
      auditLogId: 55,
      relatedAuditLogId: 12,
      relatedReference: null,
      evidenceUrl: null,
      evidenceLabel: null,
      metadata: null,
    });

    const entry = await service.updateJournalEntry(
      'tenant-a',
      4,
      {
        status: OperationsJournalEntryStatus.RESOLVED,
        resolvedAt: '2026-05-06T09:00:00.000Z',
        evidenceUrl: 'https://evidence.test/backup-ok',
      },
      42,
    );

    expect(entry).toEqual(
      expect.objectContaining({
        id: 4,
        status: OperationsJournalEntryStatus.RESOLVED,
        auditLogId: 99,
        updatedById: 42,
      }),
    );
    expect(auditService.log).toHaveBeenLastCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      'operations-journal:4',
      expect.objectContaining({
        action: 'UPDATE_OPERATIONS_JOURNAL_ENTRY',
        before: objectContaining({
          status: OperationsJournalEntryStatus.IN_PROGRESS,
        }),
        after: objectContaining({
          status: OperationsJournalEntryStatus.RESOLVED,
          evidenceUrl: 'https://evidence.test/backup-ok',
        }),
      }),
    );
  });

  it('scopes journal lookup by tenant and filters by linked audit log', async () => {
    await service.findJournalEntries('tenant-a', {
      type: OperationsJournalEntryType.DECISION,
      relatedAuditLogId: 12,
      limit: 25,
    });
    await expect(
      service.getJournalEntry('tenant-b', 404),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(journalRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: objectContaining({
          tenantId: 'tenant-a',
          type: OperationsJournalEntryType.DECISION,
          relatedAuditLogId: 12,
        }),
        order: { occurredAt: 'DESC', id: 'DESC' },
        take: 25,
      }),
    );
    expect(journalRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-b', id: 404 },
    });
  });

  it('auto-escalates stale high/critical incidents, alerts and journal entries once', async () => {
    const staleIncident = createIncident({
      id: 12,
      declaredAt: new Date('2026-05-07T08:00:00.000Z'),
    });
    const staleAlert = createAlert({
      id: 44,
      severity: OperationalAlertSeverity.HIGH,
      openedAt: new Date('2026-05-07T04:00:00.000Z'),
    });
    const staleJournalEntry = {
      id: 71,
      tenantId: 'tenant-a',
      type: OperationsJournalEntryType.INCIDENT,
      status: OperationsJournalEntryStatus.OPEN,
      severity: OperationsJournalEntrySeverity.HIGH,
      title: 'Alerte API non traitee',
      description: 'Aucune prise en charge',
      occurredAt: new Date('2026-05-07T04:00:00.000Z'),
      resolvedAt: null,
      ownerId: null,
      createdById: 1,
      updatedById: null,
      auditLogId: null,
      relatedAuditLogId: null,
      relatedReference: null,
      evidenceUrl: null,
      evidenceLabel: null,
      metadata: null,
    } as OperationsJournalEntry;

    incidentRepository.find.mockResolvedValue([staleIncident]);
    alertRepository.find.mockResolvedValue([staleAlert]);
    journalRepository.find.mockResolvedValue([staleJournalEntry]);

    const result = await service.runOperationalEscalation(
      'tenant-a',
      {
        escalationUserId: 91,
        now: '2026-05-07T10:00:00.000Z',
      },
      42,
    );

    expect(result.escalatedIncidents).toHaveLength(1);
    expect(result.escalatedAlerts).toHaveLength(1);
    expect(result.escalatedJournalEntries).toHaveLength(1);
    expect(result.skipped).toEqual({
      incidents: 0,
      alerts: 0,
      journalEntries: 0,
    });
    expect(incidentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        status: OperationIncidentStatus.ESCALATED,
        escalatedToId: 91,
        escalationReason: expect.stringContaining('CRITICAL'),
      }),
    );
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 44,
        metadata: expect.objectContaining({
          operationalEscalations: [
            expect.objectContaining({ trigger: 'UNRESOLVED' }),
          ],
        }),
      }),
    );
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 71,
        status: OperationsJournalEntryStatus.IN_PROGRESS,
        ownerId: 91,
        metadata: expect.objectContaining({
          operationalEscalations: [
            expect.objectContaining({ trigger: 'UNASSIGNED' }),
          ],
        }),
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_INCIDENT,
      'operation-incident:12',
      expect.objectContaining({
        action: 'AUTO_ESCALATE_INCIDENT',
        after: expect.objectContaining({
          status: OperationIncidentStatus.ESCALATED,
        }),
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.OPERATION_ALERT,
      'operational-alert:44',
      expect.objectContaining({
        action: 'AUTO_ESCALATE_OPERATIONAL_ALERT',
      }),
    );
    expect(opsNotificationService.notifyIncidentEscalated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 12 }),
    );
    expect(opsNotificationService.notify).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate an existing operational escalation marker', async () => {
    incidentRepository.find.mockResolvedValue([
      createIncident({
        timeline: [
          {
            action: 'AUTO_ESCALATE_INCIDENT',
            at: '2026-05-07T09:00:00.000Z',
            actorId: 42,
            note: 'Deja escalade',
            fromStatus: OperationIncidentStatus.DECLARED,
            toStatus: OperationIncidentStatus.ESCALATED,
            details: {
              operationalEscalation: {
                trigger: 'UNASSIGNED',
                escalatedAt: '2026-05-07T09:00:00.000Z',
                thresholdMinutes: 15,
                ageMinutes: 60,
                escalationUserId: 91,
              },
            },
          },
        ],
      }),
    ]);
    alertRepository.find.mockResolvedValue([
      createAlert({
        metadata: {
          operationalEscalations: [
            {
              trigger: 'UNRESOLVED',
              escalatedAt: '2026-05-07T09:00:00.000Z',
              thresholdMinutes: 240,
              ageMinutes: 300,
              escalationUserId: 91,
            },
          ],
        },
      }),
    ]);

    const result = await service.runOperationalEscalation(
      'tenant-a',
      {
        escalationUserId: 91,
        now: '2026-05-07T10:00:00.000Z',
      },
      42,
    );

    expect(result.escalatedIncidents).toEqual([]);
    expect(result.escalatedAlerts).toEqual([]);
    expect(result.skipped.incidents).toBe(1);
    expect(result.skipped.alerts).toBe(1);
    expect(incidentRepository.save).not.toHaveBeenCalled();
    expect(alertRepository.save).not.toHaveBeenCalled();
  });
});
