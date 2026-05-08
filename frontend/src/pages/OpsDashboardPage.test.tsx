import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  opsApi,
  OpsDashboardSummary,
  OpsMultiTenantSummaryResponse,
} from '../api/ops.api';
import { renderWithQueryClient } from '../test/render';
import { OpsDashboardPage } from './OpsDashboardPage';

vi.mock('../api/ops.api', async () => {
  const actual = await vi.importActual<typeof import('../api/ops.api')>(
    '../api/ops.api',
  );

  return {
    ...actual,
    opsApi: {
      multiTenantSummary: vi.fn(),
      summary: vi.fn(),
      getRunbook: vi.fn(),
      resolveAlert: vi.fn(),
      rerunShiftCheck: vi.fn(),
      declareIncident: vi.fn(),
      assignActionCenterItem: vi.fn(),
      commentActionCenterItem: vi.fn(),
      prioritizeActionCenterItem: vi.fn(),
      transitionActionCenterItem: vi.fn(),
      resolveActionCenterItem: vi.fn(),
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
      id: 'open_alert_age',
      label: 'Open alert age',
      target: '<= 30min',
      current: '45min',
      status: 'WARNING',
      detail: 'Seuil warning <= 60min · 1 échantillon',
      reason: 'Actual 45minutes is within warning threshold 60minutes.',
      period: {
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-07T00:00:00.000Z',
      },
      sloStatus: 'WARNING',
    },
    {
      id: 'routine_success_rate',
      label: 'Routine success rate',
      target: '>= 95%',
      current: '50%',
      status: 'CRITICAL',
      detail: 'Seuil warning >= 80% · 2 échantillon',
      reason: 'Actual 50percent breaches failed threshold 80percent.',
      period: {
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-07T00:00:00.000Z',
      },
      sloStatus: 'FAILED',
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
    acknowledgedNotifications: 1,
    reminders: 1,
    quietHoursDeferred: 1,
    failedNotifications: 0,
    lastActivityAt: '2026-05-05T08:00:00.000Z',
    entries: [
      {
        id: 21,
        title: 'Notification ops: SLO API critique',
        eventType: 'ALERT',
        status: 'ACKNOWLEDGED',
        severity: 'HIGH',
        occurredAt: '2026-05-05T08:00:00.000Z',
        resolvedAt: '2026-05-05T08:05:00.000Z',
        relatedReference: 'operational-alert:12',
        channels: ['WEBHOOK', 'SLACK'],
        attempts: [
          {
            channel: 'SLACK',
            status: 'SENT',
            message: 'Notification delivered',
          },
        ],
        proofId: 'ops-notification-proof:tenant-a:alert:12',
        proofGeneratedAt: '2026-05-05T08:00:00.000Z',
        acknowledgedAt: '2026-05-05T08:05:00.000Z',
        acknowledgedById: 42,
        reminder: {
          isReminder: true,
          reminderCount: 1,
          nextReminderAt: '2026-05-05T10:00:00.000Z',
        },
        escalationLevel: 2,
        quietHours: {
          start: '22:00',
          end: '06:00',
          timezone: 'local',
        },
        suppressedUntil: '2026-05-06T06:00:00.000Z',
      },
    ],
  },
  actionCenter: {
    available: true,
    status: 'CRITICAL',
    generatedAt: '2026-05-05T08:01:00.000Z',
    total: 1,
    items: [
      {
        id: 'operational-alert-12',
        type: 'OPERATIONAL_ALERT',
        priority: 'CRITICAL',
        status: 'OPEN',
        title: 'SLO API critique',
        reason: 'P95 API au-dessus de la cible.',
        requiredEvidence: ['Capture monitoring retour nominal'],
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
  routines: {
    available: false,
    status: 'UNKNOWN',
    title: 'Routines ops',
    unavailableReason: 'Scripts disponibles côté exploitation.',
    items: [
      {
        id: 'ops-routines',
        label: 'Scheduler routines',
        cadence: 'Quotidien',
        command: 'npm run ops:routines -- --dry-run',
        reportPattern: 'prod-reports/ops-routine-scheduler-YYYY-MM-DD.{md,json}',
      },
    ],
  },
  directionReports: {
    available: true,
    status: 'OK',
    title: 'Rapports direction',
    command: 'node scripts/management-business-report.mjs',
    reportPattern:
      'business-reports/management-business-report-YYYY-MM-DD.{md,json}',
    reports: [
      {
        id: 77,
        timestamp: '2026-05-05T08:04:00.000Z',
        actorId: 42,
        entityId: '2026-05',
        blocked: false,
        affected: 20,
      },
    ],
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

const buildMultiTenantSummary = (
  overrides?: Partial<OpsMultiTenantSummaryResponse>,
): OpsMultiTenantSummaryResponse => ({
  generatedAt: '2026-05-05T08:02:00.000Z',
  scope: {
    tenantId: 'tenant-a',
    allTenants: false,
  },
  totals: {
    tenants: 2,
    criticalTenants: 1,
    warningTenants: 1,
    openAlerts: 5,
    activeIncidents: 2,
    failedRoutines: 1,
    actionCenterItems: 4,
  },
  tenants: [
    {
      tenantId: 'tenant-a',
      status: 'CRITICAL',
      alerts: {
        open: 3,
        critical: 1,
        bySeverity: { CRITICAL: 1, HIGH: 0, MEDIUM: 1, LOW: 1 },
      },
      incidents: {
        active: 1,
        critical: 1,
        escalated: 1,
      },
      routines: {
        failed: 1,
        lastFailedAt: '2026-05-05T07:50:00.000Z',
      },
      lastBackup: {
        routine: 'tenant-backup-export',
        status: 'SUCCESS',
        startedAt: '2026-05-05T06:00:00.000Z',
        finishedAt: '2026-05-05T06:03:00.000Z',
        artifactUrl: 's3://backup/tenant-a.json',
        error: null,
      },
      actionCenter: {
        total: 3,
        critical: 1,
        topItems: [],
      },
    },
    {
      tenantId: 'tenant-b',
      status: 'WARNING',
      alerts: {
        open: 2,
        critical: 0,
        bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 2, LOW: 0 },
      },
      incidents: {
        active: 1,
        critical: 0,
        escalated: 0,
      },
      routines: {
        failed: 0,
        lastFailedAt: null,
      },
      lastBackup: null,
      actionCenter: {
        total: 1,
        critical: 0,
        topItems: [],
      },
    },
  ],
  ...overrides,
});

const mockMultiTenantSummary = vi.mocked(opsApi.multiTenantSummary);
const mockSummary = vi.mocked(opsApi.summary);
const mockGetRunbook = vi.mocked(opsApi.getRunbook);
const mockResolveAlert = vi.mocked(opsApi.resolveAlert);
const mockRerunShiftCheck = vi.mocked(opsApi.rerunShiftCheck);
const mockDeclareIncident = vi.mocked(opsApi.declareIncident);
const mockAssignActionCenterItem = vi.mocked(opsApi.assignActionCenterItem);
const mockCommentActionCenterItem = vi.mocked(opsApi.commentActionCenterItem);
const mockPrioritizeActionCenterItem = vi.mocked(opsApi.prioritizeActionCenterItem);
const mockTransitionActionCenterItem = vi.mocked(opsApi.transitionActionCenterItem);
const mockResolveActionCenterItem = vi.mocked(opsApi.resolveActionCenterItem);

beforeEach(() => {
  mockMultiTenantSummary.mockResolvedValue(buildMultiTenantSummary());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('OpsDashboardPage', () => {
  it('affiche les signaux post-prod critiques', async () => {
    mockSummary.mockResolvedValue(buildSummary());

    renderWithQueryClient(<OpsDashboardPage />);

    expect(await screen.findByText('Tableau de bord ops')).toBeInTheDocument();
    expect(screen.getByText('Statut global: Critique')).toBeInTheDocument();
    expect(screen.getByText('Cockpit multi-tenant')).toBeInTheDocument();
    expect(screen.getByText('tenant-b')).toBeInTheDocument();
    expect(mockMultiTenantSummary).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
    });
    expect(screen.getAllByText('Alertes ouvertes')).not.toHaveLength(0);
    expect(screen.getByText('Repos insuffisant sur le shift')).toBeInTheDocument();
    expect(screen.getByText('Notifications et escalade')).toBeInTheDocument();
    expect(
      screen.getByText('ops-notification-proof:tenant-a:alert:12'),
    ).toBeInTheDocument();
    expect(screen.getByText(/rappel 1/i)).toBeInTheDocument();
    expect(screen.getByText(/quiet hours:/i)).toBeInTheDocument();
    expect(screen.getAllByText('Action-center')).not.toHaveLength(0);
    expect(screen.getByText('SLO API critique')).toBeInTheDocument();
    expect(screen.getByText('Runbook ouvert')).toBeInTheDocument();
    expect(screen.getByText('Scheduler routines')).toBeInTheDocument();
    expect(screen.getByText('Rapports direction')).toBeInTheDocument();
    expect(screen.getByText('Rapport #77')).toBeInTheDocument();
    expect(screen.getByText('Gate ou signoff bloquant')).toBeInTheDocument();
    expect(screen.getByText('SLO / SLA exploitation')).toBeInTheDocument();
    expect(screen.getByText('Open alert age')).toBeInTheDocument();
    expect(screen.getByText('45min')).toBeInTheDocument();
    expect(
      screen.getByText('Actual 45minutes is within warning threshold 60minutes.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Routine success rate')).toBeInTheDocument();
    expect(screen.getAllByText('FAILED')).not.toHaveLength(0);
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
    mockResolveActionCenterItem.mockResolvedValue(
      buildSummary().actionCenter.items[0],
    );
    mockResolveActionCenterItem.mockResolvedValue({});
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

  it('ouvre un runbook depuis l’action-center et résout une alerte supportée', async () => {
    const user = userEvent.setup();
    mockSummary.mockResolvedValue(buildSummary());
    mockResolveActionCenterItem.mockResolvedValue(
      buildSummary().actionCenter.items[0],
    );
    mockGetRunbook.mockResolvedValue({
      id: 'alert-12-runbook',
      generatedAt: '2026-05-05T08:07:00.000Z',
      template: {
        id: 7,
        version: 3,
        tenantId: 'tenant-a',
        service: 'api',
        type: 'SLO',
      },
      reference: {
        sourceType: 'ALERT',
        id: 12,
        tenantId: 'tenant-a',
        title: 'SLO API critique',
        status: 'OPEN',
        severity: 'CRITICAL',
        occurredAt: '2026-05-05T08:01:00.000Z',
        source: 'observability',
        sourceReference: 'slo:api:p95',
      },
      requiredPermissions: [
        {
          role: 'Ops',
          permission: 'operations:write',
          reason: 'Résolution après preuve de retour nominal.',
        },
      ],
      why: 'SLO critique',
      next: {
        why: 'Preuve requise',
        whatToDoNext: 'Vérifier le retour nominal puis résoudre.',
        priority: 'CRITICAL',
        recommendedActionId: 'resolve-alert',
        waitingOn: ['evidence'],
      },
      steps: [
        {
          order: 1,
          title: 'Vérifier monitoring',
          why: 'Confirmer le signal',
          instruction: 'Ouvrir le graphe P95 et capturer la valeur.',
          requiredRole: 'Ops',
          requiredPermission: 'operations:read',
          checks: [
            {
              id: 'p95-back',
              label: 'P95 revenu sous cible',
              expected: '< 500ms pendant 10 minutes',
              blocking: true,
            },
          ],
          evidence: [
            {
              label: 'Capture monitoring',
              expected: 'P95 nominal horodaté',
              requiredFor: ['resolve-alert'],
            },
          ],
          actions: [],
        },
      ],
      checks: [
        {
          id: 'notification',
          label: 'Notification ops acquittée',
          expected: 'Aucun pending alert',
          blocking: false,
        },
      ],
      actions: [
        {
          id: 'resolve-alert',
          label: 'Résoudre alerte',
          method: 'PATCH',
          endpoint: '/ops/alerts/12/resolve',
          requiredPermission: 'operations:write',
          enabled: true,
          why: 'Après retour nominal.',
        },
      ],
      expectedEvidence: [
        {
          label: 'Capture monitoring retour nominal',
          expected: 'Lien ou capture attachée au ticket',
          requiredFor: ['resolve-alert'],
        },
      ],
    });
    renderWithQueryClient(<OpsDashboardPage />);

    await screen.findByText('SLO API critique');

    const actionCenter = screen
      .getByRole('heading', { name: 'Action-center' })
      .closest('section');
    expect(actionCenter).not.toBeNull();
    await user.click(
      within(actionCenter as HTMLElement).getByRole('button', {
        name: /^runbook$/i,
      }),
    );
    expect(mockGetRunbook).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'OperationalAlert', id: 12 }),
      { tenantId: 'tenant-a' },
    );
    expect(
      await screen.findByText(/vérifier monitoring/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/version 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/operations:write/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/p95 revenu sous cible/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/capture monitoring retour nominal/i).length,
    ).toBeGreaterThan(0);

    await user.type(
      within(actionCenter as HTMLElement).getByRole('textbox', {
        name: /résumé/i,
      }),
      'Retour nominal confirmé.',
    );
    await user.click(
      within(actionCenter as HTMLElement).getByRole('button', {
        name: /^résoudre$/i,
      }),
    );
    await waitFor(() =>
      expect(mockResolveActionCenterItem).toHaveBeenCalledWith(
        'operational-alert-12',
        expect.objectContaining({
          status: 'RESOLVED',
          summary: 'Retour nominal confirmé.',
        }),
        { tenantId: 'tenant-a' },
      ),
    );
  });

  it('assigne, commente et change priorité/statut depuis l’action-center', async () => {
    const user = userEvent.setup();
    mockSummary.mockResolvedValue(buildSummary());
    mockAssignActionCenterItem.mockResolvedValue({} as never);
    mockCommentActionCenterItem.mockResolvedValue({} as never);
    mockPrioritizeActionCenterItem.mockResolvedValue({} as never);
    mockTransitionActionCenterItem.mockResolvedValue({} as never);

    renderWithQueryClient(<OpsDashboardPage />);

    await screen.findByText('SLO API critique');
    const actionCenter = screen
      .getByRole('heading', { name: 'Action-center' })
      .closest('section') as HTMLElement;

    await user.click(within(actionCenter).getByRole('button', { name: /^assigner$/i }));
    expect(screen.getByText(/id utilisateur positif/i)).toBeInTheDocument();

    await user.type(
      within(actionCenter).getByPlaceholderText('ID utilisateur'),
      '88',
    );
    await user.type(
      within(actionCenter).getByPlaceholderText('Note opérateur'),
      'Pris en charge',
    );
    await user.click(within(actionCenter).getByRole('button', { name: /^assigner$/i }));
    expect(mockAssignActionCenterItem).toHaveBeenCalledWith(
      'operational-alert-12',
      { assignedToId: 88, comment: 'Pris en charge' },
      { tenantId: 'tenant-a' },
    );

    await user.click(within(actionCenter).getByRole('button', { name: /^commenter$/i }));
    expect(mockCommentActionCenterItem).toHaveBeenCalledWith(
      'operational-alert-12',
      { comment: 'Pris en charge' },
      { tenantId: 'tenant-a' },
    );

    await user.selectOptions(within(actionCenter).getByLabelText(/priorité/i), 'HIGH');
    await user.click(within(actionCenter).getByRole('button', { name: /^priorité$/i }));
    expect(mockPrioritizeActionCenterItem).toHaveBeenCalledWith(
      'operational-alert-12',
      { priority: 'HIGH', comment: 'Pris en charge' },
      { tenantId: 'tenant-a' },
    );

    await user.selectOptions(
      within(actionCenter).getByLabelText(/^statut$/i),
      'IN_PROGRESS',
    );
    await user.click(within(actionCenter).getByRole('button', { name: /^statut$/i }));
    expect(mockTransitionActionCenterItem).toHaveBeenCalledWith(
      'operational-alert-12',
      { status: 'IN_PROGRESS', comment: 'Pris en charge' },
      { tenantId: 'tenant-a' },
    );
  });

  it('couvre le parcours ops multi-tenant: détecter, comprendre, corriger et vérifier', async () => {
    const user = userEvent.setup();
    const correctedSummary = buildSummary({
      status: 'OPERATIONAL',
      statusLabel: 'Opérationnel',
      alerts: [],
      anomalies: [],
      incidents: [],
      actionCenter: {
        available: true,
        status: 'OK',
        generatedAt: '2026-05-05T08:10:00.000Z',
        total: 0,
        items: [],
      },
      kpis: [
        {
          key: 'alerts',
          label: 'Alertes ouvertes',
          value: '0',
          detail: 'Aucune alerte ouverte',
          status: 'OK',
        },
      ],
    });
    mockSummary.mockResolvedValueOnce(buildSummary()).mockResolvedValue(correctedSummary);
    mockResolveActionCenterItem.mockResolvedValue({});
    mockGetRunbook.mockResolvedValue({
      id: 'alert-12-runbook',
      generatedAt: '2026-05-05T08:07:00.000Z',
      template: {
        id: 7,
        version: 3,
        tenantId: 'tenant-a',
        service: 'api',
        type: 'SLO',
      },
      reference: {
        sourceType: 'ALERT',
        id: 12,
        tenantId: 'tenant-a',
        title: 'SLO API critique',
        status: 'OPEN',
        severity: 'CRITICAL',
        occurredAt: '2026-05-05T08:01:00.000Z',
        source: 'observability',
        sourceReference: 'slo:api:p95',
      },
      requiredPermissions: [
        {
          role: 'Ops',
          permission: 'operations:write',
          reason: 'Résoudre après retour nominal documenté.',
        },
      ],
      why: 'Le tenant A concentre une violation SLO critique.',
      next: {
        why: 'Une preuve de retour nominal est nécessaire.',
        whatToDoNext: 'Assigner, corriger puis résoudre l’item.',
        priority: 'CRITICAL',
        recommendedActionId: 'resolve-alert',
        waitingOn: ['evidence'],
      },
      steps: [
        {
          order: 1,
          title: 'Comprendre le blocage SLO',
          why: 'Identifier la cause de la dégradation.',
          instruction: 'Comparer la valeur observée au seuil.',
          requiredRole: 'Ops',
          requiredPermission: 'operations:read',
        },
      ],
      checks: [],
      actions: [],
      expectedEvidence: [
        {
          label: 'Preuve retour nominal',
          expected: 'Lien monitoring ou ticket incident',
          requiredFor: ['resolve-alert'],
        },
      ],
    });

    renderWithQueryClient(<OpsDashboardPage />);

    expect(await screen.findByText('tenant-b')).toBeInTheDocument();
    expect(screen.getByText('SLO API critique')).toBeInTheDocument();
    expect(screen.getByText('Open alert age')).toBeInTheDocument();

    const actionCenter = screen
      .getByRole('heading', { name: 'Action-center' })
      .closest('section') as HTMLElement;
    await user.click(
      within(actionCenter).getByRole('button', { name: /^runbook$/i }),
    );
    await waitFor(() =>
      expect(mockGetRunbook).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'OperationalAlert', id: 12 }),
        { tenantId: 'tenant-a' },
      ),
    );

    await user.type(
      within(actionCenter).getByRole('textbox', { name: /résumé/i }),
      'Correctif appliqué et monitoring nominal.',
    );
    await user.click(
      within(actionCenter).getByRole('button', { name: /^résoudre$/i }),
    );

    await waitFor(() =>
      expect(mockResolveActionCenterItem).toHaveBeenCalledWith(
        'operational-alert-12',
        expect.objectContaining({
          status: 'RESOLVED',
          summary: 'Correctif appliqué et monitoring nominal.',
        }),
        { tenantId: 'tenant-a' },
      ),
    );
    await waitFor(() => expect(mockSummary).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Statut global: Opérationnel')).toBeInTheDocument();
    expect(screen.getAllByText('Aucune alerte ouverte').length).toBeGreaterThan(0);
  });

  it('ouvre un runbook depuis une alerte opérationnelle et un incident exposés', async () => {
    const user = userEvent.setup();
    mockSummary.mockResolvedValue(
      buildSummary({
        actionCenter: {
          available: true,
          status: 'OK',
          generatedAt: '2026-05-05T08:01:00.000Z',
          total: 0,
          items: [],
        },
        alerts: [
          {
            id: 12,
            sourceKind: 'OPERATIONAL_ALERT',
            title: 'SLO API critique',
            detail: 'SLO · observability · slo:api:p95',
            severity: 'HIGH',
            detectedAt: '2026-05-05T08:01:00.000Z',
            source: 'observability',
            type: 'SLO',
            acknowledged: false,
            notificationStatus: 'PENDING',
            actions: {
              canResolve: true,
              canRerunCheck: false,
              canOpenIncident: true,
            },
          },
        ],
        incidents: [
          {
            id: 'ops-incident-8',
            title: 'Incident SLO API',
            status: 'CRITICAL',
            lifecycleStatus: 'ESCALATED',
            severity: 'CRITICAL',
            openedAt: '2026-05-05T08:02:00.000Z',
            detail: 'Incident déclaré depuis SLO.',
            source: 'api',
            sourceIncidentId: 8,
          },
        ],
      }),
    );
    mockGetRunbook.mockResolvedValue({
      id: 'incident-runbook',
      generatedAt: '2026-05-05T08:07:00.000Z',
      template: null,
      reference: {
        sourceType: 'INCIDENT',
        id: 8,
        tenantId: 'tenant-a',
        title: 'Incident SLO API',
        status: 'ESCALATED',
        severity: 'CRITICAL',
        occurredAt: '2026-05-05T08:02:00.000Z',
        source: 'api',
      },
      requiredPermissions: [],
      why: 'Incident critique',
      next: {
        why: 'Coordination ops',
        whatToDoNext: 'Collecter les preuves et escalader.',
        priority: 'CRITICAL',
        recommendedActionId: null,
        waitingOn: [],
      },
      steps: [],
      checks: [],
      actions: [],
      expectedEvidence: [],
    });

    renderWithQueryClient(<OpsDashboardPage />);

    await screen.findByText('SLO API critique');
    const alerts = screen.getAllByText('Alertes ouvertes')[1].closest(
      'section',
    );
    expect(alerts).not.toBeNull();
    await user.click(
      within(alerts as HTMLElement).getByRole('button', {
        name: /ouvrir runbook/i,
      }),
    );
    expect(mockGetRunbook).toHaveBeenCalledWith(
      { entity: 'OperationalAlert', id: 12 },
      { tenantId: 'tenant-a' },
    );

    const incidents = screen.getByText('Incidents').closest('section');
    expect(incidents).not.toBeNull();
    await user.click(
      within(incidents as HTMLElement).getByRole('button', {
        name: /ouvrir runbook/i,
      }),
    );
    expect(mockGetRunbook).toHaveBeenCalledWith(
      { entity: 'OperationIncident', id: 8 },
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
          acknowledgedNotifications: 0,
          reminders: 0,
          quietHoursDeferred: 0,
          failedNotifications: 0,
          entries: [],
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
