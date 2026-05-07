import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { opsApi, OpsDashboardSummary } from '../api/ops.api';
import { renderWithQueryClient } from '../test/render';
import { OpsDashboardPage } from './OpsDashboardPage';

vi.mock('../api/ops.api', async () => {
  const actual = await vi.importActual<typeof import('../api/ops.api')>(
    '../api/ops.api',
  );

  return {
    ...actual,
    opsApi: {
      summary: vi.fn(),
      resolveAlert: vi.fn(),
      rerunShiftCheck: vi.fn(),
      declareIncident: vi.fn(),
    },
  };
});

vi.mock('../store/useAuth', () => ({
  useAuth: () => ({
    impersonatedTenantId: 'tenant-a',
  }),
}));

const buildSummary = (
  overrides?: Partial<OpsDashboardSummary>,
): OpsDashboardSummary => ({
  tenantId: 'tenant-a',
  generatedAt: '2026-05-05T08:00:00.000Z',
  status: 'CRITICAL',
  statusLabel: 'Critique',
  health: {
    api: {
      status: 'UP',
      service: 'mediplan-api',
      checkedAt: '2026-05-05T08:00:00.000Z',
      dependencies: { database: 'UP' },
    },
    observability: {
      tenantId: 'tenant-a',
      generatedAt: '2026-05-05T08:00:00.000Z',
      period: {},
      status: 'CRITICAL',
      reasons: ['HIGH_ALERTS_OPEN'],
      counters: {
        openAlerts: 3,
        highAlerts: 1,
        mediumAlerts: 1,
        lowAlerts: 1,
        pendingShifts: 2,
        validatedShifts: 8,
        publishedShifts: 20,
        publicationAttempts: 4,
        refusedPublications: 1,
        successfulPublications: 3,
      },
      jobs: {
        complianceScan: {
          configured: true,
          status: 'CRITICAL',
          recentRuns: 5,
          failedRuns: 1,
        },
      },
      audit: {
        chain: {
          checkedAt: '2026-05-05T08:00:00.000Z',
          total: 10,
          valid: true,
          issues: [],
        },
      },
    },
    readiness: {
      tenantId: 'tenant-a',
      generatedAt: '2026-05-05T08:00:00.000Z',
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
        freeze: { key: 'FREEZE', status: 'PASSED', source: 'manual' },
        checks: [{ key: 'SMOKE', status: 'FAILED', source: 'ci' }],
      },
    },
  },
  kpis: [
    {
      key: 'alerts',
      label: 'Alertes ouvertes',
      value: '3',
      detail: '1 HIGH',
      status: 'CRITICAL',
    },
    {
      key: 'notifications',
      label: 'Notifications',
      value: 'Notifications à traiter',
      detail: '1 alerte non acquittée.',
      status: 'WARNING',
    },
    {
      key: 'readiness',
      label: 'Post-prod',
      value: 'PROD_NO_GO',
      detail: '1 blocker',
      status: 'WARNING',
    },
    {
      key: 'gates',
      label: 'Gates passés',
      value: '1/2',
      detail: '1 échec, 0 inconnu',
      status: 'CRITICAL',
    },
    {
      key: 'backups',
      label: 'Backups',
      value: 'Exportable',
      detail: 'Gate PASSED',
      status: 'OK',
    },
  ],
  alerts: [
    {
      id: 44,
      sourceKind: 'AGENT_ALERT',
      title: 'Repos insuffisant sur le shift',
      detail: 'COMPLIANCE · Agent 7 · Shift 101',
      severity: 'HIGH',
      detectedAt: '2026-05-05T08:00:00.000Z',
      source: 'agent-alerts',
      agentId: 7,
      shiftId: 101,
      ruleCode: 'REST_INSUFFICIENT',
      type: 'COMPLIANCE',
      acknowledged: false,
      notificationStatus: 'PENDING',
      actions: {
        canResolve: true,
        canRerunCheck: true,
        canOpenIncident: true,
      },
    },
  ],
  anomalies: [
    {
      id: 'readiness-blocker-0',
      title: 'Gate ou signoff bloquant',
      detail: 'SMOKE gate is FAILED',
      severity: 'HIGH',
      detectedAt: '2026-05-05T08:00:00.000Z',
      source: 'production-readiness',
    },
  ],
  sla: [
    {
      id: 'publication',
      label: 'SLA publication',
      target: '>= 95%',
      current: '75%',
      status: 'CRITICAL',
      detail: '3/4 publications réussies.',
    },
  ],
  backups: {
    status: 'OK',
    generatedAt: '2026-05-05T08:00:00.000Z',
    schemaVersion: '2026.05',
    exportable: true,
    datasetCounts: { shifts: 20, alerts: 3 },
    totals: { pendingComplianceExceptions: 2 },
    gate: {
      key: 'BACKUP',
      status: 'PASSED',
      source: 'backup-restore-drill',
    },
  },
  incidents: [
    {
      id: 'refused-publications',
      title: 'Publication refusée',
      status: 'CRITICAL',
      openedAt: '2026-05-05T08:00:00.000Z',
      detail: '1 tentative refusée.',
      source: 'planning/publication',
    },
  ],
  notifications: {
    status: 'WARNING',
    label: 'Notifications à traiter',
    detail: '1 alerte non acquittée.',
    pendingAlerts: 1,
    escalatedIncidents: 0,
    lastActivityAt: '2026-05-05T08:00:00.000Z',
  },
  gates: [
    { key: 'FREEZE', status: 'PASSED', source: 'manual' },
    { key: 'SMOKE', status: 'FAILED', source: 'ci' },
  ],
  gatesSummary: {
    passed: 1,
    failed: 1,
    unknown: 0,
    total: 2,
  },
  ...overrides,
});

const mockSummary = vi.mocked(opsApi.summary);
const mockResolveAlert = vi.mocked(opsApi.resolveAlert);
const mockRerunShiftCheck = vi.mocked(opsApi.rerunShiftCheck);
const mockDeclareIncident = vi.mocked(opsApi.declareIncident);

afterEach(() => {
  vi.clearAllMocks();
});

describe('OpsDashboardPage', () => {
  it('affiche les signaux post-prod critiques', async () => {
    mockSummary.mockResolvedValue(buildSummary());

    renderWithQueryClient(<OpsDashboardPage />);

    expect(await screen.findByText('Tableau de bord ops')).toBeInTheDocument();
    expect(screen.getByText('Statut global: Critique')).toBeInTheDocument();
    expect(screen.getAllByText('Alertes ouvertes')).not.toHaveLength(0);
    expect(screen.getByText('Repos insuffisant sur le shift')).toBeInTheDocument();
    expect(screen.getByText('Notifications et escalade')).toBeInTheDocument();
    expect(screen.getByText('Gate ou signoff bloquant')).toBeInTheDocument();
    expect(screen.getByText('SLA publication')).toBeInTheDocument();
    expect(screen.getAllByText('Backups')).not.toHaveLength(0);
    expect(screen.getByText('Publication refusée')).toBeInTheDocument();
    expect(screen.getByText('SMOKE')).toBeInTheDocument();
  });

  it('permet de rafraîchir la synthèse ops', async () => {
    const user = userEvent.setup();
    mockSummary.mockResolvedValue(buildSummary());

    renderWithQueryClient(<OpsDashboardPage />);

    await screen.findByText('Tableau de bord ops');
    await user.click(screen.getByRole('button', { name: /rafraîchir/i }));

    expect(mockSummary).toHaveBeenCalledTimes(2);
    expect(mockSummary).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a' }),
    );
  });

  it('déclenche les actions sûres sur une alerte ouverte', async () => {
    const user = userEvent.setup();
    mockSummary.mockResolvedValue(buildSummary());
    mockResolveAlert.mockResolvedValue({});
    mockRerunShiftCheck.mockResolvedValue({});
    mockDeclareIncident.mockResolvedValue({});

    renderWithQueryClient(<OpsDashboardPage />);

    await screen.findByText('Repos insuffisant sur le shift');

    await user.click(screen.getByRole('button', { name: /résoudre alerte/i }));
    expect(mockResolveAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 44, sourceKind: 'AGENT_ALERT' }),
      expect.stringContaining('tableau de bord ops'),
    );

    await user.click(screen.getByRole('button', { name: /relancer contrôle/i }));
    expect(mockRerunShiftCheck).toHaveBeenCalledWith(101);

    await user.click(screen.getByRole('button', { name: /ouvrir incident/i }));
    expect(mockDeclareIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Alerte HIGH'),
        severity: 'HIGH',
        impactedService: 'agent-alerts',
      }),
      { tenantId: 'tenant-a' },
    );
  });

  it('affiche un état vide quand aucune anomalie ni incident ne sont actifs', async () => {
    mockSummary.mockResolvedValue(
      buildSummary({
        status: 'OPERATIONAL',
        statusLabel: 'Opérationnel',
        alerts: [],
        anomalies: [],
        incidents: [],
        notifications: {
          status: 'UNKNOWN',
          label: 'Aucun signal',
          detail: 'Aucune notification ou escalade active remontée.',
          pendingAlerts: 0,
          escalatedIncidents: 0,
        },
      }),
    );

    renderWithQueryClient(<OpsDashboardPage />);

    const anomalies = await screen.findByText('Anomalies récentes');
    expect(anomalies).toBeInTheDocument();
    expect(screen.getByText('Aucune alerte ouverte')).toBeInTheDocument();
    expect(screen.getByText('Aucune anomalie active')).toBeInTheDocument();
    const incidents = screen.getByText('Incidents').closest('section');
    expect(incidents).not.toBeNull();
    expect(within(incidents as HTMLElement).getByText(/aucun incident/i)).toBeInTheDocument();
  });
});
