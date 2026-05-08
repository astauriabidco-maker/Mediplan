import type {
  OpsDashboardSummary,
  OpsMultiTenantSummaryResponse,
  OpsRunbookDto,
  OpsTenantSummary,
} from '../ops.api';

export const PILOT_OPS_DEMO_TENANTS = {
  healthy: 'tenant-demo-sain',
  warning: 'tenant-demo-warning',
  critical: 'tenant-demo-critique',
} as const;

export type PilotOpsDemoTenantState = keyof typeof PILOT_OPS_DEMO_TENANTS;

export const pilotOpsDemoTenantOrder: PilotOpsDemoTenantState[] = [
  'healthy',
  'warning',
  'critical',
];

export const pilotOpsDemoTenantLabels: Record<PilotOpsDemoTenantState, string> =
  {
    healthy: 'Sain',
    warning: 'Warning',
    critical: 'Critique',
  };

const generatedAt = '2026-05-05T08:02:00.000Z';

export const pilotOpsDemoTenants: Record<
  PilotOpsDemoTenantState,
  OpsTenantSummary
> = {
  healthy: {
    tenantId: PILOT_OPS_DEMO_TENANTS.healthy,
    status: 'OK',
    alerts: {
      open: 0,
      critical: 0,
      bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    },
    incidents: {
      active: 0,
      critical: 0,
      escalated: 0,
    },
    routines: {
      failed: 0,
      lastFailedAt: null,
    },
    lastBackup: {
      routine: 'tenant-backup-export',
      status: 'SUCCESS',
      startedAt: '2026-05-05T06:00:00.000Z',
      finishedAt: '2026-05-05T06:02:00.000Z',
      artifactUrl: 's3://backup/tenant-demo-sain.json',
      error: null,
    },
    actionCenter: {
      total: 0,
      critical: 0,
      topItems: [],
    },
  },
  warning: {
    tenantId: PILOT_OPS_DEMO_TENANTS.warning,
    status: 'WARNING',
    alerts: {
      open: 1,
      critical: 0,
      bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0 },
    },
    incidents: {
      active: 0,
      critical: 0,
      escalated: 0,
    },
    routines: {
      failed: 0,
      lastFailedAt: null,
    },
    lastBackup: {
      routine: 'tenant-backup-export',
      status: 'SUCCESS',
      startedAt: '2026-05-05T06:05:00.000Z',
      finishedAt: '2026-05-05T06:08:00.000Z',
      artifactUrl: 's3://backup/tenant-demo-warning.json',
      error: null,
    },
    actionCenter: {
      total: 1,
      critical: 0,
      topItems: [],
    },
  },
  critical: {
    tenantId: PILOT_OPS_DEMO_TENANTS.critical,
    status: 'CRITICAL',
    alerts: {
      open: 3,
      critical: 1,
      bySeverity: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 0 },
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
      artifactUrl: 's3://backup/tenant-demo-critique.json',
      error: null,
    },
    actionCenter: {
      total: 2,
      critical: 1,
      topItems: [],
    },
  },
};

export const buildPilotOpsDemoMultiTenantSummary = (
  overrides?: Partial<OpsMultiTenantSummaryResponse>,
): OpsMultiTenantSummaryResponse => ({
  generatedAt,
  scope: {
    tenantId: null,
    allTenants: true,
  },
  totals: {
    tenants: 3,
    criticalTenants: 1,
    warningTenants: 1,
    openAlerts: 4,
    activeIncidents: 1,
    failedRoutines: 1,
    actionCenterItems: 3,
  },
  tenants: [
    pilotOpsDemoTenants.healthy,
    pilotOpsDemoTenants.warning,
    pilotOpsDemoTenants.critical,
  ],
  ...overrides,
});

export const buildPilotOpsCriticalSummary = (
  base: OpsDashboardSummary,
): OpsDashboardSummary => ({
  ...base,
  tenantId: PILOT_OPS_DEMO_TENANTS.critical,
  status: 'CRITICAL',
  statusLabel: 'Critique',
  health: {
    ...base.health,
    observability: base.health.observability
      ? {
          ...base.health.observability,
          tenantId: PILOT_OPS_DEMO_TENANTS.critical,
          status: 'CRITICAL',
          reasons: ['SLO_API_P95_FAILED', 'AUDIT_REQUIRED_BEFORE_CLOSE'],
        }
      : null,
  },
  sla: [
    {
      id: 'alert_resolution_delay',
      label: 'Résolution alerte critique',
      target: '<= 30min',
      current: '47min',
      status: 'CRITICAL',
      detail: 'Seuil failed > 30min · 1 échantillon',
      reason:
        'Actual 47minutes breaches failed threshold 30minutes for tenant critique tenant-demo-critique.',
      period: {
        from: '2026-05-05T07:15:00.000Z',
        to: generatedAt,
      },
      sloStatus: 'FAILED',
    },
  ],
  alerts: [
    {
      id: 12,
      sourceKind: 'OPERATIONAL_ALERT',
      title: 'SLO API p95 critique réanimation',
      detail: 'SLO · api-gateway · p95=1.8s · tenant tenant-demo-critique',
      severity: 'HIGH',
      detectedAt: '2026-05-05T07:15:00.000Z',
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
      id: 'slo-api-p95-rea',
      title: 'Incident SLO API réanimation',
      status: 'CRITICAL',
      lifecycleStatus: 'ESCALATED',
      severity: 'CRITICAL',
      openedAt: '2026-05-05T07:20:00.000Z',
      detail: 'Latence p95 dégradée sur le tenant critique.',
      source: 'observability/slo',
      sourceIncidentId: 91,
      escalatedAt: '2026-05-05T07:30:00.000Z',
      escalationReason: 'SLO failed on critical tenant',
      notificationStatus: 'ESCALATED',
    },
  ],
  actionCenter: {
    available: true,
    status: 'CRITICAL',
    generatedAt,
    total: 1,
    items: [
      {
        id: 'operational-alert-12',
        type: 'OPERATIONAL_ALERT',
        priority: 'CRITICAL',
        status: 'WAITING_EVIDENCE',
        title: 'SLO API p95 critique réanimation',
        reason:
          'Tenant critique tenant-demo-critique en échec SLO, preuve de retour nominal requise avant clôture.',
        requiredEvidence: [
          'Capture Grafana p95 < 500ms',
          'Lien ticket incident résolu',
        ],
        suggestedActions: ['resolve-alert'],
        sourceReference: {
          entity: 'OperationalAlert',
          id: 12,
          tenantId: PILOT_OPS_DEMO_TENANTS.critical,
          reference: 'slo:api:p95:rea',
        },
        timestamps: {
          createdAt: '2026-05-05T07:16:00.000Z',
          updatedAt: generatedAt,
          occurredAt: '2026-05-05T07:15:00.000Z',
        },
        workflow: {
          assignedToId: 88,
          priorityOverride: 'CRITICAL',
          statusOverride: 'WAITING_EVIDENCE',
          commentsCount: 2,
          lastComment: {
            id: 501,
            actorId: 88,
            comment: 'Mitigation cache appliquée, attente preuve audit.',
            createdAt: '2026-05-05T08:00:00.000Z',
          },
          updatedAt: generatedAt,
          updatedById: 88,
        },
      },
    ],
  },
});

export const buildPilotOpsCriticalResolvedSummary = (
  base: OpsDashboardSummary,
): OpsDashboardSummary => ({
  ...base,
  tenantId: PILOT_OPS_DEMO_TENANTS.critical,
  status: 'OPERATIONAL',
  statusLabel: 'Opérationnel',
  alerts: [],
  anomalies: [],
  incidents: [],
  health: {
    ...base.health,
    observability: base.health.observability
      ? {
          ...base.health.observability,
          tenantId: PILOT_OPS_DEMO_TENANTS.critical,
          status: 'HEALTHY',
          reasons: [],
        }
      : null,
  },
  sla: [
    {
      id: 'alert_resolution_delay',
      label: 'Résolution alerte critique',
      target: '<= 30min',
      current: '12min',
      status: 'OK',
      detail: 'Seuil warning <= 45min · 1 échantillon',
      reason: 'L’alerte critique a été résolue dans la fenêtre SLO.',
      period: {
        from: '2026-05-05T07:55:00.000Z',
        to: '2026-05-05T08:10:00.000Z',
      },
      sloStatus: 'PASSED',
    },
  ],
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

export const pilotOpsCriticalRunbook: OpsRunbookDto = {
  id: 'alert-12-runbook',
  generatedAt: '2026-05-05T08:07:00.000Z',
  template: {
    id: 7,
    version: 3,
    tenantId: PILOT_OPS_DEMO_TENANTS.critical,
    service: 'api-gateway',
    type: 'SLO',
  },
  reference: {
    sourceType: 'ALERT',
    id: 12,
    tenantId: PILOT_OPS_DEMO_TENANTS.critical,
    title: 'SLO API p95 critique réanimation',
    status: 'WAITING_EVIDENCE',
    severity: 'CRITICAL',
    occurredAt: '2026-05-05T07:15:00.000Z',
    source: 'observability',
    sourceReference: 'slo:api:p95:rea',
  },
  requiredPermissions: [
    {
      role: 'Ops',
      permission: 'operations:write',
      reason: 'Résoudre après retour nominal documenté.',
    },
    {
      role: 'Auditeur',
      permission: 'audit:read',
      reason: 'Vérifier que la chaîne audit reste valide avant clôture.',
    },
  ],
  why: 'Le tenant critique tenant-demo-critique concentre une violation SLO p95 avec incident escaladé.',
  next: {
    why: 'Une preuve de retour nominal et un contrôle audit sont nécessaires.',
    whatToDoNext:
      'Valider le p95, contrôler le journal audit, joindre la preuve puis résoudre l’item.',
    priority: 'CRITICAL',
    recommendedActionId: 'resolve-alert',
    waitingOn: ['evidence', 'audit-chain'],
  },
  steps: [
    {
      order: 1,
      title: 'Confirmer le SLO p95 en échec',
      why: 'Identifier la cause de la dégradation.',
      instruction: 'Comparer p95 api-gateway au seuil 500ms sur tenant-demo-critique.',
      requiredRole: 'Ops',
      requiredPermission: 'operations:read',
      checks: [
        {
          id: 'slo-failed',
          label: 'SLO p95 FAILED visible',
          expected: 'p95=1.8s supérieur au seuil 500ms',
          blocking: true,
        },
      ],
      evidence: [
        {
          label: 'Capture SLO en échec',
          expected: 'Graphe p95 horodaté avant mitigation',
          requiredFor: ['resolve-alert'],
        },
      ],
    },
    {
      order: 2,
      title: 'Vérifier audit avant clôture',
      why: 'La résolution doit laisser une trace contrôlable.',
      instruction: 'Contrôler le hash-chain audit et la mutation action-center.',
      requiredRole: 'Auditeur',
      requiredPermission: 'audit:read',
      checks: [
        {
          id: 'audit-chain-valid',
          label: 'Chaîne audit valide',
          expected: '0 issue et mutation RESOLVED tracée',
          blocking: true,
        },
      ],
    },
  ],
  checks: [
    {
      id: 'return-to-green',
      label: 'Retour nominal post-mitigation',
      expected: 'p95 < 500ms pendant 10 minutes',
      blocking: true,
    },
  ],
  actions: [],
  expectedEvidence: [
    {
      label: 'Preuve retour nominal',
      expected: 'Lien Grafana p95 nominal et ticket incident résolu',
      requiredFor: ['resolve-alert'],
    },
    {
      label: 'Journal audit immuable',
      expected: 'Hash-chain audit valide après mutation action-center',
      requiredFor: ['resolve-alert'],
    },
  ],
};
