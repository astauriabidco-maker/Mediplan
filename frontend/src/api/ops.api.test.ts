import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = {
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
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
      if (url === '/api/agent-alerts') {
        return Promise.resolve({
          data: [
            {
              id: 44,
              agentId: 7,
              tenantId: 'tenant-a',
              type: 'COMPLIANCE',
              severity: 'HIGH',
              message: 'Repos insuffisant sur le shift',
              metadata: {
                shiftId: 101,
                ruleCode: 'REST_INSUFFICIENT',
              },
              isAcknowledged: false,
              isResolved: false,
              resolvedAt: null,
              resolutionReason: null,
              createdAt: '2026-05-05T07:59:00.000Z',
              updatedAt: '2026-05-05T08:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/ops/alerts') {
        return Promise.resolve({
          data: [
            {
              id: 12,
              tenantId: 'tenant-a',
              type: 'SLO_BREACH',
              severity: 'CRITICAL',
              status: 'OPEN',
              source: 'production-readiness.slo',
              sourceReference: 'slo:api:p95',
              message: 'SLO API critique',
              metadata: { objective: 'api-p95' },
              openedAt: '2026-05-05T07:58:00.000Z',
              lastSeenAt: '2026-05-05T08:01:00.000Z',
              occurrenceCount: 2,
              resolvedAt: null,
              resolutionSummary: null,
            },
          ],
        });
      }
      if (url === '/api/ops/incidents') {
        return Promise.resolve({
          data: [
            {
              id: 9,
              title: 'Incident conformité critique',
              description: 'Une alerte haute a été escaladée.',
              severity: 'CRITICAL',
              status: 'ESCALATED',
              impactedService: 'planning',
              declaredAt: '2026-05-05T08:03:00.000Z',
              escalatedAt: '2026-05-05T08:04:00.000Z',
              escalationReason: 'SLA dépassé',
              updatedAt: '2026-05-05T08:04:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/ops/action-center') {
        return Promise.resolve({
          data: {
            tenantId: 'tenant-a',
            generatedAt: '2026-05-05T08:06:00.000Z',
            total: 1,
            filters: { status: null, type: null, limit: 8 },
            items: [
              {
                id: 'operational-alert-12',
                type: 'OPERATIONAL_ALERT',
                priority: 'CRITICAL',
                status: 'OPEN',
                title: 'SLO API critique',
                reason: 'SLO production à traiter',
                requiredEvidence: ['Horodatage retour nominal'],
                suggestedActions: ['resolve-alert'],
                sourceReference: {
                  entity: 'OperationalAlert',
                  id: 12,
                  tenantId: 'tenant-a',
                  reference: 'slo:api:p95',
                },
                timestamps: {
                  createdAt: '2026-05-05T07:58:00.000Z',
                  updatedAt: '2026-05-05T08:01:00.000Z',
                  occurredAt: '2026-05-05T08:01:00.000Z',
                },
              },
            ],
          },
        });
      }
      if (url === '/api/planning/compliance/reports') {
        return Promise.resolve({
          data: [
            {
              id: 77,
              timestamp: '2026-05-05T08:04:00.000Z',
              actorId: 42,
              entityId: '2026-05',
              blocked: false,
              affected: 20,
            },
          ],
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
    expect(axiosMock.get).toHaveBeenCalledWith('/api/agent-alerts', {
      params: {
        tenantId: 'tenant-a',
        isResolved: false,
      },
    });
    expect(axiosMock.get).toHaveBeenCalledWith('/api/ops/alerts', {
      params: {
        tenantId: 'tenant-a',
        status: 'OPEN',
      },
    });
    expect(axiosMock.get).toHaveBeenCalledWith('/api/ops/incidents', {
      params: {
        tenantId: 'tenant-a',
      },
    });
    expect(axiosMock.get).toHaveBeenCalledWith('/api/ops/action-center', {
      params: {
        tenantId: 'tenant-a',
        limit: 8,
      },
    });
    expect(axiosMock.get).toHaveBeenCalledWith(
      '/api/planning/compliance/reports',
      {
        params: {
          tenantId: 'tenant-a',
          from: '2026-05-01T00:00:00.000Z',
          to: '2026-05-07T00:00:00.000Z',
          limit: 5,
        },
      },
    );
    expect(readinessMock.getDecision).toHaveBeenCalledWith(params);
    expect(readinessMock.getSignoffHistory).toHaveBeenCalledWith(params);
    expect(summary.status).toBe('CRITICAL');
    expect(summary.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'alerts',
          value: '2',
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
    expect(summary.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 44,
          sourceKind: 'AGENT_ALERT',
          shiftId: 101,
          notificationStatus: 'PENDING',
        }),
        expect.objectContaining({
          id: 12,
          sourceKind: 'OPERATIONAL_ALERT',
          type: 'SLO_BREACH',
          detail: expect.stringContaining('2 occurrences'),
        }),
      ]),
    );
    expect(summary.incidents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ops-incident-9',
          lifecycleStatus: 'ESCALATED',
        }),
      ]),
    );
    expect(summary.notifications.status).toBe('CRITICAL');
    expect(summary.backups.exportable).toBe(true);
    expect(summary.actionCenter).toEqual(
      expect.objectContaining({
        available: true,
        total: 1,
        status: 'CRITICAL',
      }),
    );
    expect(summary.directionReports.reports).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 77 })]),
    );
    expect(summary.routines.items.map((item) => item.id)).toContain(
      'ops-routines',
    );
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

  it('expose les mutations ops sûres', async () => {
    axiosMock.patch.mockResolvedValue({ data: { id: 44 } });
    axiosMock.post.mockResolvedValue({ data: { id: 9 } });
    axiosMock.get.mockResolvedValue({
      data: {
        id: 'alert-12-runbook',
        generatedAt: '2026-05-05T08:07:00.000Z',
      },
    });

    await opsApi.resolveAlert({ id: 44, sourceKind: 'AGENT_ALERT' }, 'Corrigé');
    await opsApi.resolveAlert(
      { id: 12, sourceKind: 'OPERATIONAL_ALERT' },
      'SLO revenu conforme',
    );
    await opsApi.rerunShiftCheck(101);
    await opsApi.declareIncident(
      {
        title: 'Incident test',
        description: 'Signal ops',
        severity: 'HIGH',
        impactedService: 'planning',
      },
      { tenantId: 'tenant-a' },
    );
    await opsApi.getRunbook(
      { entity: 'OperationalAlert', id: 12 },
      { tenantId: 'tenant-a' },
    );

    expect(axiosMock.patch).toHaveBeenCalledWith(
      '/api/planning/alerts/44/resolve',
      {
        reason: 'Corrigé',
        recommendationId: 'ops-alert:44',
      },
    );
    expect(axiosMock.patch).toHaveBeenCalledWith('/api/ops/alerts/12/resolve', {
      resolutionSummary: 'SLO revenu conforme',
    });
    expect(axiosMock.post).toHaveBeenCalledWith(
      '/api/planning/shifts/101/revalidate',
    );
    expect(axiosMock.post).toHaveBeenCalledWith(
      '/api/ops/incidents',
      expect.objectContaining({
        title: 'Incident test',
        severity: 'HIGH',
      }),
      {
        params: {
          tenantId: 'tenant-a',
        },
      },
    );
    expect(axiosMock.get).toHaveBeenCalledWith('/api/ops/alerts/12/runbook', {
      params: {
        tenantId: 'tenant-a',
      },
    });
  });
});
