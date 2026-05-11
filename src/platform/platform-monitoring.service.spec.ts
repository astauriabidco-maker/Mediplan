import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  OperationalAlertSeverity,
  OperationalAlertStatus,
  OperationalAlertType,
} from '../operations/entities/operational-alert.entity';
import { OperationRoutineRunStatus } from '../operations/entities/operation-routine-run.entity';
import {
  ProductionGateKey,
  ProductionGateStatus,
} from '../production-readiness/entities/production-gate.entity';
import { PlatformMonitoringService } from './platform-monitoring.service';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('PlatformMonitoringService', () => {
  const platformService = {
    getTenantSummaries: jest.fn(),
  };
  const auditService = {
    getLogs: jest.fn(),
    verifyChain: jest.fn(),
  };
  const alertRepository = createRepositoryMock();
  const routineRunRepository = createRepositoryMock();
  const productionGateRepository = createRepositoryMock();
  const auditLogRepository = createRepositoryMock();

  let service: PlatformMonitoringService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-11T12:00:00.000Z'));
    jest.clearAllMocks();
    service = new PlatformMonitoringService(
      platformService as any,
      auditService as any,
      alertRepository as any,
      routineRunRepository as any,
      productionGateRepository as any,
      auditLogRepository as any,
    );
    platformService.getTenantSummaries.mockResolvedValue([
      {
        id: 'TENANT-A',
        name: 'Tenant A',
        region: 'FR',
        contactEmail: 'admin@tenant-a.test',
        isActive: true,
        userCount: 4,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    auditService.verifyChain.mockResolvedValue({
      checkedAt: '2026-05-11T12:00:00.000Z',
      valid: true,
      total: 8,
      issues: [],
    });
    auditLogRepository.findOne.mockResolvedValue({
      id: 99,
      timestamp: new Date('2026-05-11T10:00:00.000Z'),
      actorId: 1,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
      entityId: 'planning',
      details: { action: 'PUBLISH_PLANNING' },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('consolidates critical tenant health from alerts, smoke gate, backup, publication and audit chain', async () => {
    alertRepository.find.mockResolvedValue([
      {
        id: 10,
        tenantId: 'TENANT-A',
        type: OperationalAlertType.SLO_BREACH,
        severity: OperationalAlertSeverity.CRITICAL,
        status: OperationalAlertStatus.OPEN,
        message: 'API down',
        openedAt: new Date('2026-05-11T09:00:00.000Z'),
        lastSeenAt: new Date('2026-05-11T11:30:00.000Z'),
      },
    ]);
    routineRunRepository.find.mockResolvedValue([
      {
        id: 20,
        tenantId: 'TENANT-A',
        routine: 'nightly-backup',
        status: OperationRoutineRunStatus.PASSED,
        startedAt: new Date('2026-05-09T10:00:00.000Z'),
        finishedAt: new Date('2026-05-09T10:30:00.000Z'),
        artifacts: [{ url: 'https://evidence.test/backup.zip' }],
        metadata: null,
        error: null,
      },
    ]);
    productionGateRepository.find.mockResolvedValue([
      {
        tenantId: 'TENANT-A',
        key: ProductionGateKey.SMOKE,
        status: ProductionGateStatus.FAILED,
        checkedAt: new Date('2026-05-11T08:00:00.000Z'),
        snapshot: null,
      },
    ]);
    auditService.getLogs.mockResolvedValue([
      {
        id: 30,
        timestamp: new Date('2026-05-11T07:00:00.000Z'),
        actorId: 2,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PLANNING,
        details: {
          action: 'PUBLISH_PLANNING',
          blocked: true,
          affected: 0,
          report: {
            totalPending: 10,
            violations: [{ id: 'shift-1' }, { id: 'shift-2' }],
            warnings: [{ id: 'warning-1' }],
          },
        },
      },
    ]);
    auditService.verifyChain.mockResolvedValue({
      checkedAt: '2026-05-11T12:00:00.000Z',
      valid: false,
      total: 8,
      issues: [{ index: 7, reason: 'hash mismatch' }],
    });

    const result = await service.getTenantMonitoring({
      backupFreshnessHours: 24,
    });

    expect(result.totals).toMatchObject({
      tenants: 1,
      critical: 1,
      openAlerts: 1,
      criticalAlerts: 1,
    });
    expect(result.tenants[0]).toMatchObject({
      status: 'CRITICAL',
      backend: {
        healthy: false,
        status: 'CRITICAL',
        lastSmokeAt: '2026-05-11T08:00:00.000Z',
      },
      backup: {
        available: true,
        recent: false,
        status: 'CRITICAL',
        artifactUrl: 'https://evidence.test/backup.zip',
      },
      compliance: {
        status: 'CRITICAL',
        score: 80,
      },
      publications: {
        attempts: 1,
        refused: 1,
      },
      audits: {
        chain: {
          valid: false,
        },
      },
    });
    expect(result.tenants[0].reasons).toEqual(
      expect.arrayContaining([
        'CRITICAL_ALERTS_OPEN',
        'SMOKE_GATE_FAILED',
        'BACKUP_STALE',
        'COMPLIANCE_SIGNAL_CRITICAL',
        'AUDIT_CHAIN_INVALID',
      ]),
    );
  });

  it('keeps backup optional when no backup signal exists', async () => {
    alertRepository.find.mockResolvedValue([]);
    routineRunRepository.find.mockResolvedValue([]);
    productionGateRepository.find.mockResolvedValue([
      {
        tenantId: 'TENANT-A',
        key: ProductionGateKey.SMOKE,
        status: ProductionGateStatus.PASSED,
        checkedAt: new Date('2026-05-11T08:00:00.000Z'),
        snapshot: null,
      },
      {
        tenantId: 'TENANT-A',
        key: ProductionGateKey.COMPLIANCE,
        status: ProductionGateStatus.PASSED,
        checkedAt: new Date('2026-05-11T08:05:00.000Z'),
        snapshot: { planningCompliancePercent: 100 },
      },
    ]);
    auditService.getLogs.mockResolvedValue([]);

    const result = await service.getTenantMonitoring({
      tenantId: 'TENANT-A',
    });

    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0].backup).toMatchObject({
      available: false,
      recent: null,
      status: 'UNKNOWN',
      lastBackupAt: null,
    });
    expect(result.tenants[0].backend).toMatchObject({
      healthy: true,
      status: 'HEALTHY',
    });
  });
});
