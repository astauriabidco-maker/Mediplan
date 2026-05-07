import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = {
  get: vi.fn(),
};

const readinessMock = {
  getDecision: vi.fn(),
  getSignoffHistory: vi.fn(),
};

vi.mock('./axios', () => ({
  default: axiosMock,
}));

vi.mock('./production-readiness.api', async () => {
  const actual = await vi.importActual<
    typeof import('./production-readiness.api')
  >('./production-readiness.api');

  return {
    ...actual,
    productionReadinessApi: readinessMock,
  };
});

const { opsApi } = await import('./ops.api');

const observability = {
  tenantId: 'tenant-a',
  generatedAt: '2026-05-05T08:00:00.000Z',
  period: {},
  status: 'CRITICAL',
  reasons: ['HIGH_ALERTS_OPEN', 'COMPLIANCE_SCAN_FAILURES'],
  counters: {
    openAlerts: 3,
    highAlerts: 1,
    mediumAlerts: 1,
    lowAlerts: 1,
    pendingShifts: 2,
    validatedShifts: 10,
    publishedShifts: 20,
    publicationAttempts: 4,
    refusedPublications: 1,
    successfulPublications: 3,
  },
  lastPublication: {
    timestamp: '2026-05-05T07:30:00.000Z',
    actorId: 42,
    blocked: true,
    affected: 0,
    violations: 1,
    warnings: 0,
  },
  audit: {
    chain: {
      checkedAt: '2026-05-05T08:00:00.000Z',
      total: 12,
      valid: true,
      issues: [],
    },
  },
  jobs: {
    complianceScan: {
      configured: true,
      status: 'CRITICAL',
      recentRuns: 5,
      failedRuns: 1,
      lastRunAt: '2026-05-05T07:55:00.000Z',
    },
  },
};

const readiness = {
  tenantId: 'tenant-a',
  generatedAt: '2026-05-05T08:05:00.000Z',
  status: 'PROD_NO_GO',
  blockers: ['SMOKE gate is FAILED'],
  signoffs: [],
  signoffSummary: {
    required: [],
    missing: [],
    pending: [],
    noGo: [],
    proofMissing: [],
  },
  gates: {
    freeze: {
      key: 'FREEZE',
      status: 'PASSED',
      source: 'manual',
      checkedAt: '2026-05-05T06:00:00.000Z',
    },
    checks: [
      {
        key: 'SMOKE',
        status: 'FAILED',
        source: 'ci',
        evidenceUrl: 'https://ci.example.test/123',
        checkedAt: '2026-05-05T07:00:00.000Z',
      },
      {
        key: 'BACKUP',
        status: 'UNKNOWN',
        source: 'backup-restore-drill',
        checkedAt: '2026-05-05T07:10:00.000Z',
      },
    ],
  },
};

describe('opsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosMock.get.mockImplementation((url: string) => {
      if (url === '/api/health/ready') {
        return Promise.resolve({
          data: {
            status: 'UP',
            service: 'mediplan-api',
            checkedAt: '2026-05-05T08:00:00.000Z',
            dependencies: { database: 'UP' },
          },
        });
      }
      if (url === '/api/planning/observability/health') {
        return Promise.resolve({ data: observability });
      }
      if (url === '/api/tenant-backups/metrics') {
        return Promise.resolve({
          data: {
            tenantId: 'tenant-a',
            generatedAt: '2026-05-05T08:01:00.000Z',
            schemaVersion: '2026.05',
            datasetCounts: { shifts: 20, alerts: 3 },
            planningComplianceSnapshot: {
              totals: { pendingComplianceExceptions: 2 },
            },
            exportable: true,
          },
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    readinessMock.getDecision.mockResolvedValue(readiness);
    readinessMock.getSignoffHistory.mockResolvedValue({
      tenantId: 'tenant-a',
      generatedAt: '2026-05-05T08:02:00.000Z',
      decision: readiness,
      entries: [],
      byRole: {},
    });
  });

  it('agrège les endpoints ops et produit une synthèse critique', async () => {
    const params = {
      tenantId: 'tenant-a',
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-07T00:00:00.000Z',
    };

    const summary = await opsApi.summary(params);

    expect(axiosMock.get).toHaveBeenCalledWith('/api/health/ready');
    expect(axiosMock.get).toHaveBeenCalledWith(
      '/api/planning/observability/health',
      { params },
    );
    expect(axiosMock.get).toHaveBeenCalledWith('/api/tenant-backups/metrics', {
      params,
    });
    expect(readinessMock.getDecision).toHaveBeenCalledWith(params);
    expect(readinessMock.getSignoffHistory).toHaveBeenCalledWith(params);
    expect(summary.status).toBe('CRITICAL');
    expect(summary.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'alerts',
          value: '3',
          status: 'CRITICAL',
        }),
        expect.objectContaining({
          key: 'gates',
          value: '1/3',
          status: 'CRITICAL',
        }),
      ]),
    );
    expect(summary.anomalies.map((item) => item.id)).toContain(
      'readiness-blocker-0',
    );
    expect(summary.incidents.map((item) => item.id)).toContain(
      'refused-publications',
    );
    expect(summary.backups.exportable).toBe(true);
  });

  it('retourne une synthèse partielle quand un signal est indisponible', async () => {
    axiosMock.get.mockImplementation((url: string) => {
      if (url === '/api/health/ready') {
        return Promise.reject(new Error('health unavailable'));
      }
      return Promise.resolve({ data: observability });
    });

    const summary = await opsApi.summary();

    expect(summary.status).toBe('UNKNOWN');
    expect(summary.health.api).toBeNull();
    expect(summary.health.observability?.status).toBe('CRITICAL');
  });
});
