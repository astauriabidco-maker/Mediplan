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
  OperationRoutineRun,
  OperationRoutineRunStatus,
} from './entities/operation-routine-run.entity';
import { OperationRunbookTemplate } from './entities/operation-runbook-template.entity';
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
import { OpsActionCenterWorkflowMutation } from './entities/ops-action-center-workflow-mutation.entity';
import {
  OpsActionCenterItemType,
  OpsActionCenterPriority,
  OpsActionCenterStatus,
  OpsActionCenterWorkflowAction,
} from './dto/ops-action-center.dto';
import { OpsNotificationStatus } from './dto/ops-notification.dto';
import { OpsSloStatus } from './dto/ops-slo.dto';
import { OpsNotificationService } from './ops-notification.service';
import { OpsPreActionValidationService } from './ops-pre-action-validation.service';
import { OperationsService } from './operations.service';

type RepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createQueryBuilderMock = () => {
  const queryBuilder = {
    select: jest.fn(),
    distinct: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.distinct.mockReturnValue(queryBuilder);
  return queryBuilder;
};

const createTenantQueryBuilderMock = (tenantIds: string[]) => {
  const queryBuilder = createQueryBuilderMock();
  queryBuilder.getRawMany.mockResolvedValue(
    tenantIds.map((tenantId) => ({ tenantId })),
  );
  return queryBuilder;
};

const createRepositoryMock = (): RepositoryMock => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(
    (
      entity: Partial<
        | OperationIncident
        | OperationsJournalEntry
        | OperationalAlert
        | OperationRoutineRun
        | OperationRunbookTemplate
        | OpsActionCenterWorkflowMutation
      >,
    ) => entity,
  ),
  save: jest.fn(
    (
      entity: Partial<
        | OperationIncident
        | OperationsJournalEntry
        | OperationalAlert
        | OperationRoutineRun
        | OperationRunbookTemplate
        | OpsActionCenterWorkflowMutation
      >,
    ) =>
      Promise.resolve({
        id: entity.id ?? 1,
        createdAt: entity.createdAt ?? new Date('2026-05-07T08:00:00.000Z'),
        updatedAt: entity.updatedAt ?? new Date('2026-05-07T08:00:00.000Z'),
        ...entity,
      } as
        | OperationIncident
        | OperationsJournalEntry
        | OperationalAlert
        | OperationRoutineRun
        | OperationRunbookTemplate
        | OpsActionCenterWorkflowMutation),
  ),
  createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
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

const createJournalEntry = (
  overrides: Partial<OperationsJournalEntry> = {},
): OperationsJournalEntry =>
  ({
    id: 71,
    tenantId: 'tenant-a',
    type: OperationsJournalEntryType.ACTION,
    status: OperationsJournalEntryStatus.OPEN,
    severity: OperationsJournalEntrySeverity.HIGH,
    title: 'Verifier sauvegarde',
    description: 'Controle backup a terminer',
    occurredAt: new Date('2026-05-07T06:00:00.000Z'),
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
    createdAt: new Date('2026-05-07T06:00:00.000Z'),
    updatedAt: new Date('2026-05-07T06:00:00.000Z'),
    ...overrides,
  }) as OperationsJournalEntry;

const createRoutineRun = (
  overrides: Partial<OperationRoutineRun> = {},
): OperationRoutineRun =>
  ({
    id: 9,
    tenantId: 'tenant-a',
    routine: 'ops:daily',
    status: OperationRoutineRunStatus.PASSED,
    startedAt: new Date('2026-05-07T06:00:00.000Z'),
    finishedAt: new Date('2026-05-07T06:01:00.000Z'),
    durationMs: 60000,
    error: null,
    artifacts: [
      {
        type: 'REPORT',
        label: 'Daily report',
        url: 'https://reports.test/ops-daily-check-2026-05-07.md',
      },
    ],
    metadata: { decision: 'POST_PROD_READY' },
    createdAt: new Date('2026-05-07T06:01:00.000Z'),
    updatedAt: new Date('2026-05-07T06:01:00.000Z'),
    ...overrides,
  }) as OperationRoutineRun;

describe('OperationsService', () => {
  let service: OperationsService;
  let incidentRepository: RepositoryMock;
  let alertRepository: RepositoryMock;
  let journalRepository: RepositoryMock;
  let routineRunRepository: RepositoryMock;
  let runbookTemplateRepository: RepositoryMock;
  let actionCenterWorkflowRepository: RepositoryMock;
  let auditService: { log: jest.Mock };
  let opsNotificationService: {
    notifyIncidentDeclared: jest.Mock;
    notifyIncidentEscalated: jest.Mock;
    notify: jest.Mock;
  };
  let preActionValidationService: OpsPreActionValidationService;

  beforeEach(async () => {
    incidentRepository = createRepositoryMock();
    alertRepository = createRepositoryMock();
    journalRepository = createRepositoryMock();
    routineRunRepository = createRepositoryMock();
    runbookTemplateRepository = createRepositoryMock();
    actionCenterWorkflowRepository = createRepositoryMock();
    incidentRepository.find.mockResolvedValue([]);
    incidentRepository.findOne.mockResolvedValue(null);
    alertRepository.find.mockResolvedValue([]);
    alertRepository.findOne.mockResolvedValue(null);
    journalRepository.find.mockResolvedValue([]);
    journalRepository.findOne.mockResolvedValue(null);
    routineRunRepository.find.mockResolvedValue([]);
    routineRunRepository.findOne.mockResolvedValue(null);
    runbookTemplateRepository.find.mockResolvedValue([]);
    runbookTemplateRepository.findOne.mockResolvedValue(null);
    actionCenterWorkflowRepository.find.mockResolvedValue([]);
    actionCenterWorkflowRepository.findOne.mockResolvedValue(null);
    auditService = { log: jest.fn().mockResolvedValue({ id: 99 }) };
    opsNotificationService = {
      notifyIncidentDeclared: jest.fn().mockResolvedValue(undefined),
      notifyIncidentEscalated: jest.fn().mockResolvedValue(undefined),
      notify: jest.fn().mockResolvedValue({ status: 'DRY_RUN' }),
    };
    preActionValidationService = new OpsPreActionValidationService();

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
        {
          provide: getRepositoryToken(OperationRoutineRun),
          useValue: routineRunRepository,
        },
        {
          provide: getRepositoryToken(OperationRunbookTemplate),
          useValue: runbookTemplateRepository,
        },
        {
          provide: getRepositoryToken(OpsActionCenterWorkflowMutation),
          useValue: actionCenterWorkflowRepository,
        },
        { provide: AuditService, useValue: auditService },
        { provide: OpsNotificationService, useValue: opsNotificationService },
        {
          provide: OpsPreActionValidationService,
          useValue: preActionValidationService,
        },
      ],
    }).compile();

    service = moduleRef.get(OperationsService);
  });

  it('records an operation routine run with computed duration and report artifacts', async () => {
    const run = await service.recordRoutineRun('tenant-a', {
      routine: 'ops:weekly-report',
      status: OperationRoutineRunStatus.PASSED,
      startedAt: '2026-05-07T06:00:00.000Z',
      finishedAt: '2026-05-07T06:02:30.000Z',
      artifacts: [
        {
          type: 'REPORT',
          label: 'Weekly JSON',
          url: 'https://reports.test/ops-weekly-report-2026-05-07.json',
        },
      ],
      metadata: { decision: 'POST_PROD_WEEKLY_STABLE' },
    });

    expect(routineRunRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        routine: 'ops:weekly-report',
        status: OperationRoutineRunStatus.PASSED,
        durationMs: 150000,
        error: null,
        artifacts: [
          expect.objectContaining({
            url: 'https://reports.test/ops-weekly-report-2026-05-07.json',
          }),
        ],
      }),
    );
    expect(run).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        routine: 'ops:weekly-report',
        durationMs: 150000,
      }),
    );
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('audits manual routine report generation without artifact URLs or stderr', async () => {
    const run = await service.recordRoutineRun('tenant-a', {
      routine: 'ops:weekly-report',
      status: OperationRoutineRunStatus.PASSED,
      startedAt: '2026-05-07T06:00:00.000Z',
      finishedAt: '2026-05-07T06:02:30.000Z',
      artifacts: [
        {
          type: 'REPORT',
          label: 'Weekly JSON',
          url: 'https://reports.test/ops-weekly-report-2026-05-07.json',
        },
      ],
      metadata: {
        trigger: 'manual',
        mode: 'dry-run',
        actorId: 77,
        exitCode: 0,
        stderrTail: 'debug output should stay out of audit',
      },
    });

    expect(run).toEqual(expect.objectContaining({ id: 1 }));
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      77,
      AuditAction.AUTO_GENERATE,
      AuditEntityType.PLANNING,
      'operation-routine-run:1',
      expect.objectContaining({
        action: 'GENERATE_OPS_ROUTINE_REPORT',
        routineRunId: 1,
        routine: 'ops:weekly-report',
        status: OperationRoutineRunStatus.PASSED,
        artifactCount: 1,
        artifactTypes: ['REPORT'],
        trigger: 'manual',
        mode: 'dry-run',
        exitCode: 0,
      }),
    );
    expect(auditService.log.mock.calls[0][5]).not.toHaveProperty('artifacts');
    expect(auditService.log.mock.calls[0][5]).not.toHaveProperty('stderrTail');
  });

  it('lists operation routine runs by tenant and filters', async () => {
    const filters = {
      routine: 'ops:daily',
      status: OperationRoutineRunStatus.FAILED,
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-07T23:59:59.000Z',
      limit: 20,
    };

    await service.listRoutineRuns('tenant-a', filters);

    expect(routineRunRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          routine: 'ops:daily',
          status: OperationRoutineRunStatus.FAILED,
        }),
        order: { startedAt: 'DESC', id: 'DESC' },
        take: 20,
      }),
    );
  });

  it('reads operation routine run detail within the resolved tenant', async () => {
    const expected = createRoutineRun();
    routineRunRepository.findOne.mockResolvedValue(expected);

    await expect(service.getRoutineRun('tenant-a', 9)).resolves.toBe(expected);
    expect(routineRunRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', id: 9 },
    });

    routineRunRepository.findOne.mockResolvedValue(null);
    await expect(service.getRoutineRun('tenant-a', 404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('aggregates observability metrics by tenant and period', async () => {
    alertRepository.find
      .mockResolvedValueOnce([
        createAlert({
          id: 1,
          severity: OperationalAlertSeverity.CRITICAL,
          openedAt: new Date('2026-05-06T06:00:00.000Z'),
        }),
        createAlert({
          id: 2,
          severity: OperationalAlertSeverity.HIGH,
          status: OperationalAlertStatus.RESOLVED,
          openedAt: new Date('2026-05-06T08:00:00.000Z'),
          resolvedAt: new Date('2026-05-06T09:00:00.000Z'),
        }),
      ])
      .mockResolvedValueOnce([createAlert({ id: 3 })]);
    incidentRepository.find
      .mockResolvedValueOnce([
        createIncident({
          id: 21,
          status: OperationIncidentStatus.CLOSED,
          declaredAt: new Date('2026-05-06T07:00:00.000Z'),
          resolvedAt: new Date('2026-05-06T08:00:00.000Z'),
          closedAt: new Date('2026-05-06T08:30:00.000Z'),
          metadata: {
            source: 'operations:auto-incident',
            auto: { sourceType: 'BACKUP', reference: 'backup:nightly' },
          },
        }),
        createIncident({
          id: 22,
          status: OperationIncidentStatus.RESOLVED,
          declaredAt: new Date('2026-05-05T06:00:00.000Z'),
          resolvedAt: new Date('2026-05-06T06:30:00.000Z'),
        }),
      ])
      .mockResolvedValueOnce([]);
    journalRepository.find
      .mockResolvedValueOnce([
        createJournalEntry({
          id: 31,
          type: OperationsJournalEntryType.NOTIFICATION,
          occurredAt: new Date('2026-05-06T09:00:00.000Z'),
          metadata: { notificationStatus: OpsNotificationStatus.SENT },
        }),
        createJournalEntry({
          id: 32,
          type: OperationsJournalEntryType.NOTIFICATION,
          occurredAt: new Date('2026-05-06T09:05:00.000Z'),
          metadata: { notificationStatus: OpsNotificationStatus.FAILED },
        }),
        createJournalEntry({
          id: 33,
          type: OperationsJournalEntryType.NOTIFICATION,
          occurredAt: new Date('2026-05-06T09:10:00.000Z'),
          metadata: { notificationStatus: OpsNotificationStatus.THROTTLED },
        }),
      ])
      .mockResolvedValueOnce([]);
    routineRunRepository.find.mockResolvedValueOnce([
      createRoutineRun({
        id: 41,
        status: OperationRoutineRunStatus.FAILED,
        startedAt: new Date('2026-05-06T05:00:00.000Z'),
      }),
      createRoutineRun({
        id: 42,
        status: OperationRoutineRunStatus.PASSED,
        startedAt: new Date('2026-05-06T06:00:00.000Z'),
      }),
    ]);

    const metrics = await service.getObservabilityMetrics(
      'tenant-a',
      {
        from: '2026-05-06T00:00:00.000Z',
        to: '2026-05-06T23:59:59.000Z',
      },
      77,
    );

    expect(metrics).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        alerts: {
          openBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 1 },
          totalOpen: 1,
        },
        incidents: {
          automaticOpened: 1,
          automaticClosed: 1,
          mttrApproxMinutes: 765,
          resolvedOrClosed: 2,
        },
        routines: { failed: 1 },
        notifications: {
          sent: 1,
          failed: 1,
          throttled: 1,
          dryRun: 0,
          partial: 0,
        },
        actionCenter: { total: 1 },
      }),
    );
    expect(alertRepository.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { tenantId: 'tenant-a' } }),
    );
    expect(routineRunRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a' } }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      77,
      AuditAction.READ,
      AuditEntityType.PLANNING,
      'ops-observability',
      expect.objectContaining({
        action: 'READ_OPS_OBSERVABILITY',
        sloSignals: expect.objectContaining({
          openAlerts: 1,
          failedRoutines: 1,
          actionCenterTotal: 1,
        }),
      }),
    );
  });

  it('calculates SLO objectives with statuses by tenant and period', async () => {
    alertRepository.find.mockResolvedValueOnce([
      createAlert({
        id: 1,
        status: OperationalAlertStatus.RESOLVED,
        openedAt: new Date('2026-05-08T08:00:00.000Z'),
        resolvedAt: new Date('2026-05-08T08:30:00.000Z'),
      }),
      createAlert({
        id: 2,
        status: OperationalAlertStatus.OPEN,
        type: OperationalAlertType.BACKUP_STALE,
        openedAt: new Date('2026-05-08T06:00:00.000Z'),
      }),
    ]);
    incidentRepository.find.mockResolvedValueOnce([
      createIncident({
        id: 21,
        status: OperationIncidentStatus.RESOLVED,
        declaredAt: new Date('2026-05-08T07:00:00.000Z'),
        resolvedAt: new Date('2026-05-08T09:00:00.000Z'),
      }),
    ]);
    journalRepository.find.mockResolvedValueOnce([
      createJournalEntry({
        id: 31,
        type: OperationsJournalEntryType.NOTIFICATION,
        occurredAt: new Date('2026-05-08T09:00:00.000Z'),
        metadata: { notificationStatus: OpsNotificationStatus.SENT },
      }),
      createJournalEntry({
        id: 32,
        type: OperationsJournalEntryType.NOTIFICATION,
        occurredAt: new Date('2026-05-08T09:05:00.000Z'),
        metadata: { notificationStatus: OpsNotificationStatus.FAILED },
      }),
    ]);
    routineRunRepository.find.mockResolvedValueOnce([
      createRoutineRun({
        id: 41,
        routine: 'backup',
        status: OperationRoutineRunStatus.PASSED,
        startedAt: new Date('2026-05-08T05:00:00.000Z'),
        finishedAt: new Date('2026-05-08T05:10:00.000Z'),
      }),
      createRoutineRun({
        id: 42,
        routine: 'daily',
        status: OperationRoutineRunStatus.FAILED,
        startedAt: new Date('2026-05-08T06:00:00.000Z'),
      }),
    ]);

    const slo = await service.getSloObjectives('tenant-a', {
      from: '2026-05-08T00:00:00.000Z',
      to: '2026-05-08T10:00:00.000Z',
    });

    expect(slo.status).toBe(OpsSloStatus.FAILED);
    expect(slo.objectives.alert_resolution_delay).toEqual(
      expect.objectContaining({
        status: OpsSloStatus.PASSED,
        actual: expect.objectContaining({ value: 30, sampleSize: 1 }),
      }),
    );
    expect(slo.objectives.open_alert_age).toEqual(
      expect.objectContaining({
        status: OpsSloStatus.WARNING,
        actual: expect.objectContaining({ value: 240, sampleSize: 1 }),
      }),
    );
    expect(slo.objectives.incident_mttr).toEqual(
      expect.objectContaining({
        status: OpsSloStatus.PASSED,
        actual: expect.objectContaining({ value: 120, sampleSize: 1 }),
      }),
    );
    expect(slo.objectives.backup_freshness).toEqual(
      expect.objectContaining({
        status: OpsSloStatus.FAILED,
        actual: expect.objectContaining({ value: 5, sampleSize: 1 }),
        details: expect.objectContaining({ openBackupAlerts: 1 }),
      }),
    );
    expect(slo.objectives.routine_success_rate).toEqual(
      expect.objectContaining({
        status: OpsSloStatus.FAILED,
        actual: expect.objectContaining({ value: 50, sampleSize: 2 }),
      }),
    );
    expect(slo.objectives.notification_delivery).toEqual(
      expect.objectContaining({
        status: OpsSloStatus.FAILED,
        actual: expect.objectContaining({ value: 50, sampleSize: 2 }),
      }),
    );
  });

  it('aggregates a multi-tenant ops summary for a scoped tenant', async () => {
    const criticalAlert = createAlert({
      id: 1,
      severity: OperationalAlertSeverity.CRITICAL,
    });
    const escalatedIncident = createIncident({
      id: 2,
      severity: OperationIncidentSeverity.HIGH,
      status: OperationIncidentStatus.ESCALATED,
      escalatedAt: new Date('2026-05-07T08:10:00.000Z'),
      escalationReason: 'Impact patient potentiel',
    });
    const failedBackup = createRoutineRun({
      id: 3,
      routine: 'tenant-backup:nightly',
      status: OperationRoutineRunStatus.FAILED,
      startedAt: new Date('2026-05-07T05:00:00.000Z'),
      finishedAt: new Date('2026-05-07T05:02:00.000Z'),
      error: 'Export object storage unavailable',
      artifacts: [
        {
          label: 'Backup report',
          url: 'https://reports.test/backups/tenant-a/2026-05-07.json',
        },
      ],
    });

    alertRepository.find
      .mockResolvedValueOnce([criticalAlert])
      .mockResolvedValueOnce([criticalAlert]);
    incidentRepository.find
      .mockResolvedValueOnce([escalatedIncident])
      .mockResolvedValueOnce([escalatedIncident]);
    routineRunRepository.find.mockResolvedValueOnce([failedBackup]);
    journalRepository.find.mockResolvedValueOnce([]);

    const summary = await service.getMultiTenantSummary(['tenant-a']);

    expect(summary.scope).toEqual({ tenantId: 'tenant-a', allTenants: false });
    expect(summary.totals).toEqual(
      expect.objectContaining({
        tenants: 1,
        criticalTenants: 1,
        openAlerts: 1,
        activeIncidents: 1,
        failedRoutines: 1,
      }),
    );
    expect(summary.tenants[0]).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        status: 'CRITICAL',
        alerts: expect.objectContaining({
          open: 1,
          critical: 1,
        }),
        incidents: expect.objectContaining({
          active: 1,
          escalated: 1,
        }),
        routines: {
          failed: 1,
          lastFailedAt: '2026-05-07T05:00:00.000Z',
        },
        lastBackup: expect.objectContaining({
          routine: 'tenant-backup:nightly',
          status: OperationRoutineRunStatus.FAILED,
          artifactUrl: 'https://reports.test/backups/tenant-a/2026-05-07.json',
        }),
      }),
    );
    expect(alertRepository.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { tenantId: 'tenant-a', status: OperationalAlertStatus.OPEN },
      }),
    );
    expect(incidentRepository.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
    expect(routineRunRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a' } }),
    );
  });

  it('discovers tenant ids across ops entities for super-admin consolidation', async () => {
    alertRepository.createQueryBuilder.mockReturnValue(
      createTenantQueryBuilderMock(['tenant-b']),
    );
    incidentRepository.createQueryBuilder.mockReturnValue(
      createTenantQueryBuilderMock(['tenant-a']),
    );
    routineRunRepository.createQueryBuilder.mockReturnValue(
      createTenantQueryBuilderMock(['tenant-a', 'tenant-c']),
    );
    journalRepository.createQueryBuilder.mockReturnValue(
      createTenantQueryBuilderMock([]),
    );
    const buildTenantSummary = jest
      .spyOn(service as any, 'buildTenantSummary')
      .mockImplementation((tenantId: string) =>
        Promise.resolve({
          tenantId,
          status: 'OK',
          alerts: {
            open: 0,
            critical: 0,
            bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
          },
          incidents: { active: 0, critical: 0, escalated: 0 },
          routines: { failed: 0, lastFailedAt: null },
          lastBackup: null,
          actionCenter: { total: 0, critical: 0, topItems: [] },
        }),
      );

    const summary = await service.getMultiTenantSummary();

    expect(summary.scope).toEqual({ tenantId: null, allTenants: true });
    expect(summary.tenants.map((tenant) => tenant.tenantId)).toEqual([
      'tenant-a',
      'tenant-b',
      'tenant-c',
    ]);
    expect(buildTenantSummary).toHaveBeenCalledTimes(3);
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

  it('generates a guided runbook from an open operational alert', async () => {
    alertRepository.findOne.mockResolvedValue(
      createAlert({
        severity: OperationalAlertSeverity.CRITICAL,
        type: OperationalAlertType.BACKUP_STALE,
        source: 'tenant-backups.metrics',
        sourceReference: 'backup:freshness',
        message: 'Dernier backup trop ancien',
      }),
    );

    const runbook = await service.generateAlertRunbook('tenant-a', 44, 77);

    expect(alertRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', id: 44 },
    });
    expect(runbook).toEqual(
      expect.objectContaining({
        id: 'alert-44-runbook',
        reference: expect.objectContaining({
          sourceType: 'ALERT',
          id: 44,
          tenantId: 'tenant-a',
          severity: OperationalAlertSeverity.CRITICAL,
          sourceReference: 'backup:freshness',
        }),
        next: expect.objectContaining({
          priority: 'CRITICAL',
          recommendedActionId: 'resolve-alert',
          waitingOn: expect.arrayContaining(['evidence', 'resolution']),
        }),
      }),
    );
    expect(runbook.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Mitigate and prove',
          requiredPermission: 'operations:write',
        }),
      ]),
    );
    expect(runbook.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'resolve-alert',
          endpoint: '/ops/alerts/44/resolve',
          enabled: true,
        }),
        expect.objectContaining({
          id: 'run-escalation',
          endpoint: '/ops/escalations/run',
          enabled: true,
        }),
      ]),
    );
    expect(runbook.expectedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Source reference',
          requiredFor: expect.arrayContaining(['resolution']),
        }),
      ]),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      77,
      AuditAction.READ,
      AuditEntityType.OPERATION_ALERT,
      'ops-runbook:alert:44',
      expect.objectContaining({
        action: 'READ_OPS_RUNBOOK',
        sourceType: 'ALERT',
        sourceId: 44,
        status: OperationalAlertStatus.OPEN,
        severity: OperationalAlertSeverity.CRITICAL,
        recommendedActionId: 'resolve-alert',
        waitingOn: expect.arrayContaining(['evidence', 'resolution']),
      }),
    );
  });

  it('generates incident runbook actions based on ownership and status', async () => {
    incidentRepository.findOne.mockResolvedValue(
      createIncident({
        status: OperationIncidentStatus.ASSIGNED,
        assignedToId: 77,
        evidence: [
          {
            label: 'Declaration',
            url: 'https://evidence.test/incidents/12/declaration',
            addedAt: '2026-05-07T08:00:00.000Z',
            addedById: 42,
            type: 'DECLARATION',
          },
        ],
      }),
    );

    const runbook = await service.generateIncidentRunbook('tenant-a', 12);

    expect(runbook.reference).toEqual(
      expect.objectContaining({
        sourceType: 'INCIDENT',
        impactedService: 'planning',
      }),
    );
    expect(runbook.next).toEqual(
      expect.objectContaining({
        recommendedActionId: 'escalate-incident',
        waitingOn: ['resolution'],
      }),
    );
    expect(runbook.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'assign-incident',
          enabled: false,
        }),
        expect.objectContaining({
          id: 'resolve-incident',
          endpoint: '/ops/incidents/12/resolve',
          enabled: true,
        }),
      ]),
    );
    expect(runbook.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'owner-set',
          expected: 'Owner/escalation target is user 77.',
        }),
      ]),
    );
  });

  it('generates journal runbooks without enabling writes on closed records', async () => {
    journalRepository.findOne.mockResolvedValue({
      id: 4,
      tenantId: 'tenant-a',
      type: OperationsJournalEntryType.ACTION,
      status: OperationsJournalEntryStatus.CLOSED,
      severity: OperationsJournalEntrySeverity.MEDIUM,
      title: 'Verifier sauvegarde',
      description: 'Controle termine',
      occurredAt: new Date('2026-05-06T08:00:00.000Z'),
      resolvedAt: new Date('2026-05-06T09:00:00.000Z'),
      ownerId: 77,
      createdById: 1,
      updatedById: 42,
      auditLogId: 55,
      relatedAuditLogId: 12,
      relatedReference: 'backup:freshness',
      evidenceUrl: 'https://evidence.test/backup-ok',
      evidenceLabel: 'Backup OK',
      metadata: null,
    });

    const runbook = await service.generateJournalRunbook('tenant-a', 4);

    expect(runbook.next).toEqual(
      expect.objectContaining({
        priority: 'MEDIUM',
        recommendedActionId: 'read-source',
        waitingOn: [],
      }),
    );
    expect(runbook.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'update-journal',
          endpoint: '/ops/journal/4',
          enabled: false,
        }),
      ]),
    );
    expect(runbook.requiredPermissions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: 'operations:write' }),
      ]),
    );
  });

  it('applies the highest active tenant/service runbook template over defaults', async () => {
    alertRepository.findOne.mockResolvedValue(
      createAlert({
        type: OperationalAlertType.SLO_BREACH,
        metadata: { service: 'urgences' },
      }),
    );
    runbookTemplateRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: null,
        service: null,
        sourceType: 'ALERT',
        type: null,
        version: 4,
        active: true,
        steps: [],
        evidence: [
          {
            label: 'Generic proof',
            expected: 'Generic operational proof',
            requiredFor: ['resolution'],
          },
        ],
        actions: [],
        requiredPermissions: null,
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        service: 'urgences',
        sourceType: 'ALERT',
        type: OperationalAlertType.SLO_BREACH,
        version: 1,
        active: true,
        steps: [
          {
            order: 1,
            title: 'Tenant SLO playbook',
            why: 'Service-specific SLO ownership.',
            instruction: 'Call the tenant operations lead.',
            requiredRole: 'Ops lead',
            requiredPermission: 'operations:write',
            checks: [],
            evidence: [],
            actions: [],
          },
        ],
        evidence: [
          {
            label: 'Urgences SLO graph',
            expected: 'P95 graph scoped to urgences.',
            requiredFor: ['resolution'],
          },
        ],
        actions: [
          {
            id: 'resolve-alert',
            label: 'Resolve urgences alert',
            method: 'PATCH',
            endpoint: '/ops/alerts/44/resolve',
            requiredPermission: 'operations:write',
            enabled: true,
            why: 'Tenant/service template action.',
          },
        ],
        requiredPermissions: [
          {
            role: 'Ops lead urgences',
            permission: 'operations:write',
            reason: 'Operate tenant/service SLO runbook.',
          },
        ],
      },
      {
        id: 3,
        tenantId: 'tenant-a',
        service: 'urgences',
        sourceType: 'ALERT',
        type: OperationalAlertType.SLO_BREACH,
        version: 2,
        active: false,
        steps: [],
        evidence: [],
        actions: [],
        requiredPermissions: null,
      },
    ] as OperationRunbookTemplate[]);

    const runbook = await service.generateAlertRunbook('tenant-a', 44);

    expect(runbook.template).toEqual(
      expect.objectContaining({
        id: 2,
        version: 1,
        tenantId: 'tenant-a',
        service: 'urgences',
        type: OperationalAlertType.SLO_BREACH,
      }),
    );
    expect(runbook.reference).toEqual(
      expect.objectContaining({
        sourceType: 'ALERT',
        type: OperationalAlertType.SLO_BREACH,
      }),
    );
    expect(runbook.steps).toEqual([
      expect.objectContaining({ title: 'Tenant SLO playbook' }),
    ]);
    expect(runbook.expectedEvidence).toEqual([
      expect.objectContaining({ label: 'Urgences SLO graph' }),
    ]);
    expect(runbook.requiredPermissions).toEqual([
      expect.objectContaining({ role: 'Ops lead urgences' }),
    ]);
  });

  it('falls back from tenant/type template to default active template and keeps latest version', async () => {
    journalRepository.findOne.mockResolvedValue(
      createJournalEntry({
        id: 4,
        type: OperationsJournalEntryType.ACTION,
        metadata: { service: 'bloc' },
      }),
    );
    runbookTemplateRepository.find.mockResolvedValue([
      {
        id: 10,
        tenantId: null,
        service: null,
        sourceType: 'JOURNAL',
        type: null,
        version: 1,
        active: true,
        steps: [],
        evidence: [
          {
            label: 'Default v1 evidence',
            expected: 'Old default proof.',
            requiredFor: ['resolution'],
          },
        ],
        actions: [],
        requiredPermissions: null,
      },
      {
        id: 11,
        tenantId: null,
        service: null,
        sourceType: 'JOURNAL',
        type: null,
        version: 3,
        active: true,
        steps: [],
        evidence: [
          {
            label: 'Default v3 evidence',
            expected: 'Current default proof.',
            requiredFor: ['resolution'],
          },
        ],
        actions: [],
        requiredPermissions: null,
      },
    ] as OperationRunbookTemplate[]);

    const runbook = await service.generateJournalRunbook('tenant-a', 4);

    expect(runbook.template).toEqual(
      expect.objectContaining({
        id: 11,
        version: 3,
        tenantId: null,
        service: null,
        type: null,
      }),
    );
    expect(runbook.expectedEvidence).toEqual([
      expect.objectContaining({ label: 'Default v3 evidence' }),
    ]);
    expect(runbook.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'update-journal' }),
      ]),
    );
  });

  it('uses generated runbook when no active template matches', async () => {
    incidentRepository.findOne.mockResolvedValue(
      createIncident({
        impactedService: 'planning',
        metadata: {
          source: 'operations:auto-incident',
          auto: { sourceType: 'BACKUP', reference: 'backup:nightly' },
        },
      }),
    );
    runbookTemplateRepository.find.mockResolvedValue([
      {
        id: 20,
        tenantId: 'tenant-b',
        service: 'planning',
        sourceType: 'INCIDENT',
        type: 'BACKUP',
        version: 1,
        active: true,
        steps: [],
        evidence: [],
        actions: [],
        requiredPermissions: null,
      },
    ] as OperationRunbookTemplate[]);

    const runbook = await service.generateIncidentRunbook('tenant-a', 12);

    expect(runbook.template).toBeNull();
    expect(runbook.reference).toEqual(
      expect.objectContaining({
        sourceType: 'INCIDENT',
        type: 'BACKUP',
        impactedService: 'planning',
      }),
    );
    expect(runbook.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'assign-incident' }),
        expect.objectContaining({ id: 'resolve-incident' }),
      ]),
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

  it('aggregates the production action center from alerts, automatic incidents and journal decisions', async () => {
    alertRepository.find.mockResolvedValue([
      createAlert({
        id: 44,
        severity: OperationalAlertSeverity.HIGH,
        openedAt: new Date('2026-05-07T05:00:00.000Z'),
      }),
    ]);
    incidentRepository.find.mockResolvedValue([
      createIncident({
        id: 12,
        status: OperationIncidentStatus.OPEN,
        severity: OperationIncidentSeverity.CRITICAL,
        declaredAt: new Date('2026-05-07T08:00:00.000Z'),
        metadata: {
          source: 'operations:auto-incident',
          auto: {
            sourceType: 'BACKUP',
            reference: 'backup:nightly',
          },
        },
      }),
    ]);
    journalRepository.find.mockResolvedValue([
      createJournalEntry({
        id: 71,
        type: OperationsJournalEntryType.DECISION,
        status: OperationsJournalEntryStatus.OPEN,
        severity: OperationsJournalEntrySeverity.CRITICAL,
        title: 'Decision go/no-go production',
        occurredAt: new Date('2026-05-07T04:00:00.000Z'),
      }),
    ]);

    const result = await service.getActionCenter('tenant-a', { limit: 10 }, 77);

    expect(result).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        total: 4,
        filters: {
          status: null,
          type: null,
          limit: 10,
        },
      }),
    );
    expect(result.items.map((item) => item.type)).toEqual([
      OpsActionCenterItemType.DECISION_REQUIRED,
      OpsActionCenterItemType.AUTO_INCIDENT,
      OpsActionCenterItemType.MISSING_EVIDENCE,
      OpsActionCenterItemType.OPERATIONAL_ALERT,
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'operations-journal:71:decision',
        priority: 'CRITICAL',
        status: OpsActionCenterStatus.WAITING_DECISION,
        sourceReference: expect.objectContaining({
          entity: 'OperationsJournalEntry',
          id: 71,
          tenantId: 'tenant-a',
        }),
      }),
    );
    expect(alertRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-a',
          status: OperationalAlertStatus.OPEN,
        },
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      77,
      AuditAction.READ,
      AuditEntityType.PLANNING,
      'ops-action-center',
      expect.objectContaining({
        action: 'READ_OPS_ACTION_CENTER',
        filters: { status: null, type: null, limit: 10 },
        total: 4,
        itemTypeCounts: expect.objectContaining({
          [OpsActionCenterItemType.OPERATIONAL_ALERT]: 1,
          [OpsActionCenterItemType.AUTO_INCIDENT]: 1,
          [OpsActionCenterItemType.MISSING_EVIDENCE]: 1,
          [OpsActionCenterItemType.DECISION_REQUIRED]: 1,
        }),
        itemStatusCounts: expect.objectContaining({
          [OpsActionCenterStatus.WAITING_DECISION]: 1,
          [OpsActionCenterStatus.WAITING_EVIDENCE]: 1,
        }),
      }),
    );
  });

  it('filters action center items by normalized status and type', async () => {
    alertRepository.find.mockResolvedValue([createAlert()]);
    incidentRepository.find.mockResolvedValue([
      createIncident({
        metadata: {
          source: 'operations:auto-incident',
          auto: { sourceType: 'ALERT', reference: 'agent-alert:7001' },
        },
      }),
    ]);
    journalRepository.find.mockResolvedValue([
      createJournalEntry({
        type: OperationsJournalEntryType.DECISION,
      }),
    ]);

    const result = await service.getActionCenter('tenant-a', {
      status: OpsActionCenterStatus.WAITING_EVIDENCE,
      type: OpsActionCenterItemType.MISSING_EVIDENCE,
    });

    expect(result.total).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'operation-incident:12:missing-evidence',
        type: OpsActionCenterItemType.MISSING_EVIDENCE,
        status: OpsActionCenterStatus.WAITING_EVIDENCE,
        requiredEvidence: ['URL de preuve incident', 'Libelle de preuve'],
      }),
    ]);
  });

  it('applies persisted workflow state to action center projections', async () => {
    alertRepository.find.mockResolvedValue([createAlert()]);
    actionCenterWorkflowRepository.find.mockResolvedValue([
      {
        id: 501,
        tenantId: 'tenant-a',
        itemId: 'operational-alert:44',
        itemType: OpsActionCenterItemType.OPERATIONAL_ALERT,
        sourceEntity: 'OperationalAlert',
        sourceId: 44,
        action: OpsActionCenterWorkflowAction.ASSIGN,
        actorId: 77,
        assignedToId: 88,
        priority: null,
        status: OpsActionCenterStatus.IN_PROGRESS,
        comment: 'Pris en charge',
        beforeState: null,
        afterState: null,
        auditLogId: null,
        createdAt: new Date('2026-05-07T08:10:00.000Z'),
      },
      {
        id: 502,
        tenantId: 'tenant-a',
        itemId: 'operational-alert:44',
        itemType: OpsActionCenterItemType.OPERATIONAL_ALERT,
        sourceEntity: 'OperationalAlert',
        sourceId: 44,
        action: OpsActionCenterWorkflowAction.PRIORITY,
        actorId: 78,
        assignedToId: null,
        priority: OpsActionCenterPriority.CRITICAL,
        status: null,
        comment: null,
        beforeState: null,
        afterState: null,
        auditLogId: null,
        createdAt: new Date('2026-05-07T08:20:00.000Z'),
      },
    ] as OpsActionCenterWorkflowMutation[]);

    const result = await service.getActionCenter('tenant-a', { limit: 10 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'operational-alert:44',
        priority: OpsActionCenterPriority.CRITICAL,
        status: OpsActionCenterStatus.IN_PROGRESS,
        workflow: expect.objectContaining({
          assignedToId: 88,
          priorityOverride: OpsActionCenterPriority.CRITICAL,
          commentsCount: 1,
          updatedById: 78,
        }),
      }),
    );
    expect(actionCenterWorkflowRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
        }),
      }),
    );
  });

  it('records action-center comments with tenant-scoped source audit', async () => {
    journalRepository.find.mockResolvedValue([
      createJournalEntry({
        id: 71,
        type: OperationsJournalEntryType.ACTION,
      }),
    ]);
    actionCenterWorkflowRepository.save.mockImplementation((entity) =>
      Promise.resolve({
        id: entity.id ?? 701,
        createdAt: new Date('2026-05-07T09:00:00.000Z'),
        ...entity,
      } as OpsActionCenterWorkflowMutation),
    );

    const result = await service.commentActionCenterItem(
      'tenant-a',
      'operations-journal:71:action',
      { comment: 'Controle manuel lance' },
      77,
    );

    expect(actionCenterWorkflowRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        itemId: 'operations-journal:71:action',
        itemType: OpsActionCenterItemType.JOURNAL_ACTION,
        sourceId: 71,
        action: OpsActionCenterWorkflowAction.COMMENT,
        actorId: 77,
        comment: 'Controle manuel lance',
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      77,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      'ops-action-center:operations-journal:71:action:workflow:701',
      expect.objectContaining({
        action: 'OPS_ACTION_CENTER_COMMENT',
        itemId: 'operations-journal:71:action',
      }),
    );
    expect(result.auditLogId).toBe(99);
  });

  it('assigns incident-backed action-center items through the incident workflow', async () => {
    const incident = createIncident({
      status: OperationIncidentStatus.OPEN,
      metadata: {
        source: 'operations:auto-incident',
        auto: { sourceType: 'ALERT', reference: 'alert:44' },
      },
    });
    incidentRepository.find.mockResolvedValue([incident]);
    incidentRepository.findOne.mockResolvedValue(incident);

    await service.assignActionCenterItem(
      'tenant-a',
      'operation-incident:12:auto',
      { assignedToId: 88, comment: 'Astreinte L2' },
      77,
    );

    expect(incidentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        status: OperationIncidentStatus.ASSIGNED,
        assignedToId: 88,
      }),
    );
    expect(actionCenterWorkflowRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: OpsActionCenterWorkflowAction.ASSIGN,
        assignedToId: 88,
        status: OpsActionCenterStatus.IN_PROGRESS,
      }),
    );
  });

  it('rejects terminal status transitions outside action-center resolve', async () => {
    await expect(
      service.transitionActionCenterItem(
        'tenant-a',
        'operational-alert:44',
        { status: OpsActionCenterStatus.RESOLVED },
        77,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
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
