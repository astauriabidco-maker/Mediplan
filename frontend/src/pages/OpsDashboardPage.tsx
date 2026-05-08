import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  DatabaseBackup,
  ExternalLink,
  Flag,
  Gauge,
  History,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  ServerCog,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import React from 'react';
import {
  opsApi,
  OpsActionCenterItem,
  OpsActionCenterPriority,
  OpsActionCenterStatus,
  OpsAlert,
  OpsDashboardSummary,
  OpsIncident,
  OpsMultiTenantSummaryResponse,
  OpsRunbookDto,
  OpsSignalStatus,
  OpsStatus,
  OpsTenantOperationalStatus,
} from '../api/ops.api';
import { opsQueryKeys, queryCacheProfiles } from '../api/queryKeys';
import { ApiErrorState, EmptyState, PageSkeleton } from '../components/UIStates';
import { useAuth } from '../store/useAuth';
import { cn } from '../utils/cn';

const statusTone: Record<OpsSignalStatus | OpsStatus, string> = {
  OK: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  OPERATIONAL: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  WARNING: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  DEGRADED: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  CRITICAL: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
  UNKNOWN: 'border-slate-700 bg-slate-900 text-slate-300',
};

const statusLabel: Record<OpsSignalStatus, string> = {
  OK: 'OK',
  WARNING: 'À surveiller',
  CRITICAL: 'Critique',
  UNKNOWN: 'Inconnu',
};

const operationalStatusLabel: Record<OpsStatus, string> = {
  OPERATIONAL: 'Opérationnel',
  DEGRADED: 'Dégradé',
  CRITICAL: 'Critique',
  UNKNOWN: 'Inconnu',
};

const priorityLabel: Record<OpsActionCenterPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const actionCenterStatusLabel: Record<OpsActionCenterStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  ESCALATED: 'Escaladé',
  WAITING_EVIDENCE: 'Preuve attendue',
  WAITING_DECISION: 'Décision attendue',
  RESOLVED: 'Résolu',
  CLOSED: 'Clos',
};

const severityLabel: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

const technicalStatusLabel: Record<string, string> = {
  UP: 'Disponible',
  DOWN: 'Indisponible',
  HEALTHY: 'Saine',
  DEGRADED: 'Dégradée',
  PASSED: 'Validé',
  FAILED: 'Échec',
  UNKNOWN: 'Inconnu',
  PROD_GO: 'Go prod',
  PROD_NO_GO: 'No go prod',
  PENDING: 'En attente',
  ACKNOWLEDGED: 'Acquittée',
  SENT: 'Envoyée',
  DRY_RUN: 'Simulation',
  PARTIAL: 'Partielle',
  THROTTLED: 'Différée',
  ESCALATED: 'Escaladé',
};

const priorityWeight: Record<OpsActionCenterPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

const priorityStatus = (priority: OpsActionCenterItem['priority']) => {
  if (priority === 'CRITICAL' || priority === 'HIGH') return 'CRITICAL';
  if (priority === 'MEDIUM') return 'WARNING';
  return 'OK';
};

const actionCenterStatusTone = (
  status: OpsActionCenterStatus,
  priority: OpsActionCenterPriority,
): OpsSignalStatus => {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'OK';
  if (status === 'WAITING_EVIDENCE' || status === 'WAITING_DECISION') {
    return 'WARNING';
  }
  return priorityStatus(priority);
};

const tenantStatusToSignal = (
  status: OpsTenantOperationalStatus,
): OpsSignalStatus => {
  if (status === 'OK') return 'OK';
  if (status === 'WARNING') return 'WARNING';
  return 'CRITICAL';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Non daté';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const POLLING_INTERVALS = [15_000, 30_000, 60_000] as const;
const ACTION_CENTER_PRIORITIES: OpsActionCenterPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];
const ACTION_CENTER_STATUSES: OpsActionCenterStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'WAITING_EVIDENCE',
  'WAITING_DECISION',
];

const formatInterval = (value: number) => `${value / 1000}s`;

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count > 1 ? plural : singular}`;

const readableStatus = (status?: string | null) =>
  status ? technicalStatusLabel[status] ?? status : 'Non renseigné';

const getOpsFocus = (summary: OpsDashboardSummary) => {
  const action = [...summary.actionCenter.items].sort(
    (left, right) =>
      priorityWeight[right.priority] - priorityWeight[left.priority],
  )[0];

  if (action) {
    return `Priorité: ${action.title}`;
  }

  const alert = summary.alerts[0];
  if (alert) {
    return `Alerte: ${alert.title}`;
  }

  const anomaly = summary.anomalies[0];
  if (anomaly) {
    return `Signal: ${anomaly.title}`;
  }

  return 'Aucun blocage actif';
};

const notificationStatusTone = (status: string): OpsSignalStatus => {
  if (status === 'ACKNOWLEDGED' || status === 'SENT' || status === 'DRY_RUN') {
    return 'OK';
  }
  if (status === 'FAILED' || status === 'PARTIAL') return 'CRITICAL';
  if (status === 'THROTTLED' || status === 'PENDING') return 'WARNING';
  return 'UNKNOWN';
};

type RunbookReferenceRequest = {
  reference: { entity: 'OperationalAlert' | 'OperationIncident' | 'OperationsJournalEntry'; id: number };
  origin: 'alerte' | 'incident' | 'action-center';
};

const buildDefaultPeriod = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const StatusBadge = ({
  status,
  label,
}: {
  status: OpsSignalStatus | OpsStatus;
  label?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-black',
      statusTone[status],
    )}
  >
    {status === 'OK' || status === 'OPERATIONAL' ? (
      <CheckCircle2 size={13} />
    ) : (
      <AlertTriangle size={13} />
    )}
    {label ?? status}
  </span>
);

const SectionHeader = ({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {meta && (
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {meta}
        </span>
      )}
      {children}
    </div>
  </div>
);

const MetricTile = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: OpsSignalStatus;
}) => (
  <div
    className={cn(
      'rounded-md border border-slate-800 bg-slate-900 p-3',
      tone === 'CRITICAL' && 'border-rose-500/30 bg-rose-500/10',
      tone === 'WARNING' && 'border-amber-500/30 bg-amber-500/10',
      tone === 'OK' && 'border-emerald-500/20',
    )}
  >
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-sm font-black text-white">{value}</p>
    {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
  </div>
);

const KpiStrip = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
    {summary.kpis.map((kpi) => (
      <article
        key={kpi.key}
        className={cn(
          'rounded-lg border border-slate-800 bg-slate-900 p-4',
          kpi.status === 'CRITICAL' && 'border-rose-500/40 bg-rose-500/10',
          kpi.status === 'WARNING' && 'border-amber-500/30',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {kpi.label}
          </p>
          <StatusBadge status={kpi.status} label={statusLabel[kpi.status]} />
        </div>
        <p className="mt-3 text-2xl font-black text-white">{kpi.value}</p>
        <p className="mt-1 text-sm text-slate-400">{kpi.detail}</p>
      </article>
    ))}
  </section>
);

const MultiTenantCockpit = ({
  summary,
  isLoading,
  isError,
}: {
  summary?: OpsMultiTenantSummaryResponse;
  isLoading: boolean;
  isError: boolean;
}) => (
  <section className="space-y-4">
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <ServerCog size={18} className="text-cyan-300" />
          <h2 className="text-lg font-bold text-white">
            Cockpit multi-tenant
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {summary
            ? `${summary.totals.tenants} tenant${summary.totals.tenants > 1 ? 's' : ''} · ${formatDateTime(summary.generatedAt)}`
            : 'Synthèse plateforme en cours de chargement.'}
        </p>
      </div>
      {summary && (
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            status={summary.totals.criticalTenants > 0 ? 'CRITICAL' : 'OK'}
            label={countLabel(summary.totals.criticalTenants, 'critique')}
          />
          <StatusBadge
            status={summary.totals.warningTenants > 0 ? 'WARNING' : 'OK'}
            label={countLabel(
              summary.totals.warningTenants,
              'tenant à surveiller',
              'tenants à surveiller',
            )}
          />
        </div>
      )}
    </div>

    {isLoading ? (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-lg border border-slate-800 bg-slate-900"
          />
        ))}
      </div>
    ) : isError ? (
      <EmptyState
        title="Cockpit multi-tenant indisponible"
        message="Le résumé plateforme ne répond pas pour le périmètre courant."
        icon={AlertTriangle}
        tone="amber"
        compact
      />
    ) : !summary || summary.tenants.length === 0 ? (
      <EmptyState
        title="Aucun tenant actif"
        message="Le cockpit multi-tenant ne remonte aucun périmètre opérationnel."
        icon={CheckCircle2}
        tone="emerald"
        compact
      />
    ) : (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Alertes critiques
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {summary.tenants.reduce(
                (total, tenant) => total + tenant.alerts.critical,
                0,
              )}
            </p>
          </article>
          <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Incidents actifs
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {summary.totals.activeIncidents}
            </p>
          </article>
          <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Routines échouées
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {summary.totals.failedRoutines}
            </p>
          </article>
          <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Action-center
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {summary.totals.actionCenterItems}
            </p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {summary.tenants.map((tenant) => (
            <article
              key={tenant.tenantId}
              className="rounded-lg border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-white">{tenant.tenantId}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Dernier backup:{' '}
                    {tenant.lastBackup
                      ? `${tenant.lastBackup.routine} · ${formatDateTime(
                          tenant.lastBackup.finishedAt ??
                            tenant.lastBackup.startedAt,
                        )}`
                      : 'Aucun backup connu'}
                  </p>
                </div>
                <StatusBadge
                  status={tenantStatusToSignal(tenant.status)}
                  label={statusLabel[tenantStatusToSignal(tenant.status)]}
                />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-slate-950 px-3 py-2">
                  <dt className="text-xs text-slate-500">Alertes critiques</dt>
                  <dd className="mt-1 text-sm font-black text-white">
                    {tenant.alerts.critical}/{tenant.alerts.open}
                  </dd>
                </div>
                <div className="rounded-md bg-slate-950 px-3 py-2">
                  <dt className="text-xs text-slate-500">Incidents actifs</dt>
                  <dd className="mt-1 text-sm font-black text-white">
                    {tenant.incidents.active}
                  </dd>
                </div>
                <div className="rounded-md bg-slate-950 px-3 py-2">
                  <dt className="text-xs text-slate-500">Routines échouées</dt>
                  <dd className="mt-1 text-sm font-black text-white">
                    {tenant.routines.failed}
                  </dd>
                </div>
                <div className="rounded-md bg-slate-950 px-3 py-2">
                  <dt className="text-xs text-slate-500">Action-center</dt>
                  <dd className="mt-1 text-sm font-black text-white">
                    {tenant.actionCenter.total}
                  </dd>
                </div>
              </dl>

              {tenant.lastBackup?.error && (
                <p className="mt-3 text-xs text-rose-200">
                  Backup: {tenant.lastBackup.error}
                </p>
              )}
              {tenant.routines.lastFailedAt && (
                <p className="mt-3 text-xs text-slate-500">
                  Dernière routine échouée:{' '}
                  {formatDateTime(tenant.routines.lastFailedAt)}
                </p>
              )}
            </article>
          ))}
        </div>
      </>
    )}
  </section>
);

const NotificationPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-center gap-2">
        <BellRing size={18} className="text-cyan-300" />
        <h2 className="text-lg font-bold text-white">
          Notifications et escalade
        </h2>
      </div>
      <StatusBadge
        status={summary.notifications.status}
        label={statusLabel[summary.notifications.status]}
      />
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
      {[
        ['État', summary.notifications.label],
        ['À traiter', String(summary.notifications.pendingAlerts)],
        ['Acquittées', String(summary.notifications.acknowledgedNotifications)],
        ['Rappels', String(summary.notifications.reminders)],
        ['Heures calmes', String(summary.notifications.quietHoursDeferred)],
        ['Escalades', String(summary.notifications.escalatedIncidents)],
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border border-slate-800 bg-slate-900 p-3"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-sm font-black text-white">{value}</p>
        </div>
      ))}
    </div>
    <p className="mt-3 text-sm text-slate-400">
      {summary.notifications.detail}
    </p>
    <p className="mt-1 text-xs text-slate-500">
      Dernier signal: {formatDateTime(summary.notifications.lastActivityAt)}
    </p>

    {summary.notifications.entries.length === 0 ? (
      <p className="mt-4 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-500">
        Aucune preuve de notification récente dans le journal ops.
      </p>
    ) : (
      <ol className="mt-4 space-y-3">
        {summary.notifications.entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold text-white">{entry.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Journal #{entry.id} · {entry.eventType} ·{' '}
                  {formatDateTime(entry.occurredAt)}
                </p>
              </div>
              <StatusBadge
                status={notificationStatusTone(entry.status)}
                label={readableStatus(entry.status)}
              />
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
              <div>
                <dt className="font-bold uppercase tracking-wide text-slate-500">
                  Preuve
                </dt>
                <dd className="mt-1 break-all text-slate-300">
                  {entry.proofId ?? 'Non renseignée'}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-slate-500">
                  Canaux
                </dt>
                <dd className="mt-1 text-slate-300">
                  {entry.channels.length > 0
                    ? entry.channels.join(' · ')
                    : 'Non renseignés'}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-slate-500">
                  Acquittement
                </dt>
                <dd className="mt-1 text-slate-300">
                  {entry.acknowledgedAt
                    ? `${formatDateTime(entry.acknowledgedAt)} · acteur ${entry.acknowledgedById ?? 'non renseigné'}`
                    : 'En attente'}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-slate-500">
                  Rappel / escalade
                </dt>
                <dd className="mt-1 text-slate-300">
                  {entry.reminder.reminderCount > 0 || entry.reminder.isReminder
                    ? `Rappel ${entry.reminder.reminderCount}`
                    : 'Aucun rappel'}{' '}
                  · Niveau {entry.escalationLevel ?? 'non renseigné'}
                </dd>
              </div>
            </dl>

            {(entry.quietHours || entry.suppressedUntil) && (
              <p className="mt-3 text-xs text-amber-200">
                Heures calmes:{' '}
                {entry.quietHours
                  ? `${entry.quietHours.start}-${entry.quietHours.end}`
                  : 'config non détaillée'}{' '}
                · reprise {formatDateTime(entry.suppressedUntil)}
              </p>
            )}

            {entry.attempts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.attempts.slice(0, 4).map((attempt, index) => (
                  <span
                    key={`${entry.id}-${attempt.channel}-${index}`}
                    className="rounded bg-slate-950 px-2 py-1 text-xs text-slate-300"
                  >
                    {attempt.channel}: {attempt.status}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    )}
  </section>
);

const AlertActionButton = ({
  children,
  disabled,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {icon}
    {children}
  </button>
);

const runbookReferenceFromAlert = (
  alert: OpsAlert,
): RunbookReferenceRequest | null =>
  alert.sourceKind === 'OPERATIONAL_ALERT'
    ? {
        reference: { entity: 'OperationalAlert', id: alert.id },
        origin: 'alerte',
      }
    : null;

const runbookReferenceFromIncident = (
  incident: OpsIncident,
): RunbookReferenceRequest | null =>
  incident.sourceIncidentId
    ? {
        reference: {
          entity: 'OperationIncident',
          id: incident.sourceIncidentId,
        },
        origin: 'incident',
      }
    : null;

const AlertsPanel = ({
  summary,
  isMutating,
  onResolve,
  onRerunCheck,
  onOpenIncident,
  onOpenRunbook,
}: {
  summary: OpsDashboardSummary;
  isMutating: boolean;
  onResolve: (alert: OpsAlert) => void;
  onRerunCheck: (alert: OpsAlert) => void;
  onOpenIncident: (alert: OpsAlert) => void;
  onOpenRunbook: (request: RunbookReferenceRequest) => void;
}) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-300" />
        <h2 className="text-lg font-bold text-white">Alertes ouvertes</h2>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {countLabel(summary.alerts.length, 'alerte ouverte', 'alertes ouvertes')}
      </span>
    </div>
    {summary.alerts.length === 0 ? (
      <EmptyState
        title="Aucune alerte ouverte"
        message="Le flux d'alertes opérationnelles ne remonte aucun élément actif."
        icon={CheckCircle2}
        tone="emerald"
        compact
      />
    ) : (
      <ol className="space-y-3">
        {summary.alerts.map((alert) => {
            const runbookRequest = runbookReferenceFromAlert(alert);
            return (
              <li
                key={`${alert.sourceKind}-${alert.id}`}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-bold text-white">{alert.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{alert.detail}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {alert.ruleCode ?? alert.type ?? alert.source} ·{' '}
                      {formatDateTime(alert.detectedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <StatusBadge
                      status={
                        alert.severity === 'HIGH'
                          ? 'CRITICAL'
                          : alert.severity === 'MEDIUM'
                            ? 'WARNING'
                            : 'OK'
                      }
                      label={severityLabel[alert.severity] ?? alert.severity}
                    />
                    <StatusBadge
                      status={
                        alert.notificationStatus === 'PENDING' ? 'WARNING' : 'OK'
                      }
                      label={
                        alert.notificationStatus === 'PENDING'
                          ? 'Notification'
                          : 'Acquittée'
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {runbookRequest && (
                    <AlertActionButton
                      disabled={isMutating}
                      onClick={() => onOpenRunbook(runbookRequest)}
                    >
                      <ScrollText size={14} />
                      Ouvrir runbook
                    </AlertActionButton>
                  )}
                  <AlertActionButton
                    disabled={isMutating || !alert.actions.canResolve}
                    onClick={() => onResolve(alert)}
                  >
                    <CheckCircle2 size={14} />
                    Résoudre alerte
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating || !alert.actions.canRerunCheck}
                    onClick={() => onRerunCheck(alert)}
                  >
                    <RefreshCw size={14} />
                    Relancer contrôle
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating || !alert.actions.canOpenIncident}
                    onClick={() => onOpenIncident(alert)}
                  >
                    <Flag size={14} />
                    Ouvrir incident
                  </AlertActionButton>
                </div>
              </li>
            );
          })}
      </ol>
    )}
  </section>
);

const RunbookPanel = ({
  runbook,
  isLoading,
  error,
}: {
  runbook?: OpsRunbookDto;
  isLoading: boolean;
  error: boolean;
}) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex items-center gap-2">
      <ScrollText size={18} className="text-cyan-300" />
      <h2 className="text-lg font-bold text-white">Runbook ouvert</h2>
    </div>
    {isLoading ? (
      <p className="mt-4 text-sm text-slate-400">Chargement du runbook...</p>
    ) : error ? (
      <p className="mt-4 text-sm text-amber-200">
        Runbook indisponible pour cette référence.
      </p>
    ) : runbook ? (
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">
                {runbook.reference.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {runbook.reference.sourceType} #{runbook.reference.id} ·{' '}
                {formatDateTime(runbook.generatedAt)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Source: {runbook.reference.source ?? runbook.reference.sourceType}
                {runbook.reference.sourceReference
                  ? ` · ${runbook.reference.sourceReference}`
                  : ''}
              </p>
              {runbook.template && (
                <p className="mt-1 text-xs text-slate-500">
                  Template #{runbook.template.id} · version{' '}
                  {runbook.template.version}
                  {runbook.template.service
                    ? ` · service ${runbook.template.service}`
                    : ''}
                  {runbook.template.type ? ` · ${runbook.template.type}` : ''}
                </p>
              )}
            </div>
            <StatusBadge
              status={priorityStatus(runbook.next.priority)}
              label={runbook.next.priority}
            />
          </div>
          <p className="mt-3 text-sm text-slate-400">{runbook.why}</p>
          <p className="mt-3 text-sm text-slate-300">
            {runbook.next.whatToDoNext}
          </p>
          <p className="mt-1 text-xs text-slate-500">{runbook.next.why}</p>
          {runbook.next.waitingOn.length > 0 && (
            <p className="mt-2 text-xs text-amber-200">
              En attente: {runbook.next.waitingOn.join(' · ')}
            </p>
          )}
        </div>

        {runbook.requiredPermissions &&
          runbook.requiredPermissions.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                Permissions
              </h3>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {runbook.requiredPermissions.map((permission) => (
                  <div
                    key={`${permission.role}-${permission.permission}`}
                    className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
                  >
                    <p className="text-xs font-bold text-white">
                      {permission.role} · {permission.permission}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {permission.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        <ol className="space-y-2">
          {runbook.steps.map((step) => (
            <li
              key={step.order}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
            >
              <p className="text-sm font-bold text-white">
                {step.order}. {step.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {step.requiredRole} · {step.requiredPermission}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {step.instruction}
              </p>
              <p className="mt-1 text-xs text-slate-500">{step.why}</p>
              {step.checks && step.checks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {step.checks.map((check) => (
                    <li key={check.id} className="text-xs text-slate-400">
                      Contrôle: {check.label} · attendu: {check.expected}
                      {check.blocking ? ' · bloquant' : ''}
                    </li>
                  ))}
                </ul>
              )}
              {step.evidence && step.evidence.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {step.evidence.map((evidence) => (
                    <li
                      key={`${step.order}-${evidence.label}`}
                      className="text-xs text-slate-400"
                    >
                      Preuve: {evidence.label} · {evidence.expected}
                    </li>
                  ))}
                </ul>
              )}
              {step.actions && step.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {step.actions.map((action) => (
                    <span
                      key={action.id}
                      className={cn(
                        'rounded border px-2 py-1 text-xs font-bold',
                        action.enabled
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
                          : 'border-slate-700 bg-slate-950 text-slate-500',
                      )}
                    >
                      {action.method} {action.label}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>

        {runbook.checks.length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              Contrôles attendus
            </h3>
            <ul className="mt-2 space-y-2">
              {runbook.checks.map((check) => (
                <li
                  key={check.id}
                  className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400"
                >
                  <span className="font-bold text-white">{check.label}</span> ·{' '}
                  {check.expected}
                  {check.blocking ? ' · bloquant' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {runbook.expectedEvidence.length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              Preuves attendues
            </h3>
            <ul className="mt-2 space-y-2">
              {runbook.expectedEvidence.map((evidence) => (
                <li
                  key={evidence.label}
                  className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400"
                >
                  <span className="font-bold text-white">{evidence.label}</span>{' '}
                  · {evidence.expected}
                  {evidence.requiredFor.length > 0
                    ? ` · requis pour ${evidence.requiredFor.join(', ')}`
                    : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {runbook.actions.length > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
              Actions
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {runbook.actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-white">
                      {action.method} {action.label}
                    </p>
                    <span className="text-xs font-bold text-slate-500">
                      {action.enabled ? 'Permise' : 'Bloquée'}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-slate-500">
                    {action.endpoint}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {action.requiredPermission} · {action.why}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : (
      <p className="mt-4 text-sm text-slate-500">
        Sélectionnez une alerte, un incident ou une action pour charger le
        runbook généré.
      </p>
    )}
  </section>
);

const ActionCenterPanel = ({
  summary,
  isMutating,
  mutatingItemId,
  onOpenRunbook,
  onAssign,
  onComment,
  onPrioritize,
  onTransition,
  onResolve,
}: {
  summary: OpsDashboardSummary;
  isMutating: boolean;
  mutatingItemId?: string | null;
  onOpenRunbook: (request: RunbookReferenceRequest) => void;
  onAssign: (item: OpsActionCenterItem, assignedToId: number, comment?: string) => void;
  onComment: (item: OpsActionCenterItem, comment: string) => void;
  onPrioritize: (
    item: OpsActionCenterItem,
    priority: OpsActionCenterPriority,
    comment?: string,
  ) => void;
  onTransition: (
    item: OpsActionCenterItem,
    status: OpsActionCenterStatus,
    comment?: string,
  ) => void;
  onResolve: (
    item: OpsActionCenterItem,
    input: {
      status: 'RESOLVED' | 'CLOSED';
      summary: string;
      evidenceUrl?: string;
      evidenceLabel?: string;
    },
  ) => void;
}) => {
  type ActionDraft = {
    assignedToId: string;
    comment: string;
    priority: OpsActionCenterPriority;
    status: OpsActionCenterStatus;
    resolveStatus: 'RESOLVED' | 'CLOSED';
    summary: string;
    evidenceUrl: string;
    evidenceLabel: string;
    error?: string;
  };

  const [drafts, setDrafts] = React.useState<Record<string, ActionDraft>>({});

  const defaultDraft = React.useCallback(
    (item: OpsActionCenterItem): ActionDraft => ({
      assignedToId: item.workflow?.assignedToId?.toString() ?? '',
      comment: '',
      priority: item.priority,
      status: ACTION_CENTER_STATUSES.includes(item.status)
        ? item.status
        : 'IN_PROGRESS',
      resolveStatus: 'RESOLVED',
      summary: '',
      evidenceUrl: '',
      evidenceLabel: '',
    }),
    [],
  );

  const draftFor = React.useCallback(
    (item: OpsActionCenterItem) => drafts[item.id] ?? defaultDraft(item),
    [defaultDraft, drafts],
  );

  const patchDraft = (
    item: OpsActionCenterItem,
    patch: Partial<ActionDraft>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [item.id]: { ...(current[item.id] ?? defaultDraft(item)), ...patch },
    }));
  };

  const submitAssign = (item: OpsActionCenterItem) => {
    const draft = draftFor(item);
    const assignedToId = Number(draft.assignedToId);
    if (!Number.isInteger(assignedToId) || assignedToId < 1) {
      patchDraft(item, {
        error: 'Assignation: indiquez un ID utilisateur positif.',
      });
      return;
    }
    patchDraft(item, { error: undefined });
    onAssign(item, assignedToId, draft.comment.trim() || undefined);
  };

  const submitComment = (item: OpsActionCenterItem) => {
    const draft = draftFor(item);
    if (!draft.comment.trim()) {
      patchDraft(item, { error: 'Commentaire requis.' });
      return;
    }
    patchDraft(item, { error: undefined });
    onComment(item, draft.comment.trim());
  };

  const submitResolve = (item: OpsActionCenterItem) => {
    const draft = draftFor(item);
    if (!draft.summary.trim()) {
      patchDraft(item, { error: 'Résumé de résolution requis.' });
      return;
    }
    if (draft.evidenceUrl.trim()) {
      try {
        new URL(draft.evidenceUrl.trim());
      } catch {
        patchDraft(item, { error: 'URL de preuve invalide.' });
        return;
      }
    }
    patchDraft(item, { error: undefined });
    onResolve(item, {
      status: draft.resolveStatus,
      summary: draft.summary.trim(),
      evidenceUrl: draft.evidenceUrl.trim() || undefined,
      evidenceLabel: draft.evidenceLabel.trim() || undefined,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ServerCog size={18} className="text-cyan-300" />
          <h2 className="text-lg font-bold text-white">Action-center</h2>
        </div>
        <StatusBadge
          status={summary.actionCenter.status}
          label={
            summary.actionCenter.available
              ? countLabel(summary.actionCenter.total, 'action')
              : 'Indisponible'
          }
        />
      </div>
      {!summary.actionCenter.available ? (
        <EmptyState
          title="Action-center non exposé"
          message={
            summary.actionCenter.unavailableReason ??
            'Le flux action-center ne répond pas pour ce tenant.'
          }
          icon={AlertTriangle}
          tone="amber"
          compact
        />
      ) : summary.actionCenter.items.length === 0 ? (
        <EmptyState
          title="Aucune action prioritaire"
          message="L’action-center ne remonte aucune intervention active."
          icon={CheckCircle2}
          tone="emerald"
          compact
        />
      ) : (
        <ol className="space-y-3">
          {summary.actionCenter.items.map((item) => {
            const draft = draftFor(item);
            const itemBusy = isMutating && mutatingItemId === item.id;

            return (
              <li
                key={item.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.type} · {item.sourceReference.reference} ·{' '}
                      {formatDateTime(item.timestamps.occurredAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <StatusBadge
                      status={priorityStatus(item.priority)}
                      label={priorityLabel[item.priority]}
                    />
                    <StatusBadge
                      status={actionCenterStatusTone(item.status, item.priority)}
                      label={actionCenterStatusLabel[item.status]}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-3">
                  <p>Assigné: {item.workflow?.assignedToId ?? 'Non assigné'}</p>
                  <p>Commentaires: {item.workflow?.commentsCount ?? 0}</p>
                  <p>MAJ: {formatDateTime(item.workflow?.updatedAt)}</p>
                </div>
                {item.workflow?.lastComment && (
                  <p className="mt-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                    Dernier commentaire: {item.workflow.lastComment.comment}
                  </p>
                )}
                {item.requiredEvidence.length > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Preuves: {item.requiredEvidence.slice(0, 2).join(' · ')}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Assignation
                    <input
                      value={draft.assignedToId}
                      onChange={(event) =>
                        patchDraft(item, {
                          assignedToId: event.target.value,
                          error: undefined,
                        })
                      }
                      inputMode="numeric"
                      placeholder="ID utilisateur"
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Commentaire
                    <input
                      value={draft.comment}
                      onChange={(event) =>
                        patchDraft(item, {
                          comment: event.target.value,
                          error: undefined,
                        })
                      }
                      maxLength={2000}
                      placeholder="Note opérateur"
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Priorité
                    <select
                      value={draft.priority}
                      onChange={(event) =>
                        patchDraft(item, {
                          priority: event.target.value as OpsActionCenterPriority,
                          error: undefined,
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    >
                      {ACTION_CENTER_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priorityLabel[priority]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Statut
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        patchDraft(item, {
                          status: event.target.value as OpsActionCenterStatus,
                          error: undefined,
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    >
                      {ACTION_CENTER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {actionCenterStatusLabel[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Clôture
                    <select
                      value={draft.resolveStatus}
                      onChange={(event) =>
                        patchDraft(item, {
                          resolveStatus: event.target.value as 'RESOLVED' | 'CLOSED',
                          error: undefined,
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    >
                      <option value="RESOLVED">
                        {actionCenterStatusLabel.RESOLVED}
                      </option>
                      <option value="CLOSED">
                        {actionCenterStatusLabel.CLOSED}
                      </option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Résumé
                    <input
                      value={draft.summary}
                      onChange={(event) =>
                        patchDraft(item, {
                          summary: event.target.value,
                          error: undefined,
                        })
                      }
                      maxLength={2000}
                      placeholder="Retour nominal confirmé"
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Preuve URL
                    <input
                      value={draft.evidenceUrl}
                      onChange={(event) =>
                        patchDraft(item, {
                          evidenceUrl: event.target.value,
                          error: undefined,
                        })
                      }
                      maxLength={500}
                      placeholder="https://..."
                      className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Libellé preuve
                  <input
                    value={draft.evidenceLabel}
                    onChange={(event) =>
                      patchDraft(item, {
                        evidenceLabel: event.target.value,
                        error: undefined,
                      })
                    }
                    maxLength={160}
                    placeholder="Capture monitoring"
                    className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  />
                </label>
                {draft.error && (
                  <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">
                    {draft.error}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <AlertActionButton
                    disabled={isMutating}
                    icon={<ScrollText size={14} />}
                    onClick={() =>
                      onOpenRunbook({
                        reference: item.sourceReference,
                        origin: 'action-center',
                      })
                    }
                  >
                    Runbook
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating}
                    icon={<UserCheck size={14} />}
                    onClick={() => submitAssign(item)}
                  >
                    Assigner
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating}
                    icon={<MessageSquare size={14} />}
                    onClick={() => submitComment(item)}
                  >
                    Commenter
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating}
                    icon={<Flag size={14} />}
                    onClick={() =>
                      onPrioritize(
                        item,
                        draft.priority,
                        draft.comment.trim() || undefined,
                      )
                    }
                  >
                    Priorité
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating}
                    icon={<RefreshCw size={14} />}
                    onClick={() =>
                      onTransition(
                        item,
                        draft.status,
                        draft.comment.trim() || undefined,
                      )
                    }
                  >
                    Statut
                  </AlertActionButton>
                  <AlertActionButton
                    disabled={isMutating}
                    icon={<CheckCircle2 size={14} />}
                    onClick={() => submitResolve(item)}
                  >
                    Résoudre
                  </AlertActionButton>
                  {itemBusy && (
                    <span
                      className="inline-flex min-h-8 items-center text-xs font-bold text-cyan-200"
                      role="status"
                    >
                      Mise à jour en cours...
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

const SlaPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <Gauge size={18} className="text-cyan-300" />
      <h2 className="text-lg font-bold text-white">SLO / SLA exploitation</h2>
    </div>
    {summary.sla.length === 0 ? (
      <EmptyState
        title="Aucun SLO actif"
        message="Aucun indicateur SLO ou SLA n'est exposé sur la période."
        icon={CheckCircle2}
        tone="emerald"
        compact
      />
    ) : (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {summary.sla.map((sla) => (
          <article
            key={sla.id}
            className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">{sla.label}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Seuils: cible {sla.target} · {sla.detail}
                </p>
              </div>
              <StatusBadge
                status={sla.status}
                label={readableStatus(sla.sloStatus ?? statusLabel[sla.status])}
              />
            </div>
            <p className="mt-3 text-xl font-black text-white">{sla.current}</p>
            {sla.period && (
              <p className="mt-1 text-xs text-slate-500">
                Période: {formatDateTime(sla.period.from)} →{' '}
                {formatDateTime(sla.period.to)}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-400">
              {sla.reason ?? sla.detail}
            </p>
          </article>
        ))}
      </div>
    )}
  </section>
);

const AnomaliesPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-300" />
        <h2 className="text-lg font-bold text-white">Anomalies récentes</h2>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {countLabel(summary.anomalies.length, 'signal')}
      </span>
    </div>
    {summary.anomalies.length === 0 ? (
      <EmptyState
        title="Aucune anomalie active"
        message="Les signaux post-prod agrégés ne remontent pas de blocage récent."
        icon={CheckCircle2}
        tone="emerald"
        compact
      />
    ) : (
      <ol className="space-y-3">
        {summary.anomalies.map((anomaly) => (
          <li
            key={anomaly.id}
            className="rounded-lg border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-bold text-white">{anomaly.title}</p>
                <p className="mt-1 text-sm text-slate-400">{anomaly.detail}</p>
              </div>
              <StatusBadge
                status={
                  anomaly.severity === 'HIGH'
                    ? 'CRITICAL'
                    : anomaly.severity === 'MEDIUM'
                      ? 'WARNING'
                      : 'OK'
                }
                label={severityLabel[anomaly.severity] ?? anomaly.severity}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {anomaly.source} · {formatDateTime(anomaly.detectedAt)}
            </p>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const BackupPanel = ({ summary }: { summary: OpsDashboardSummary }) => {
  const topDatasets = Object.entries(summary.backups.datasetCounts).slice(0, 6);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-2">
          <DatabaseBackup size={18} className="text-violet-300" />
          <h2 className="text-lg font-bold text-white">Backups</h2>
        </div>
        <StatusBadge
          status={summary.backups.status}
          label={statusLabel[summary.backups.status]}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Snapshot
          </p>
          <p className="mt-2 font-bold text-white">
            {summary.backups.exportable ? 'Exportable' : 'Non exportable'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(summary.backups.generatedAt)}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Schéma
          </p>
          <p className="mt-2 font-bold text-white">
            {summary.backups.schemaVersion ?? 'Non renseigné'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {Object.keys(summary.backups.datasetCounts).length} datasets
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Gate BACKUP
          </p>
          <p className="mt-2 font-bold text-white">
            {summary.backups.gate
              ? readableStatus(summary.backups.gate.status)
              : 'Absent'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.backups.gate?.source ?? 'Aucune source'}
          </p>
        </div>
      </div>

      {topDatasets.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          {topDatasets.map(([name, count]) => (
            <div key={name} className="rounded-md bg-slate-900 px-3 py-2">
              <dt className="truncate text-xs text-slate-500">{name}</dt>
              <dd className="mt-1 text-sm font-black text-white">{count}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

const IncidentsPanel = ({
  summary,
  isMutating,
  onOpenRunbook,
}: {
  summary: OpsDashboardSummary;
  isMutating: boolean;
  onOpenRunbook: (request: RunbookReferenceRequest) => void;
}) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <History size={18} className="text-rose-300" />
        <h2 className="text-lg font-bold text-white">Incidents</h2>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {countLabel(summary.incidents.length, 'incident ouvert', 'incidents ouverts')}
      </span>
    </div>

    {summary.incidents.length === 0 ? (
      <EmptyState
        title="Aucun incident ouvert"
        message="Aucun incident post-prod n'est actif pour ce périmètre."
        icon={CheckCircle2}
        tone="emerald"
        compact
      />
    ) : (
      <ol className="mt-4 space-y-3">
        {summary.incidents.map((incident) => {
            const runbookRequest = runbookReferenceFromIncident(incident);
            return (
              <li
                key={incident.id}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {incident.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {incident.detail}
                    </p>
                    {incident.escalationReason && (
                      <p className="mt-1 text-xs text-amber-200">
                        Escalade: {incident.escalationReason}
                      </p>
                    )}
                  </div>
                  <StatusBadge
                    status={incident.status}
                    label={readableStatus(
                      incident.lifecycleStatus ?? statusLabel[incident.status],
                    )}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {incident.source} · {formatDateTime(incident.openedAt)}
                </p>
                {runbookRequest && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AlertActionButton
                      disabled={isMutating}
                      onClick={() => onOpenRunbook(runbookRequest)}
                    >
                      <ScrollText size={14} />
                      Ouvrir runbook
                    </AlertActionButton>
                  </div>
                )}
              </li>
            );
          })}
      </ol>
    )}
  </section>
);

const RoutinesPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <RefreshCw size={18} className="text-cyan-300" />
        <h2 className="text-lg font-bold text-white">
          {summary.routines.title}
        </h2>
      </div>
      <StatusBadge
        status={summary.routines.status}
        label={summary.routines.available ? 'Exposé' : 'Scripts'}
      />
    </div>
    {summary.routines.unavailableReason && (
      <p className="mt-3 text-sm text-slate-400">
        {summary.routines.unavailableReason}
      </p>
    )}
    <div className="mt-4 space-y-2">
      {summary.routines.items.map((routine) => (
        <div
          key={routine.id}
          className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">{routine.label}</p>
              <p className="mt-1 text-xs text-slate-500">{routine.cadence}</p>
            </div>
            <ExternalLink size={14} className="mt-1 shrink-0 text-slate-500" />
          </div>
          <p className="mt-2 break-all rounded bg-slate-950 px-2 py-1 font-mono text-xs text-slate-300">
            {routine.command}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {routine.reportPattern}
          </p>
        </div>
      ))}
    </div>
  </section>
);

const DirectionReportsPanel = ({
  summary,
}: {
  summary: OpsDashboardSummary;
}) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <ScrollText size={18} className="text-violet-300" />
        <h2 className="text-lg font-bold text-white">
          {summary.directionReports.title}
        </h2>
      </div>
      <StatusBadge
        status={summary.directionReports.status}
        label={summary.directionReports.available ? 'Rapports lus' : 'Fallback'}
      />
    </div>
    <p className="mt-3 break-all rounded bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">
      {summary.directionReports.command}
    </p>
    <p className="mt-1 text-xs text-slate-500">
      {summary.directionReports.reportPattern}
    </p>
    {summary.directionReports.unavailableReason && (
      <p className="mt-3 text-sm text-slate-400">
        {summary.directionReports.unavailableReason}
      </p>
    )}
    {summary.directionReports.reports.length > 0 ? (
      <ol className="mt-4 space-y-2">
        {summary.directionReports.reports.map((report) => (
          <li
            key={report.id}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">
                  Rapport #{report.id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(report.timestamp)} ·{' '}
                  {countLabel(report.affected, 'shift')}
                </p>
              </div>
              <StatusBadge
                status={report.blocked ? 'WARNING' : 'OK'}
                label={report.blocked ? 'Bloqué' : 'Publié'}
              />
            </div>
          </li>
        ))}
      </ol>
    ) : (
      <p className="mt-4 text-sm text-slate-500">
        Aucun rapport conformité récent retourné.
      </p>
    )}
  </section>
);

const GatesPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-emerald-300" />
        <h2 className="text-lg font-bold text-white">Gates post-prod</h2>
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {summary.gatesSummary.passed}/{summary.gatesSummary.total} passés
      </p>
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      {summary.gates.map((gate) => (
        <article
          key={`${gate.key}-${gate.source}`}
          className="rounded-md border border-slate-800 bg-slate-900 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">{gate.key}</h3>
              <p className="mt-1 text-xs text-slate-500">{gate.source}</p>
            </div>
            <StatusBadge
              status={
                gate.status === 'PASSED'
                  ? 'OK'
                  : gate.status === 'FAILED'
                    ? 'CRITICAL'
                    : 'UNKNOWN'
              }
              label={readableStatus(gate.status)}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Dernier contrôle: {formatDateTime(gate.checkedAt)}
          </p>
        </article>
      ))}
    </div>
  </section>
);

export const OpsDashboardPage = () => {
  const { impersonatedTenantId } = useAuth();
  const queryClient = useQueryClient();
  const [pollingEnabled, setPollingEnabled] = React.useState(true);
  const [pollingInterval, setPollingInterval] =
    React.useState<number>(30_000);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [openedRunbook, setOpenedRunbook] = React.useState<
    OpsRunbookDto | undefined
  >();
  const [runbookError, setRunbookError] = React.useState(false);
  const [mutatingActionCenterItemId, setMutatingActionCenterItemId] =
    React.useState<string | null>(null);
  const period = React.useMemo(
    () => ({
      ...buildDefaultPeriod(),
      tenantId: impersonatedTenantId ?? undefined,
    }),
    [impersonatedTenantId],
  );

  const summaryQuery = useQuery({
    queryKey: opsQueryKeys.dashboard.summary(period),
    queryFn: () => opsApi.summary(period),
    refetchInterval: pollingEnabled ? pollingInterval : false,
    refetchIntervalInBackground: false,
    ...queryCacheProfiles.live,
  });

  const multiTenantSummaryQuery = useQuery({
    queryKey: opsQueryKeys.dashboard.multiTenantSummary({
      tenantId: period.tenantId,
    }),
    queryFn: () =>
      opsApi.multiTenantSummary({
        tenantId: period.tenantId,
      }),
    refetchInterval: pollingEnabled ? pollingInterval : false,
    refetchIntervalInBackground: false,
    ...queryCacheProfiles.live,
  });

  const refreshOps = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: opsQueryKeys.dashboard.all(),
    });
  }, [queryClient]);

  const resolveAlertMutation = useMutation({
    mutationFn: (alert: OpsAlert) =>
      opsApi.resolveAlert(alert, 'Résolution depuis le tableau de bord ops.'),
    onSuccess: async () => {
      setActionMessage('Alerte résolue. Rafraîchissement des signaux ops.');
      await refreshOps();
    },
    onError: () => {
      setActionMessage('Résolution impossible pour cette alerte.');
    },
  });

  const rerunCheckMutation = useMutation({
    mutationFn: (alert: OpsAlert) => opsApi.rerunShiftCheck(alert.shiftId!),
    onSuccess: async () => {
      setActionMessage('Contrôle relancé. Les signaux vont se mettre à jour.');
      await refreshOps();
    },
    onError: () => {
      setActionMessage('Relance du contrôle indisponible.');
    },
  });

  const openIncidentMutation = useMutation({
    mutationFn: (alert: OpsAlert) =>
      opsApi.declareIncident(
        {
          title: `Alerte ${alert.severity}: ${alert.title}`.slice(0, 160),
          description: [
            alert.detail,
            alert.ruleCode ? `Règle: ${alert.ruleCode}` : null,
            `Alerte source: ${alert.id}`,
          ]
            .filter(Boolean)
            .join('\n'),
          severity: alert.severity,
          impactedService: alert.source,
        },
        { tenantId: period.tenantId },
      ),
    onSuccess: async () => {
      setActionMessage('Incident ouvert depuis l’alerte.');
      await refreshOps();
    },
    onError: () => {
      setActionMessage('Ouverture d’incident indisponible.');
    },
  });

  const openRunbookMutation = useMutation({
    mutationFn: (request: RunbookReferenceRequest) =>
      opsApi.getRunbook(request.reference, { tenantId: period.tenantId }).then(
        (runbook) => ({ runbook, origin: request.origin }),
      ),
    onSuccess: ({ runbook, origin }) => {
      setOpenedRunbook(runbook);
      setRunbookError(false);
      setActionMessage(`Runbook chargé depuis ${origin}.`);
    },
    onError: () => {
      setRunbookError(true);
      setActionMessage('Runbook indisponible pour cette référence.');
    },
  });

  const actionCenterWorkflowMutation = useMutation({
    mutationFn: async ({
      item,
      action,
      assignedToId,
      comment,
      priority,
      status,
      resolution,
    }: {
      item: OpsActionCenterItem;
      action: 'assign' | 'comment' | 'priority' | 'status' | 'resolve';
      assignedToId?: number;
      comment?: string;
      priority?: OpsActionCenterPriority;
      status?: OpsActionCenterStatus;
      resolution?: {
        status: 'RESOLVED' | 'CLOSED';
        summary: string;
        evidenceUrl?: string;
        evidenceLabel?: string;
      };
    }) => {
      setMutatingActionCenterItemId(item.id);
      const params = { tenantId: period.tenantId };

      if (action === 'assign') {
        return opsApi.assignActionCenterItem(
          item.id,
          { assignedToId: assignedToId!, comment },
          params,
        );
      }
      if (action === 'comment') {
        return opsApi.commentActionCenterItem(item.id, { comment: comment! }, params);
      }
      if (action === 'priority') {
        return opsApi.prioritizeActionCenterItem(
          item.id,
          { priority: priority!, comment },
          params,
        );
      }
      if (action === 'status') {
        return opsApi.transitionActionCenterItem(
          item.id,
          { status: status!, comment },
          params,
        );
      }
      return opsApi.resolveActionCenterItem(item.id, resolution!, params);
    },
    onSuccess: async () => {
      setActionMessage('Action-center mis à jour. Rafraîchissement des signaux.');
      await refreshOps();
    },
    onError: () => {
      setActionMessage('Action-center: mutation indisponible.');
    },
    onSettled: () => {
      setMutatingActionCenterItemId(null);
    },
  });

  const isActionMutating =
    resolveAlertMutation.isPending ||
    rerunCheckMutation.isPending ||
    openIncidentMutation.isPending ||
    openRunbookMutation.isPending ||
    actionCenterWorkflowMutation.isPending;

  if (summaryQuery.isLoading) {
    return <PageSkeleton title="Chargement tableau ops" rows={4} sidePanel />;
  }

  if (summaryQuery.isError) {
    return (
      <ApiErrorState
        title="Tableau ops indisponible"
        message="Impossible de charger la synthèse exploitation."
        onRetry={() => summaryQuery.refetch()}
        isRetrying={summaryQuery.isFetching}
      />
    );
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return (
      <EmptyState
        title="Synthèse ops vide"
        message="Aucun signal d'exploitation n'a été retourné."
        icon={AlertTriangle}
        tone="amber"
        compact
      />
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 pb-16">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Exploitation post-prod
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Tableau de bord ops
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {summary.tenantId} · {formatDateTime(summary.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            status={summary.status}
            label={summary.statusLabel ?? operationalStatusLabel[summary.status]}
          />
          <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setPollingEnabled((enabled) => !enabled)}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-100 hover:bg-slate-800"
              aria-label={
                pollingEnabled
                  ? 'Mettre le rafraîchissement en pause'
                  : 'Activer le rafraîchissement'
              }
            >
              {pollingEnabled ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <select
              value={pollingInterval}
              onChange={(event) =>
                setPollingInterval(Number(event.target.value))
              }
              disabled={!pollingEnabled}
              aria-label="Intervalle de rafraîchissement"
              className="h-8 rounded bg-slate-900 px-2 text-xs font-bold text-slate-100 outline-none disabled:opacity-50"
            >
              {POLLING_INTERVALS.map((interval) => (
                <option key={interval} value={interval}>
                  {formatInterval(interval)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => summaryQuery.refetch()}
            disabled={summaryQuery.isFetching}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              size={16}
              className={cn(summaryQuery.isFetching && 'animate-spin')}
            />
            Rafraîchir
          </button>
        </div>
      </header>

      <section
        className={cn(
          'rounded-lg border p-5',
          statusTone[summary.status],
        )}
      >
        <div className="flex items-start gap-3">
          <ServerCog size={22} className="mt-0.5 shrink-0" />
          <div>
            <h2 className="text-lg font-black text-white">
              Statut global: {summary.statusLabel}
            </h2>
            <p className="mt-1 text-sm opacity-90">
              API {readableStatus(summary.health.api?.status)} · Observabilité{' '}
              {readableStatus(summary.health.observability?.status)}{' '}
              · Readiness {readableStatus(summary.health.readiness?.status)}
            </p>
          </div>
        </div>
      </section>

      <KpiStrip summary={summary} />

      <MultiTenantCockpit
        summary={multiTenantSummaryQuery.data}
        isLoading={multiTenantSummaryQuery.isLoading}
        isError={multiTenantSummaryQuery.isError}
      />

      {actionMessage && (
        <p className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
          {actionMessage}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <div className="space-y-6">
          <ActionCenterPanel
            summary={summary}
            isMutating={isActionMutating}
            mutatingItemId={mutatingActionCenterItemId}
            onOpenRunbook={(request) => openRunbookMutation.mutate(request)}
            onAssign={(item, assignedToId, comment) =>
              actionCenterWorkflowMutation.mutate({
                item,
                action: 'assign',
                assignedToId,
                comment,
              })
            }
            onComment={(item, comment) =>
              actionCenterWorkflowMutation.mutate({
                item,
                action: 'comment',
                comment,
              })
            }
            onPrioritize={(item, priority, comment) =>
              actionCenterWorkflowMutation.mutate({
                item,
                action: 'priority',
                priority,
                comment,
              })
            }
            onTransition={(item, status, comment) =>
              actionCenterWorkflowMutation.mutate({
                item,
                action: 'status',
                status,
                comment,
              })
            }
            onResolve={(item, resolution) =>
              actionCenterWorkflowMutation.mutate({
                item,
                action: 'resolve',
                resolution,
              })
            }
          />
          <RunbookPanel
            runbook={openedRunbook}
            isLoading={openRunbookMutation.isPending}
            error={runbookError}
          />
          <AlertsPanel
            summary={summary}
            isMutating={isActionMutating}
            onResolve={(alert) => resolveAlertMutation.mutate(alert)}
            onRerunCheck={(alert) => rerunCheckMutation.mutate(alert)}
            onOpenIncident={(alert) => openIncidentMutation.mutate(alert)}
            onOpenRunbook={(request) => openRunbookMutation.mutate(request)}
          />
          <AnomaliesPanel summary={summary} />
          <SlaPanel summary={summary} />
          <GatesPanel summary={summary} />
        </div>
        <div className="space-y-5">
          <NotificationPanel summary={summary} />
          <BackupPanel summary={summary} />
          <IncidentsPanel
            summary={summary}
            isMutating={isActionMutating}
            onOpenRunbook={(request) => openRunbookMutation.mutate(request)}
          />
          <RoutinesPanel summary={summary} />
          <DirectionReportsPanel summary={summary} />
        </div>
      </div>
    </main>
  );
};
