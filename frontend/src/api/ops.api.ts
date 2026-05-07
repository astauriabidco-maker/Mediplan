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
  anomalies: OpsAnomaly[];
  sla: OpsSlaIndicator[];
  backups: OpsBackupPanel;
  incidents: OpsIncident[];
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
  openedAt: string;
  detail: string;
  source: string;
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
}: {
  generatedAt: string;
  observability: ProductionObservabilityHealth | null;
  readiness: ProductionDecision | null;
  history: ProductionSignoffHistory | null;
}): OpsIncident[] => {
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
}: {
  apiHealth: ReadyHealth | null;
  observability: ProductionObservabilityHealth | null;
  backupMetrics: BackupMetrics | null;
  readiness: ProductionDecision | null;
  history: ProductionSignoffHistory | null;
}): OpsDashboardSummary => {
  const generatedAt = nowIso();
  const gates = readiness ? [readiness.gates.freeze, ...readiness.gates.checks] : [];
  const gatesSummary = countGates(gates);
  const backupGate = gates.find((gate) => gate.key === 'BACKUP');
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
        value: String(observability?.counters.openAlerts ?? 0),
        detail: `${observability?.counters.highAlerts ?? 0} HIGH`,
        status:
          (observability?.counters.highAlerts ?? 0) > 0
            ? 'CRITICAL'
            : (observability?.counters.openAlerts ?? 0) > 0
              ? 'WARNING'
              : 'OK',
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
    incidents: buildIncidents({
      generatedAt,
      observability,
      readiness,
      history,
    }),
    gates,
    gatesSummary,
  };
};

export const opsApi = {
  summary: async (
    params?: OpsDashboardParams,
  ): Promise<OpsDashboardSummary> => {
    const [apiHealth, observability, backupMetrics, readiness, history] =
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
      ]);

    return buildSummary({
      apiHealth: settledValue(apiHealth),
      observability: settledValue(observability),
      backupMetrics: settledValue(backupMetrics),
      readiness: settledValue(readiness),
      history: settledValue(history),
    });
  },
};
