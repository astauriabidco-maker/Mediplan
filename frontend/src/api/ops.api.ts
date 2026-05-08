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
export type OpsSloStatus = 'PASSED' | 'WARNING' | 'FAILED';
export type OpsSloObjectiveId =
  | 'alert_resolution_delay'
  | 'open_alert_age'
  | 'incident_mttr'
  | 'backup_freshness'
  | 'routine_success_rate'
  | 'notification_delivery';

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
  actionCenter: OpsActionCenterPanel;
  routines: OpsRoutineSurface;
  directionReports: OpsDirectionReportSurface;
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
  reason?: string;
  period?: {
    from: string | null;
    to: string | null;
  };
  sloStatus?: OpsSloStatus;
}

export interface OpsSloObjectiveThresholds {
  pass: number;
  warning: number;
  unit: 'minutes' | 'hours' | 'percent';
  direction: 'lte' | 'gte';
}

export interface OpsSloObjectiveActual {
  value: number | null;
  unit: OpsSloObjectiveThresholds['unit'];
  sampleSize: number;
}

export interface OpsSloObjective {
  id: OpsSloObjectiveId;
  label: string;
  status: OpsSloStatus;
  actual: OpsSloObjectiveActual;
  thresholds: OpsSloObjectiveThresholds;
  reason: string;
  details?: Record<string, unknown>;
}

export interface OpsSloResponse {
  tenantId: string;
  generatedAt: string;
  period: {
    from: string | null;
    to: string | null;
  };
  status: OpsSloStatus;
  objectives: Record<OpsSloObjectiveId, OpsSloObjective>;
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
  acknowledgedNotifications: number;
  reminders: number;
  quietHoursDeferred: number;
  failedNotifications: number;
  lastActivityAt?: string;
  entries: OpsNotificationEvidence[];
}

export type OpsNotificationJournalStatus =
  | 'PENDING'
  | 'DRY_RUN'
  | 'SENT'
  | 'PARTIAL'
  | 'FAILED'
  | 'THROTTLED'
  | 'ACKNOWLEDGED'
  | 'UNKNOWN';

export interface OpsNotificationEvidence {
  id: number;
  title: string;
  eventType: string;
  status: OpsNotificationJournalStatus;
  severity: OpsIncidentSeverity;
  occurredAt: string;
  resolvedAt?: string | null;
  relatedReference?: string | null;
  channels: string[];
  attempts: Array<{
    channel: string;
    status: OpsNotificationJournalStatus;
    message?: string;
  }>;
  proofId?: string;
  proofGeneratedAt?: string;
  acknowledgedAt?: string;
  acknowledgedById?: number;
  reminder: {
    isReminder: boolean;
    reminderCount: number;
    nextReminderAt?: string | null;
  };
  escalationLevel?: number;
  quietHours?: {
    start: string;
    end: string;
    timezone?: string;
  } | null;
  suppressedUntil?: string | null;
}

export type OpsActionCenterItemType =
  | 'OPERATIONAL_ALERT'
  | 'AUTO_INCIDENT'
  | 'INCIDENT_ESCALATION'
  | 'MISSING_EVIDENCE'
  | 'DECISION_REQUIRED'
  | 'JOURNAL_ACTION';

export type OpsActionCenterStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'ESCALATED'
  | 'WAITING_EVIDENCE'
  | 'WAITING_DECISION'
  | 'RESOLVED'
  | 'CLOSED';

export type OpsActionCenterPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OpsActionCenterSourceReference {
  entity: 'OperationalAlert' | 'OperationIncident' | 'OperationsJournalEntry';
  id: number;
  tenantId: string;
  reference: string;
}

export interface OpsActionCenterWorkflowComment {
  id: number;
  comment: string;
  actorId: number;
  createdAt: string;
}

export interface OpsActionCenterWorkflowState {
  assignedToId: number | null;
  priorityOverride: OpsActionCenterPriority | null;
  statusOverride: OpsActionCenterStatus | null;
  commentsCount: number;
  lastComment: OpsActionCenterWorkflowComment | null;
  updatedAt: string | null;
  updatedById: number | null;
}

export interface OpsActionCenterItem {
  id: string;
  type: OpsActionCenterItemType;
  priority: OpsActionCenterPriority;
  status: OpsActionCenterStatus;
  title: string;
  reason: string;
  requiredEvidence: string[];
  suggestedActions: string[];
  sourceReference: OpsActionCenterSourceReference;
  timestamps: {
    createdAt: string | null;
    updatedAt: string | null;
    occurredAt: string;
    lastSeenAt?: string | null;
    escalatedAt?: string | null;
    resolvedAt?: string | null;
  };
  workflow?: OpsActionCenterWorkflowState;
}

export interface OpsActionCenterResponse {
  tenantId: string;
  generatedAt: string;
  total: number;
  filters: {
    status: OpsActionCenterStatus | null;
    type: OpsActionCenterItemType | null;
    limit: number;
  };
  items: OpsActionCenterItem[];
}

export type OpsTenantOperationalStatus = 'OK' | 'WARNING' | 'CRITICAL';

export interface OpsTenantLastBackupSummary {
  routine: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  artifactUrl: string | null;
  error: string | null;
}

export interface OpsTenantSummary {
  tenantId: string;
  status: OpsTenantOperationalStatus;
  alerts: {
    open: number;
    critical: number;
    bySeverity: Record<string, number>;
  };
  incidents: {
    active: number;
    critical: number;
    escalated: number;
  };
  routines: {
    failed: number;
    lastFailedAt: string | null;
  };
  lastBackup: OpsTenantLastBackupSummary | null;
  actionCenter: {
    total: number;
    critical: number;
    topItems: OpsActionCenterItem[];
  };
}

export interface OpsMultiTenantSummaryResponse {
  generatedAt: string;
  scope: {
    tenantId: string | null;
    allTenants: boolean;
  };
  totals: {
    tenants: number;
    criticalTenants: number;
    warningTenants: number;
    openAlerts: number;
    activeIncidents: number;
    failedRoutines: number;
    actionCenterItems: number;
  };
  tenants: OpsTenantSummary[];
}

export interface OpsActionCenterPanel {
  available: boolean;
  status: OpsSignalStatus;
  generatedAt?: string;
  total: number;
  items: OpsActionCenterItem[];
  unavailableReason?: string;
}

export interface OpsRunbookDto {
  id: string;
  generatedAt: string;
  template?: {
    id: number;
    version: number;
    tenantId: string | null;
    service: string | null;
    type: string | null;
  } | null;
  reference: {
    sourceType: 'ALERT' | 'INCIDENT' | 'JOURNAL';
    type?: string | null;
    id: number;
    tenantId: string;
    title: string;
    status: string;
    severity: string;
    occurredAt: string;
    source?: string;
    sourceReference?: string;
    relatedReference?: string | null;
    impactedService?: string | null;
  };
  requiredPermissions?: Array<{
    role: string;
    permission: 'operations:read' | 'operations:write' | 'audit:read';
    reason: string;
  }>;
  why: string;
  next: {
    why: string;
    whatToDoNext: string;
    priority: OpsActionCenterPriority;
    recommendedActionId: string | null;
    waitingOn: string[];
  };
  steps: Array<{
    order: number;
    title: string;
    why: string;
    instruction: string;
    requiredRole: string;
    requiredPermission: 'operations:read' | 'operations:write' | 'audit:read';
    checks?: Array<{
      id: string;
      label: string;
      expected: string;
      blocking: boolean;
    }>;
    evidence?: Array<{
      label: string;
      expected: string;
      requiredFor: string[];
    }>;
    actions?: Array<{
      id: string;
      label: string;
      method: 'GET' | 'POST' | 'PATCH';
      endpoint: string;
      requiredPermission: 'operations:read' | 'operations:write';
      enabled: boolean;
      why: string;
    }>;
  }>;
  checks: Array<{
    id: string;
    label: string;
    expected: string;
    blocking: boolean;
  }>;
  actions: Array<{
    id: string;
    label: string;
    method: 'GET' | 'POST' | 'PATCH';
    endpoint: string;
    requiredPermission: 'operations:read' | 'operations:write';
    enabled: boolean;
    why: string;
  }>;
  expectedEvidence: Array<{
    label: string;
    expected: string;
    requiredFor: string[];
  }>;
}

export interface OpsRoutineSurface {
  available: boolean;
  status: OpsSignalStatus;
  title: string;
  items: Array<{
    id: string;
    label: string;
    cadence: string;
    command: string;
    reportPattern: string;
  }>;
  unavailableReason?: string;
}

export interface OpsDirectionReportSurface {
  available: boolean;
  status: OpsSignalStatus;
  title: string;
  reports: OpsComplianceReport[];
  command: string;
  reportPattern: string;
  unavailableReason?: string;
}

export interface OpsComplianceReport {
  id: number;
  timestamp: string;
  actorId: number;
  entityId: string;
  blocked: boolean;
  affected: number;
  report?: {
    publishable: boolean;
    validatedShifts: number;
    publishedShifts: number;
    violations: unknown[];
    warnings: unknown[];
  };
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

interface OpsRawJournalEntry {
  id: number;
  tenantId: string;
  type: 'INCIDENT' | 'NOTIFICATION' | 'ACTION' | 'DECISION' | 'EVIDENCE';
  status: 'RECORDED' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  severity: OpsIncidentSeverity;
  title: string;
  description?: string | null;
  occurredAt: string;
  resolvedAt?: string | null;
  relatedReference?: string | null;
  evidenceUrl?: string | null;
  evidenceLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DeclareOpsIncidentInput {
  title: string;
  description: string;
  severity: OpsIncidentSeverity;
  impactedService?: string;
  evidenceUrl?: string;
  evidenceLabel?: string;
}

export interface AssignOpsActionCenterItemInput {
  assignedToId: number;
  comment?: string;
}

export interface CommentOpsActionCenterItemInput {
  comment: string;
}

export interface PrioritizeOpsActionCenterItemInput {
  priority: OpsActionCenterPriority;
  comment?: string;
}

export interface TransitionOpsActionCenterItemInput {
  status: OpsActionCenterStatus;
  comment?: string;
}

export interface ResolveOpsActionCenterItemInput {
  status?: Extract<OpsActionCenterStatus, 'RESOLVED' | 'CLOSED'>;
  summary: string;
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

const sloSignalStatus = (status?: OpsSloStatus): OpsSignalStatus => {
  if (status === 'PASSED') return 'OK';
  if (status === 'WARNING') return 'WARNING';
  if (status === 'FAILED') return 'CRITICAL';
  return 'UNKNOWN';
};

const formatPercent = (value: number) =>
  `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

const formatSloValue = (
  value: number | null,
  unit: OpsSloObjectiveThresholds['unit'],
) => {
  if (value === null) return 'Aucune donnée';
  if (unit === 'percent') return `${value}%`;
  if (unit === 'hours') return `${value}h`;
  return `${value}min`;
};

const formatSloTarget = (thresholds: OpsSloObjectiveThresholds) => {
  const comparator = thresholds.direction === 'lte' ? '<=' : '>=';
  return `${comparator} ${formatSloValue(thresholds.pass, thresholds.unit)}`;
};

const formatSloWarning = (thresholds: OpsSloObjectiveThresholds) => {
  const comparator = thresholds.direction === 'lte' ? '<=' : '>=';
  return `${comparator} ${formatSloValue(thresholds.warning, thresholds.unit)}`;
};

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

const safeRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const stringArrayFromMetadata = (
  metadata: Record<string, unknown>,
  key: string,
): string[] => {
  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const notificationStatusFromValue = (
  value: unknown,
): OpsNotificationJournalStatus => {
  const allowed: OpsNotificationJournalStatus[] = [
    'PENDING',
    'DRY_RUN',
    'SENT',
    'PARTIAL',
    'FAILED',
    'THROTTLED',
    'ACKNOWLEDGED',
    'UNKNOWN',
  ];
  return typeof value === 'string' &&
    allowed.includes(value as OpsNotificationJournalStatus)
    ? (value as OpsNotificationJournalStatus)
    : 'UNKNOWN';
};

const notificationStatusFromJournal = (
  entry: OpsRawJournalEntry,
  metadata: Record<string, unknown>,
): OpsNotificationJournalStatus => {
  const metadataStatus = notificationStatusFromValue(metadata.notificationStatus);
  if (metadataStatus !== 'UNKNOWN') return metadataStatus;
  if (entry.status === 'RESOLVED') return 'ACKNOWLEDGED';
  if (entry.status === 'OPEN' || entry.status === 'IN_PROGRESS') {
    return 'PENDING';
  }
  return 'UNKNOWN';
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

const buildNotificationEvidence = (
  journalEntries: OpsRawJournalEntry[] | null,
): OpsNotificationEvidence[] => {
  const entries = Array.isArray(journalEntries) ? journalEntries : [];

  return entries
    .filter((entry) => entry.type === 'NOTIFICATION')
    .map((entry) => {
      const metadata = safeRecord(entry.metadata);
      const proof = safeRecord(metadata.notificationProof);
      const acknowledgement = safeRecord(metadata.acknowledgement);
      const reminder = safeRecord(metadata.reminder);
      const policy = safeRecord(metadata.notificationPolicy);
      const quietHours = safeRecord(policy.quietHours);
      const attemptsValue = metadata.attempts;
      const attempts = Array.isArray(attemptsValue)
        ? attemptsValue.map((attempt) => {
            const record = safeRecord(attempt);
            return {
              channel:
                typeof record.channel === 'string' ? record.channel : 'N/A',
              status: notificationStatusFromValue(record.status),
              message:
                typeof record.message === 'string'
                  ? record.message
                  : undefined,
            };
          })
        : [];

      return {
        id: entry.id,
        title: entry.title,
        eventType:
          typeof metadata.eventType === 'string' ? metadata.eventType : 'N/A',
        status: notificationStatusFromJournal(entry, metadata),
        severity: entry.severity,
        occurredAt: entry.occurredAt,
        resolvedAt: entry.resolvedAt,
        relatedReference: entry.relatedReference,
        channels: stringArrayFromMetadata(metadata, 'channels'),
        attempts,
        proofId: typeof proof.proofId === 'string' ? proof.proofId : undefined,
        proofGeneratedAt:
          typeof proof.generatedAt === 'string' ? proof.generatedAt : undefined,
        acknowledgedAt:
          typeof acknowledgement.acknowledgedAt === 'string'
            ? acknowledgement.acknowledgedAt
            : undefined,
        acknowledgedById:
          typeof acknowledgement.acknowledgedById === 'number'
            ? acknowledgement.acknowledgedById
            : undefined,
        reminder: {
          isReminder: reminder.isReminder === true,
          reminderCount:
            typeof reminder.reminderCount === 'number'
              ? reminder.reminderCount
              : 0,
          nextReminderAt:
            typeof reminder.nextReminderAt === 'string'
              ? reminder.nextReminderAt
              : null,
        },
        escalationLevel:
          typeof metadata.escalationLevel === 'number'
            ? metadata.escalationLevel
            : undefined,
        quietHours:
          typeof quietHours.start === 'string' && typeof quietHours.end === 'string'
            ? {
                start: quietHours.start,
                end: quietHours.end,
                timezone:
                  typeof quietHours.timezone === 'string'
                    ? quietHours.timezone
                    : undefined,
              }
            : null,
        suppressedUntil:
          typeof metadata.suppressedUntil === 'string'
            ? metadata.suppressedUntil
            : null,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, 8);
};

const buildNotifications = ({
  alerts,
  incidents,
  journalEntries,
}: {
  alerts: OpsAlert[];
  incidents: OpsIncident[];
  journalEntries: OpsRawJournalEntry[] | null;
}): OpsNotificationState => {
  const pendingAlerts = alerts.filter(
    (alert) => alert.notificationStatus === 'PENDING',
  ).length;
  const escalatedIncidents = incidents.filter(
    (incident) => incident.notificationStatus === 'ESCALATED',
  ).length;
  const entries = buildNotificationEvidence(journalEntries);
  const openNotificationEntries = entries.filter((entry) =>
    ['PENDING', 'SENT', 'PARTIAL', 'FAILED', 'THROTTLED'].includes(
      entry.status,
    ),
  ).length;
  const acknowledgedNotifications = entries.filter(
    (entry) => entry.status === 'ACKNOWLEDGED' || entry.acknowledgedAt,
  ).length;
  const reminders = entries.filter(
    (entry) => entry.reminder.isReminder || entry.reminder.reminderCount > 0,
  ).length;
  const quietHoursDeferred = entries.filter(
    (entry) => entry.status === 'THROTTLED' && Boolean(entry.suppressedUntil),
  ).length;
  const failedNotifications = entries.filter(
    (entry) => entry.status === 'FAILED' || entry.status === 'PARTIAL',
  ).length;
  const lastActivityAt = [
    ...alerts.map((alert) => alert.detectedAt),
    ...incidents.map((incident) => incident.escalatedAt ?? incident.openedAt),
    ...entries.map((entry) => entry.acknowledgedAt ?? entry.occurredAt),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);

  if (escalatedIncidents > 0 || failedNotifications > 0) {
    return {
      status: 'CRITICAL',
      label:
        failedNotifications > 0
          ? 'Notifications en échec'
          : 'Escalade active',
      detail:
        failedNotifications > 0
          ? `${failedNotifications} notification${failedNotifications > 1 ? 's' : ''} en échec ou partielle${failedNotifications > 1 ? 's' : ''}.`
          : `${escalatedIncidents} incident${escalatedIncidents > 1 ? 's' : ''} escaladé${escalatedIncidents > 1 ? 's' : ''}.`,
      pendingAlerts: pendingAlerts + openNotificationEntries,
      escalatedIncidents,
      acknowledgedNotifications,
      reminders,
      quietHoursDeferred,
      failedNotifications,
      lastActivityAt,
      entries,
    };
  }

  if (pendingAlerts > 0 || openNotificationEntries > 0 || quietHoursDeferred > 0) {
    return {
      status: 'WARNING',
      label:
        quietHoursDeferred > 0
          ? 'Quiet hours actives'
          : 'Notifications à traiter',
      detail:
        quietHoursDeferred > 0
          ? `${quietHoursDeferred} notification${quietHoursDeferred > 1 ? 's' : ''} différée${quietHoursDeferred > 1 ? 's' : ''} par quiet hours.`
          : `${pendingAlerts + openNotificationEntries} notification${pendingAlerts + openNotificationEntries > 1 ? 's' : ''} non acquittée${pendingAlerts + openNotificationEntries > 1 ? 's' : ''}.`,
      pendingAlerts: pendingAlerts + openNotificationEntries,
      escalatedIncidents,
      acknowledgedNotifications,
      reminders,
      quietHoursDeferred,
      failedNotifications,
      lastActivityAt,
      entries,
    };
  }

  return {
    status:
      alerts.length > 0 || incidents.length > 0 || entries.length > 0
        ? 'OK'
        : 'UNKNOWN',
    label:
      alerts.length > 0 || incidents.length > 0 || entries.length > 0
        ? 'Suivi à jour'
        : 'Aucun signal',
    detail:
      alerts.length > 0 || incidents.length > 0 || entries.length > 0
        ? 'Les alertes ouvertes sont acquittées et aucun incident n’est escaladé.'
        : 'Aucune notification ou escalade active remontée.',
    pendingAlerts,
    escalatedIncidents,
    acknowledgedNotifications,
    reminders,
    quietHoursDeferred,
    failedNotifications,
    lastActivityAt,
    entries,
  };
};

const buildActionCenterPanel = (
  actionCenter: OpsActionCenterResponse | null,
): OpsActionCenterPanel => {
  if (!actionCenter || !Array.isArray(actionCenter.items)) {
    return {
      available: false,
      status: 'UNKNOWN',
      total: 0,
      items: [],
      unavailableReason: 'Endpoint action-center non exposé ou indisponible.',
    };
  }

  const hasCritical = actionCenter.items.some(
    (item) => item.priority === 'CRITICAL',
  );
  const hasHigh = actionCenter.items.some((item) => item.priority === 'HIGH');

  return {
    available: true,
    status: hasCritical ? 'CRITICAL' : hasHigh ? 'WARNING' : 'OK',
    generatedAt: actionCenter.generatedAt,
    total: actionCenter.total,
    items: actionCenter.items,
  };
};

const buildRoutineSurface = (): OpsRoutineSurface => ({
  available: false,
  status: 'UNKNOWN',
  title: 'Routines ops',
  unavailableReason:
    'Aucun endpoint de lancement routine exposé; commandes scripts disponibles côté exploitation.',
  items: [
    {
      id: 'ops-routines',
      label: 'Scheduler routines',
      cadence: 'Quotidien / hebdomadaire / escalade',
      command: 'npm run ops:routines -- --dry-run',
      reportPattern: 'prod-reports/ops-routine-scheduler-YYYY-MM-DD.{md,json}',
    },
    {
      id: 'ops-daily',
      label: 'Runbook quotidien',
      cadence: 'Quotidien',
      command: 'npm run ops:daily',
      reportPattern: 'preprod-reports/ops-daily-YYYY-MM-DD.{md,json}',
    },
    {
      id: 'ops-incident',
      label: 'Runbook incident',
      cadence: 'Sur incident',
      command: 'npm run ops:incident -- --incident-id INC-YYYY-NNN',
      reportPattern: 'preprod-reports/ops-incident-YYYY-MM-DD.{md,json}',
    },
  ],
});

const buildDirectionReportSurface = (
  reports: OpsComplianceReport[] | null,
): OpsDirectionReportSurface => ({
  available: Array.isArray(reports),
  status: !Array.isArray(reports)
    ? 'UNKNOWN'
    : reports.some((report) => report.blocked)
      ? 'WARNING'
      : 'OK',
  title: 'Rapports direction',
  reports: Array.isArray(reports) ? reports.slice(0, 5) : [],
  command: 'node scripts/management-business-report.mjs',
  reportPattern: 'business-reports/management-business-report-YYYY-MM-DD.{md,json}',
  unavailableReason: Array.isArray(reports)
    ? undefined
    : 'Aucun endpoint de rapport direction dédié exposé; rapports conformité et script direction référencés.',
});

const buildSla = ({
  slo,
  observability,
  readiness,
  backup,
  backupGate,
}: {
  slo: OpsSloResponse | null;
  observability: ProductionObservabilityHealth | null;
  readiness: ProductionDecision | null;
  backup: BackupMetrics | null;
  backupGate?: ProductionGateStatus;
}): OpsSlaIndicator[] => {
  if (slo && slo.objectives) {
    return Object.values(slo.objectives).map((objective) => ({
      id: objective.id,
      label: objective.label,
      target: formatSloTarget(objective.thresholds),
      current: formatSloValue(objective.actual.value, objective.actual.unit),
      status: sloSignalStatus(objective.status),
      detail: [
        `Seuil warning ${formatSloWarning(objective.thresholds)}`,
        `${objective.actual.sampleSize} échantillon`,
      ].join(' · '),
      reason: objective.reason,
      period: slo.period,
      sloStatus: objective.status,
    }));
  }

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
  journalEntries,
  actionCenter,
  complianceReports,
  slo,
}: {
  apiHealth: ReadyHealth | null;
  observability: ProductionObservabilityHealth | null;
  backupMetrics: BackupMetrics | null;
  readiness: ProductionDecision | null;
  history: ProductionSignoffHistory | null;
  alertFeed: OpsRawAgentAlert[] | null;
  operationalAlertFeed: OpsRawOperationalAlert[] | null;
  incidentFeed: OpsRawIncident[] | null;
  journalEntries: OpsRawJournalEntry[] | null;
  actionCenter: OpsActionCenterResponse | null;
  complianceReports: OpsComplianceReport[] | null;
  slo: OpsSloResponse | null;
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
  const notifications = buildNotifications({
    alerts,
    incidents,
    journalEntries,
  });
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
        detail:
          notifications.reminders > 0
            ? `${notifications.detail} ${notifications.reminders} rappel.`
            : notifications.detail,
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
      slo,
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
    actionCenter: buildActionCenterPanel(actionCenter),
    routines: buildRoutineSurface(),
    directionReports: buildDirectionReportSurface(complianceReports),
    gates,
    gatesSummary,
  };
};

export const opsApi = {
  multiTenantSummary: async (
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsMultiTenantSummaryResponse> => {
    const response = await api.get('/api/ops/multi-tenant-summary', {
      params,
    });
    return response.data;
  },
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
      journalEntries,
      actionCenter,
      complianceReports,
      slo,
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
        api
          .get<OpsRawJournalEntry[]>('/api/ops/journal', {
            params: {
              tenantId: params?.tenantId,
              type: 'NOTIFICATION',
              from: params?.from,
              to: params?.to,
              limit: 8,
            },
          })
          .then((response) => response.data),
        api
          .get<OpsActionCenterResponse>('/api/ops/action-center', {
            params: {
              tenantId: params?.tenantId,
              limit: 8,
            },
          })
          .then((response) => response.data),
        api
          .get<OpsComplianceReport[]>('/api/planning/compliance/reports', {
            params: {
              tenantId: params?.tenantId,
              from: params?.from,
              to: params?.to,
              limit: 5,
            },
          })
          .then((response) => response.data),
        api
          .get<OpsSloResponse>('/api/ops/slo', {
            params: {
              tenantId: params?.tenantId,
              from: params?.from,
              to: params?.to,
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
      journalEntries: settledValue(journalEntries),
      actionCenter: settledValue(actionCenter),
      complianceReports: settledValue(complianceReports),
      slo: settledValue(slo),
    });
  },
  actionCenter: async (
    params?: Pick<OpsDashboardParams, 'tenantId'> & {
      limit?: number;
      status?: OpsActionCenterStatus;
      type?: OpsActionCenterItemType;
    },
  ): Promise<OpsActionCenterResponse> => {
    const response = await api.get('/api/ops/action-center', { params });
    return response.data;
  },
  assignActionCenterItem: async (
    itemId: string,
    input: AssignOpsActionCenterItemInput,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsActionCenterItem> => {
    const response = await api.patch(
      `/api/ops/action-center/${encodeURIComponent(itemId)}/assign`,
      input,
      { params: { tenantId: params?.tenantId } },
    );
    return response.data;
  },
  commentActionCenterItem: async (
    itemId: string,
    input: CommentOpsActionCenterItemInput,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsActionCenterItem> => {
    const response = await api.post(
      `/api/ops/action-center/${encodeURIComponent(itemId)}/comments`,
      input,
      { params: { tenantId: params?.tenantId } },
    );
    return response.data;
  },
  prioritizeActionCenterItem: async (
    itemId: string,
    input: PrioritizeOpsActionCenterItemInput,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsActionCenterItem> => {
    const response = await api.patch(
      `/api/ops/action-center/${encodeURIComponent(itemId)}/priority`,
      input,
      { params: { tenantId: params?.tenantId } },
    );
    return response.data;
  },
  transitionActionCenterItem: async (
    itemId: string,
    input: TransitionOpsActionCenterItemInput,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsActionCenterItem> => {
    const response = await api.patch(
      `/api/ops/action-center/${encodeURIComponent(itemId)}/status`,
      input,
      { params: { tenantId: params?.tenantId } },
    );
    return response.data;
  },
  resolveActionCenterItem: async (
    itemId: string,
    input: ResolveOpsActionCenterItemInput,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsActionCenterItem> => {
    const response = await api.patch(
      `/api/ops/action-center/${encodeURIComponent(itemId)}/resolve`,
      input,
      { params: { tenantId: params?.tenantId } },
    );
    return response.data;
  },
  getRunbook: async (
    reference: Pick<OpsActionCenterSourceReference, 'entity' | 'id'>,
    params?: Pick<OpsDashboardParams, 'tenantId'>,
  ): Promise<OpsRunbookDto> => {
    const endpointByEntity: Record<OpsActionCenterSourceReference['entity'], string> = {
      OperationalAlert: `/api/ops/alerts/${reference.id}/runbook`,
      OperationIncident: `/api/ops/incidents/${reference.id}/runbook`,
      OperationsJournalEntry: `/api/ops/journal/${reference.id}/runbook`,
    };
    const response = await api.get(endpointByEntity[reference.entity], {
      params: {
        tenantId: params?.tenantId,
      },
    });
    return response.data;
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
