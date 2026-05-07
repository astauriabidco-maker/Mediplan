import api from './axios';
import {
  productionReadinessApi,
  ProductionDecision,
  ProductionGateStatus,
  ProductionSignoffHistory,
} from './production-readiness.api';
import type {
  CompliancePeriodParams,
  ObservabilityStatus,
  ProductionObservabilityHealth,
} from './manager.api';

export type OpsStatus = 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
export type OpsSignalStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface OpsDashboardParams extends CompliancePeriodParams {}

export interface ReadyHealth {
  status: 'UP' | 'DOWN' | string;
  service: string;
  checkedAt: string;
  dependencies?: Record<string, string>;
}

export interface BackupMetrics {
  tenantId: string;
  generatedAt: string;
  schemaVersion: string;
  datasetCounts: Record<string, number>;
  planningComplianceSnapshot?: {
    totals?: Record<string, number>;
    shifts?: unknown[];
    workPolicies?: unknown[];
    complianceAuditEvents?: unknown[];
  };
  exportable: boolean;
}

export interface OpsDashboardSummary {
  tenantId: string;
  generatedAt: string;
  status: OpsStatus;
  statusLabel: string;
  health: {
    api: ReadyHealth | null;
    observability: ProductionObservabilityHealth | null;
    readiness: ProductionDecision | null;
  };
  kpis: Array<{
    key: string;
    label: string;
    value: string;
    detail: string;
    status: OpsSignalStatus;
  }>;
  alerts: OpsAlert[];
  anomalies: OpsAnomaly[];
  sla: OpsSlaIndicator[];
  backups: OpsBackupPanel;
  incidents: OpsIncident[];
  notifications: OpsNotificationState;
  gates: ProductionGateStatus[];
  gatesSummary: {
    passed: number;
    failed: number;
    unknown: number;
    total: number;
  };
}

export interface OpsAnomaly {
  id: string;
  title: string;
  detail: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: string;
  source: string;
}

export interface OpsAlert {
  id: number;
  sourceKind: 'AGENT_ALERT' | 'OPERATIONAL_ALERT';
  title: string;
  detail: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: string;
  source: string;
  agentId?: number;
  shiftId?: number;
  ruleCode?: string;
  type?: string;
  acknowledged: boolean;
  notificationStatus: 'PENDING' | 'ACKNOWLEDGED' | 'UNKNOWN';
  actions: {
    canResolve: boolean;
    canRerunCheck: boolean;
    canOpenIncident: boolean;
  };
}

export interface OpsSlaIndicator {
  id: string;
  label: string;
  target: string;
  current: string;
  status: OpsSignalStatus;
  detail: string;
}

export interface OpsBackupPanel {
  status: OpsSignalStatus;
  generatedAt?: string;
  schemaVersion?: string;
  exportable: boolean;
  datasetCounts: Record<string, number>;
  totals: Record<string, number>;
  gate?: ProductionGateStatus;
}

export interface OpsIncident {
  id: string;
  title: string;
  status: OpsSignalStatus;
  lifecycleStatus?: OpsIncidentLifecycleStatus;
  severity?: OpsIncidentSeverity;
  openedAt: string;
  detail: string;
  source: string;
  sourceIncidentId?: number;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  notificationStatus?:
    | 'DECLARED'
    | 'ASSIGNED'
    | 'ESCALATED'
    | 'RESOLVED'
    | 'CLOSED';
}

export type OpsIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OpsIncidentLifecycleStatus =
  | 'DECLARED'
  | 'ASSIGNED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export interface OpsNotificationState {
  status: OpsSignalStatus;
  label: string;
  detail: string;
  pendingAlerts: number;
  escalatedIncidents: number;
  lastActivityAt?: string;
}

interface OpsRawAgentAlert {
  id: number;
  agentId: number;
  tenantId: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  metadata?: Record<string, unknown> | null;
  isAcknowledged: boolean;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolutionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface OpsRawOperationalAlert {
  id: number;
  tenantId: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'RESOLVED';
  source: string;
  sourceReference: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  openedAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  resolvedAt?: string | null;
  resolutionSummary?: string | null;
}

interface OpsRawIncident {
  id: number;
  title: string;
  description: string;
  severity: OpsIncidentSeverity;
  status: OpsIncidentLifecycleStatus;
  impactedService?: string | null;
  declaredAt: string;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  updatedAt?: string;
}

export interface DeclareOpsIncidentInput {
  title: string;
  description: string;
  severity: OpsIncidentSeverity;
  impactedService?: string;
  evidenceUrl?: string;
  evidenceLabel?: string;
}

const nowIso = () => new Date().toISOString();

const settledValue = <T>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null;

const statusFromObservability = (
  status?: ObservabilityStatus,
): OpsSignalStatus => {
  if (status === 'HEALTHY') return 'OK';
  if (status === 'DEGRADED') return 'WARNING';
  if (status === 'CRITICAL') return 'CRITICAL';
  return 'UNKNOWN';
};

const gateSignalStatus = (
  gate?: ProductionGateStatus | null,
): OpsSignalStatus => {
  if (!gate || gate.status === 'UNKNOWN') return 'UNKNOWN';
  return gate.status === 'PASSED' ? 'OK' : 'CRITICAL';
};

const formatPercent = (value: number) =>
  `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

const countGates = (gates: ProductionGateStatus[]) => ({
  passed: gates.filter((gate) => gate.status === 'PASSED').length,
  failed: gates.filter((gate) => gate.status === 'FAILED').length,
  unknown: gates.filter((gate) => gate.status === 'UNKNOWN').length,
  total: gates.length,
});

const numberFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): number | undefined => {
  const value = metadata?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const stringFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined => {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() !== ''
    ? value
    : undefined;
};

const incidentStatusFromSeverity = (
  severity?: OpsIncidentSeverity,
  lifecycleStatus?: OpsIncidentLifecycleStatus,
): OpsSignalStatus => {
  if (lifecycleStatus === 'ESCALATED' || severity === 'CRITICAL') {
    return 'CRITICAL';
  }
  if (severity === 'HIGH') return 'CRITICAL';
  if (severity === 'MEDIUM' || lifecycleStatus === 'DECLARED') {
    return 'WARNING';
  }
  if (severity === 'LOW') return 'OK';
  return 'UNKNOWN';
};

const toUiAlertSeverity = (
  severity: OpsRawOperationalAlert['severity'] | OpsRawAgentAlert['severity'],
): OpsAlert['severity'] => (severity === 'CRITICAL' ? 'HIGH' : severity);

const buildAlerts = (
  agentAlerts: OpsRawAgentAlert[] | null,
  operationalAlerts: OpsRawOperationalAlert[] | null,
): OpsAlert[] => {
  const openAgentAlerts = Array.isArray(agentAlerts) ? agentAlerts : [];
  const agentItems = openAgentAlerts
    .filter((alert) => !alert.isResolved)
    .map((alert) => {
      const shiftId = numberFromMetadata(alert.metadata, 'shiftId');
      return {
        id: alert.id,
        sourceKind: 'AGENT_ALERT' as const,
        title: alert.message,
        detail: [
          alert.type,
          `Agent ${alert.agentId}`,
          shiftId ? `Shift ${shiftId}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        severity: toUiAlertSeverity(alert.severity),
        detectedAt: alert.createdAt,
        source: 'agent-alerts',
        agentId: alert.agentId,
        shiftId,
        ruleCode: stringFromMetadata(alert.metadata, 'ruleCode'),
        type: alert.type,
        acknowledged: alert.isAcknowledged,
        notificationStatus: alert.isAcknowledged
          ? ('ACKNOWLEDGED' as const)
          : ('PENDING' as const),
        actions: {
          canResolve: true,
          canRerunCheck: Boolean(shiftId),
          canOpenIncident: true,
        },
      };
    });

  const openOperationalAlerts = Array.isArray(operationalAlerts)
    ? operationalAlerts
    : [];
  const operationalItems = openOperationalAlerts
    .filter((alert) => alert.status === 'OPEN')
    .map((alert) => ({
      id: alert.id,
      sourceKind: 'OPERATIONAL_ALERT' as const,
      title: alert.message,
      detail: [
        alert.type,
        alert.source,
        alert.sourceReference,
        alert.occurrenceCount > 1 ? `${alert.occurrenceCount} occurrences` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      severity: toUiAlertSeverity(alert.severity),
      detectedAt: alert.lastSeenAt || alert.openedAt,
      source: alert.source,
      type: alert.type,
      acknowledged: false,
      notificationStatus: 'PENDING' as const,
      actions: {
        canResolve: true,
        canRerunCheck: false,
        canOpenIncident: true,
      },
    }));

  return [...agentItems, ...operationalItems]
    .sort((left, right) => {
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (
        severityOrder[left.severity] - severityOrder[right.severity] ||
        new Date(right.detectedAt).getTime() -
          new Date(left.detectedAt).getTime()
      );
    })
    .slice(0, 12);
};

const buildAnomalies = ({
  generatedAt,
  readiness,
  observability,
  backupMetrics,
  backupGate,
  apiHealth,
}: {
  generatedAt: string;
  readiness: ProductionDecision | null;
  observability: ProductionObservabilityHealth | null;
  backupMetrics: BackupMetrics | null;
  backupGate?: ProductionGateStatus;
  apiHealth: ReadyHealth | null;
}): OpsAnomaly[] => {
  const anomalies: OpsAnomaly[] = [];

  if (apiHealth && apiHealth.status !== 'UP') {
    anomalies.push({
      id: 'api-readiness-down',
      title: 'API readiness indisponible',
      detail: `Statut health: ${apiHealth.status}`,
      severity: 'HIGH',
      detectedAt: apiHealth.checkedAt ?? generatedAt,
      source: 'health/ready',
    });
  }

  observability?.reasons.forEach((reason) => {
    anomalies.push({
      id: `observability-${reason}`,
      title: reason.replaceAll('_', ' '),
      detail: 'Signal détecté par l’observabilité planning post-prod.',
      severity:
        reason.includes('HIGH') || reason.includes('FAIL') ? 'HIGH' : 'MEDIUM',
      detectedAt: observability.generatedAt,
      source: 'planning/observability',
    });
  });

  readiness?.blockers.forEach((blocker, index) => {
    anomalies.push({
      id: `readiness-blocker-${index}`,
      title: 'Gate ou signoff bloquant',
      detail: blocker,
      severity: blocker.includes('FAILED') ? 'HIGH' : 'MEDIUM',
      detectedAt: readiness.generatedAt,
      source: 'production-readiness',
    });
  });

  if (backupMetrics && !backupMetrics.exportable) {
    anomalies.push({
      id: 'backup-not-exportable',
      title: 'Backup non exportable',
      detail: 'Le snapshot tenant courant n’est pas marqué exportable.',
      severity: 'HIGH',
      detectedAt: backupMetrics.generatedAt,
      source: 'tenant-backups',
    });
  }

  if (backupGate && backupGate.status !== 'PASSED') {
    anomalies.push({
      id: 'backup-gate-not-passed',
      title: 'Gate backup non validé',
      detail: `Statut ${backupGate.status} depuis ${backupGate.source}`,
      severity: backupGate.status === 'FAILED' ? 'HIGH' : 'MEDIUM',
      detectedAt: backupGate.checkedAt ?? generatedAt,
      source: 'production-readiness',
    });
  }

  return anomalies.slice(0, 8);
};

const buildIncidents = ({
  generatedAt,
  observability,
  readiness,
  history,
  rawIncidents,
}: {
  generatedAt: string;
  observability: ProductionObservabilityHealth | null;
  readiness: ProductionDecision | null;
  history: ProductionSignoffHistory | null;
  rawIncidents: OpsRawIncident[] | null;
}): OpsIncident[] => {
  const incidentFeed = Array.isArray(rawIncidents) ? rawIncidents : [];
  const operationIncidents = incidentFeed
    .filter(
      (incident) =>
        incident.status !== 'RESOLVED' && incident.status !== 'CLOSED',
    )
    .map((incident) => ({
      id: `ops-incident-${incident.id}`,
      title: incident.title,
      status: incidentStatusFromSeverity(incident.severity, incident.status),
      lifecycleStatus: incident.status,
      severity: incident.severity,
      openedAt: incident.declaredAt,
      detail: incident.description,
      source: incident.impactedService ?? 'ops/incidents',
      sourceIncidentId: incident.id,
      escalatedAt: incident.escalatedAt,
      escalationReason: incident.escalationReason,
      notificationStatus: incident.status,
    }))
    .slice(0, 8);

  if (operationIncidents.length > 0) {
    return operationIncidents;
  }

  const incidents: OpsIncident[] = [];
  const refused = observability?.counters.refusedPublications ?? 0;
  const highAlerts = observability?.counters.highAlerts ?? 0;

  if (refused > 0) {
    incidents.push({
      id: 'refused-publications',
      title: 'Publication refusée',
      status: 'CRITICAL',
      openedAt: observability?.generatedAt ?? generatedAt,
      detail: `${refused} tentative${refused > 1 ? 's' : ''} refusée${refused > 1 ? 's' : ''}.`,
      source: 'planning/publication',
    });
  }

  if (highAlerts > 0) {
    incidents.push({
      id: 'high-alerts',
      title: 'Alertes critiques ouvertes',
      status: 'CRITICAL',
      openedAt: observability?.generatedAt ?? generatedAt,
      detail: `${highAlerts} alerte${highAlerts > 1 ? 's' : ''} HIGH non résolue${highAlerts > 1 ? 's' : ''}.`,
      source: 'planning/compliance',
    });
  }

  readiness?.gates.checks
    .filter((gate) => gate.status === 'FAILED')
    .forEach((gate) => {
      incidents.push({
        id: `gate-${gate.key}`,
        title: `Gate ${gate.key} en échec`,
        status: 'CRITICAL',
        openedAt: gate.checkedAt ?? readiness.generatedAt,
        detail: gate.evidenceUrl ?? gate.source,
        source: 'production-readiness',
      });
    });

  history?.entries.slice(0, 2).forEach((entry) => {
    if (entry.status !== 'NO_GO') return;
    incidents.push({
      id: `signoff-${entry.auditLogId}`,
      title: `NO_GO ${entry.key}`,
      status: 'WARNING',
      openedAt: entry.decidedAt,
      detail: entry.comment ?? 'Signoff production défavorable.',
      source: 'signoff-history',
    });
  });

  return incidents.slice(0, 6);
};

const buildNotifications = ({
  alerts,
  incidents,
}: {
  alerts: OpsAlert[];
  incidents: OpsIncident[];
}): OpsNotificationState => {
  const pendingAlerts = alerts.filter(
    (alert) => alert.notificationStatus === 'PENDING',
  ).length;
  const escalatedIncidents = incidents.filter(
    (incident) => incident.notificationStatus === 'ESCALATED',
  ).length;
  const lastActivityAt = [
    ...alerts.map((alert) => alert.detectedAt),
    ...incidents.map((incident) => incident.escalatedAt ?? incident.openedAt),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);

  if (escalatedIncidents > 0) {
    return {
      status: 'CRITICAL',
      label: 'Escalade active',
      detail: `${escalatedIncidents} incident${escalatedIncidents > 1 ? 's' : ''} escaladé${escalatedIncidents > 1 ? 's' : ''}.`,
      pendingAlerts,
      escalatedIncidents,
      lastActivityAt,
    };
  }

  if (pendingAlerts > 0) {
    return {
      status: 'WARNING',
      label: 'Notifications à traiter',
      detail: `${pendingAlerts} alerte${pendingAlerts > 1 ? 's' : ''} non acquittée${pendingAlerts > 1 ? 's' : ''}.`,
      pendingAlerts,
      escalatedIncidents,
      lastActivityAt,
    };
  }

  return {
    status: alerts.length > 0 || incidents.length > 0 ? 'OK' : 'UNKNOWN',
    label:
      alerts.length > 0 || incidents.length > 0
        ? 'Suivi à jour'
        : 'Aucun signal',
    detail:
      alerts.length > 0 || incidents.length > 0
        ? 'Les alertes ouvertes sont acquittées et aucun incident n’est escaladé.'
        : 'Aucune notification ou escalade active remontée.',
    pendingAlerts,
    escalatedIncidents,
    lastActivityAt,
  };
};

const buildSla = ({
  observability,
  readiness,
  backup,
  backupGate,
}: {
  observability: ProductionObservabilityHealth | null;
  readiness: ProductionDecision | null;
  backup: BackupMetrics | null;
  backupGate?: ProductionGateStatus;
}): OpsSlaIndicator[] => {
  const publicationAttempts = observability?.counters.publicationAttempts ?? 0;
  const successfulPublications =
    observability?.counters.successfulPublications ?? 0;
  const publicationRate =
    publicationAttempts > 0 ? successfulPublications / publicationAttempts : 1;
  const gateCounts = countGates(
    readiness ? [readiness.gates.freeze, ...readiness.gates.checks] : [],
  );
  const gateRate = gateCounts.total > 0 ? gateCounts.passed / gateCounts.total : 0;

  return [
    {
      id: 'publication',
      label: 'SLA publication',
      target: '>= 95%',
      current: formatPercent(publicationRate),
      status:
        publicationRate >= 0.95
          ? 'OK'
          : publicationRate >= 0.8
            ? 'WARNING'
            : 'CRITICAL',
      detail: `${successfulPublications}/${publicationAttempts || 0} publications réussies.`,
    },
    {
      id: 'compliance-scan',
      label: 'Scan conformité',
      target: '0 run échoué',
      current: `${observability?.jobs.complianceScan.failedRuns ?? 0} échec`,
      status: statusFromObservability(observability?.jobs.complianceScan.status),
      detail: `${observability?.jobs.complianceScan.recentRuns ?? 0} runs récents.`,
    },
    {
      id: 'backup',
      label: 'Backup tenant',
      target: 'Exportable + gate passé',
      current: backup?.exportable ? 'Exportable' : 'Non exportable',
      status:
        backup?.exportable && gateSignalStatus(backupGate) === 'OK'
          ? 'OK'
          : gateSignalStatus(backupGate) === 'CRITICAL'
            ? 'CRITICAL'
            : 'WARNING',
      detail: backupGate
        ? `Gate ${backupGate.status} depuis ${backupGate.source}.`
        : 'Gate BACKUP absent.',
    },
    {
      id: 'post-prod-gates',
      label: 'Gates post-prod',
      target: '100% passés',
      current: formatPercent(gateRate),
      status:
        gateCounts.failed > 0
          ? 'CRITICAL'
          : gateCounts.unknown > 0
            ? 'WARNING'
            : 'OK',
      detail: `${gateCounts.passed}/${gateCounts.total} gates passés.`,
    },
  ];
};

const getGlobalStatus = ({
  apiHealth,
  readiness,
  observability,
  anomalies,
}: {
  apiHealth: ReadyHealth | null;
  readiness: ProductionDecision | null;
  observability: ProductionObservabilityHealth | null;
  anomalies: OpsAnomaly[];
}): OpsStatus => {
  if (!apiHealth || !readiness || !observability) return 'UNKNOWN';
  if (
    apiHealth.status !== 'UP' ||
    observability.status === 'CRITICAL' ||
    anomalies.some((anomaly) => anomaly.severity === 'HIGH')
  ) {
    return 'CRITICAL';
  }
  if (readiness.status === 'PROD_NO_GO' || observability.status === 'DEGRADED') {
    return 'DEGRADED';
  }
  return 'OPERATIONAL';
};

const statusLabel: Record<OpsStatus, string> = {
  OPERATIONAL: 'Opérationnel',
  DEGRADED: 'Dégradé',
  CRITICAL: 'Critique',
  UNKNOWN: 'Incomplet',
};

const buildSummary = ({
  apiHealth,
  observability,
  backupMetrics,
  readiness,
  history,
  alertFeed,
  operationalAlertFeed,
  incidentFeed,
}: {
  apiHealth: ReadyHealth | null;
  observability: ProductionObservabilityHealth | null;
  backupMetrics: BackupMetrics | null;
  readiness: ProductionDecision | null;
  history: ProductionSignoffHistory | null;
  alertFeed: OpsRawAgentAlert[] | null;
  operationalAlertFeed: OpsRawOperationalAlert[] | null;
  incidentFeed: OpsRawIncident[] | null;
}): OpsDashboardSummary => {
  const generatedAt = nowIso();
  const gates = readiness ? [readiness.gates.freeze, ...readiness.gates.checks] : [];
  const gatesSummary = countGates(gates);
  const backupGate = gates.find((gate) => gate.key === 'BACKUP');
  const alerts = buildAlerts(alertFeed, operationalAlertFeed);
  const anomalies = buildAnomalies({
    generatedAt,
    readiness,
    observability,
    backupMetrics,
    backupGate,
    apiHealth,
  });
  const status = getGlobalStatus({
    apiHealth,
    readiness,
    observability,
    anomalies,
  });
  const backupTotals =
    backupMetrics?.planningComplianceSnapshot?.totals ??
    backupMetrics?.datasetCounts ??
    {};
  const incidents = buildIncidents({
    generatedAt,
    observability,
    readiness,
    history,
    rawIncidents: incidentFeed,
  });
  const notifications = buildNotifications({ alerts, incidents });
  const highAlerts =
    alerts.filter((alert) => alert.severity === 'HIGH').length ||
    observability?.counters.highAlerts ||
    0;
  const openAlerts = alerts.length || observability?.counters.openAlerts || 0;

  return {
    tenantId:
      observability?.tenantId ??
      readiness?.tenantId ??
      backupMetrics?.tenantId ??
      'unknown',
    generatedAt,
    status,
    statusLabel: statusLabel[status],
    health: {
      api: apiHealth,
      observability,
      readiness,
    },
    kpis: [
      {
        key: 'alerts',
        label: 'Alertes ouvertes',
        value: String(openAlerts),
        detail: `${highAlerts} HIGH · ${notifications.pendingAlerts} non acquittée`,
        status:
          highAlerts > 0
            ? 'CRITICAL'
            : openAlerts > 0
              ? 'WARNING'
              : 'OK',
      },
      {
        key: 'notifications',
        label: 'Notifications',
        value: notifications.label,
        detail: notifications.detail,
        status: notifications.status,
      },
      {
        key: 'readiness',
        label: 'Post-prod',
        value: readiness?.status ?? 'N/A',
        detail: `${readiness?.blockers.length ?? 0} blocker`,
        status: readiness?.status === 'PROD_READY' ? 'OK' : 'WARNING',
      },
      {
        key: 'gates',
        label: 'Gates passés',
        value: `${gatesSummary.passed}/${gatesSummary.total}`,
        detail: `${gatesSummary.failed} échec, ${gatesSummary.unknown} inconnu`,
        status:
          gatesSummary.failed > 0
            ? 'CRITICAL'
            : gatesSummary.unknown > 0
              ? 'WARNING'
              : 'OK',
      },
      {
        key: 'backups',
        label: 'Backups',
        value: backupMetrics?.exportable ? 'Exportable' : 'À vérifier',
        detail: backupGate ? `Gate ${backupGate.status}` : 'Gate absent',
        status:
          backupMetrics?.exportable && gateSignalStatus(backupGate) === 'OK'
            ? 'OK'
            : gateSignalStatus(backupGate),
      },
    ],
    alerts,
    anomalies,
    sla: buildSla({
      observability,
      readiness,
      backup: backupMetrics,
      backupGate,
    }),
    backups: {
      status:
        backupMetrics?.exportable && gateSignalStatus(backupGate) === 'OK'
          ? 'OK'
          : gateSignalStatus(backupGate) === 'CRITICAL'
            ? 'CRITICAL'
            : 'WARNING',
      generatedAt: backupMetrics?.generatedAt,
      schemaVersion: backupMetrics?.schemaVersion,
      exportable: Boolean(backupMetrics?.exportable),
      datasetCounts: backupMetrics?.datasetCounts ?? {},
      totals: backupTotals,
      gate: backupGate,
    },
    incidents,
    notifications,
    gates,
    gatesSummary,
  };
};

export const opsApi = {
  summary: async (
    params?: OpsDashboardParams,
  ): Promise<OpsDashboardSummary> => {
    const [
      apiHealth,
      observability,
      backupMetrics,
      readiness,
      history,
      alertFeed,
      operationalAlertFeed,
      incidentFeed,
    ] =
      await Promise.allSettled([
        api
          .get<ReadyHealth>('/api/health/ready')
          .then((response) => response.data),
        api
          .get<ProductionObservabilityHealth>(
            '/api/planning/observability/health',
            { params },
          )
          .then((response) => response.data),
        api
          .get<BackupMetrics>('/api/tenant-backups/metrics', { params })
          .then((response) => response.data),
        productionReadinessApi.getDecision(params),
        productionReadinessApi.getSignoffHistory(params),
        api
          .get<OpsRawAgentAlert[]>('/api/agent-alerts', {
            params: {
              tenantId: params?.tenantId,
              isResolved: false,
            },
          })
          .then((response) => response.data),
        api
          .get<OpsRawOperationalAlert[]>('/api/ops/alerts', {
            params: {
              tenantId: params?.tenantId,
              status: 'OPEN',
            },
          })
          .then((response) => response.data),
        api
          .get<OpsRawIncident[]>('/api/ops/incidents', {
            params: {
              tenantId: params?.tenantId,
            },
          })
          .then((response) => response.data),
      ]);

    return buildSummary({
      apiHealth: settledValue(apiHealth),
      observability: settledValue(observability),
      backupMetrics: settledValue(backupMetrics),
      readiness: settledValue(readiness),
      history: settledValue(history),
      alertFeed: settledValue(alertFeed),
      operationalAlertFeed: settledValue(operationalAlertFeed),
      incidentFeed: settledValue(incidentFeed),
    });
  },
  resolveAlert: async (alert: Pick<OpsAlert, 'id' | 'sourceKind'>, reason: string) => {
    if (alert.sourceKind === 'OPERATIONAL_ALERT') {
      const response = await api.patch(`/api/ops/alerts/${alert.id}/resolve`, {
        resolutionSummary: reason,
      });
      return response.data;
    }

    const response = await api.patch(`/api/planning/alerts/${alert.id}/resolve`, {
      reason,
      recommendationId: `ops-alert:${alert.id}`,
    });
    return response.data;
  },
  rerunShiftCheck: async (shiftId: number) => {
    const response = await api.post(`/api/planning/shifts/${shiftId}/revalidate`);
    return response.data;
  },
  declareIncident: async (
    input: DeclareOpsIncidentInput,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ) => {
    const response = await api.post('/api/ops/incidents', input, {
      params: {
        tenantId: params?.tenantId,
      },
    });
    return response.data;
  },
};
