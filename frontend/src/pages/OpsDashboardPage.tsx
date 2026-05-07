import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  DatabaseBackup,
  ExternalLink,
  Gauge,
  History,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';
import React from 'react';
import {
  opsApi,
  OpsActionCenterItem,
  OpsAlert,
  OpsDashboardSummary,
  OpsRunbookDto,
  OpsSignalStatus,
  OpsStatus,
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

const priorityStatus = (priority: OpsActionCenterItem['priority']) => {
  if (priority === 'CRITICAL' || priority === 'HIGH') return 'CRITICAL';
  if (priority === 'MEDIUM') return 'WARNING';
  return 'OK';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Non daté';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const POLLING_INTERVALS = [15_000, 30_000, 60_000] as const;

const formatInterval = (value: number) => `${value / 1000}s`;

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

const KpiStrip = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
    {summary.kpis.map((kpi) => (
      <article
        key={kpi.key}
        className="rounded-lg border border-slate-800 bg-slate-900 p-4"
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
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          État
        </p>
        <p className="mt-2 text-sm font-bold text-white">
          {summary.notifications.label}
        </p>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          À traiter
        </p>
        <p className="mt-2 text-sm font-black text-white">
          {summary.notifications.pendingAlerts}
        </p>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Escalades
        </p>
        <p className="mt-2 text-sm font-black text-white">
          {summary.notifications.escalatedIncidents}
        </p>
      </div>
    </div>
    <p className="mt-3 text-sm text-slate-400">
      {summary.notifications.detail}
    </p>
    <p className="mt-1 text-xs text-slate-500">
      Dernier signal: {formatDateTime(summary.notifications.lastActivityAt)}
    </p>
  </section>
);

const AlertActionButton = ({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);

const AlertsPanel = ({
  summary,
  isMutating,
  onResolve,
  onRerunCheck,
  onOpenIncident,
}: {
  summary: OpsDashboardSummary;
  isMutating: boolean;
  onResolve: (alert: OpsAlert) => void;
  onRerunCheck: (alert: OpsAlert) => void;
  onOpenIncident: (alert: OpsAlert) => void;
}) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-300" />
        <h2 className="text-lg font-bold text-white">Alertes ouvertes</h2>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {summary.alerts.length} ouverte
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
        {summary.alerts.map((alert) => (
          <li
            key={alert.id}
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
                  label={alert.severity}
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
              <AlertActionButton
                disabled={isMutating || !alert.actions.canResolve}
                onClick={() => onResolve(alert)}
              >
                Résoudre alerte
              </AlertActionButton>
              <AlertActionButton
                disabled={isMutating || !alert.actions.canRerunCheck}
                onClick={() => onRerunCheck(alert)}
              >
                Relancer contrôle
              </AlertActionButton>
              <AlertActionButton
                disabled={isMutating || !alert.actions.canOpenIncident}
                onClick={() => onOpenIncident(alert)}
              >
                Ouvrir incident
              </AlertActionButton>
            </div>
          </li>
        ))}
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
            </div>
            <StatusBadge
              status={priorityStatus(runbook.next.priority)}
              label={runbook.next.priority}
            />
          </div>
          <p className="mt-3 text-sm text-slate-300">
            {runbook.next.whatToDoNext}
          </p>
          <p className="mt-1 text-xs text-slate-500">{runbook.next.why}</p>
        </div>

        <ol className="space-y-2">
          {runbook.steps.slice(0, 4).map((step) => (
            <li
              key={step.order}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
            >
              <p className="text-sm font-bold text-white">
                {step.order}. {step.title}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {step.instruction}
              </p>
            </li>
          ))}
        </ol>

        {runbook.actions.length > 0 && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {runbook.actions.slice(0, 4).map((action) => (
              <div
                key={action.id}
                className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
              >
                <p className="text-xs font-bold text-white">
                  {action.method} {action.label}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {action.endpoint}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      <p className="mt-4 text-sm text-slate-500">
        Sélectionnez une action pour charger le runbook généré.
      </p>
    )}
  </section>
);

const ActionCenterPanel = ({
  summary,
  isMutating,
  onOpenRunbook,
  onResolve,
}: {
  summary: OpsDashboardSummary;
  isMutating: boolean;
  onOpenRunbook: (item: OpsActionCenterItem) => void;
  onResolve: (item: OpsActionCenterItem) => void;
}) => (
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
            ? `${summary.actionCenter.total} action`
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
        {summary.actionCenter.items.map((item) => (
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
                  label={item.priority}
                />
                <StatusBadge status="WARNING" label={item.status} />
              </div>
            </div>
            {item.requiredEvidence.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Preuves: {item.requiredEvidence.slice(0, 2).join(' · ')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <AlertActionButton
                disabled={isMutating}
                onClick={() => onOpenRunbook(item)}
              >
                Ouvrir runbook
              </AlertActionButton>
              {item.sourceReference.entity === 'OperationalAlert' && (
                <AlertActionButton
                  disabled={isMutating}
                  onClick={() => onResolve(item)}
                >
                  Résoudre si supporté
                </AlertActionButton>
              )}
            </div>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const SlaPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <Gauge size={18} className="text-cyan-300" />
      <h2 className="text-lg font-bold text-white">SLA exploitation</h2>
    </div>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {summary.sla.map((sla) => (
        <article
          key={sla.id}
          className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">{sla.label}</h3>
              <p className="mt-1 text-xs text-slate-500">Cible: {sla.target}</p>
            </div>
            <StatusBadge status={sla.status} label={statusLabel[sla.status]} />
          </div>
          <p className="mt-3 text-xl font-black text-white">{sla.current}</p>
          <p className="mt-1 text-sm text-slate-400">{sla.detail}</p>
        </article>
      ))}
    </div>
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
        {summary.anomalies.length} signal
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
                label={anomaly.severity}
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
            {summary.backups.schemaVersion ?? 'N/A'}
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
            {summary.backups.gate?.status ?? 'Absent'}
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

const IncidentsPanel = ({ summary }: { summary: OpsDashboardSummary }) => (
  <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <History size={18} className="text-rose-300" />
        <h2 className="text-lg font-bold text-white">Incidents</h2>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {summary.incidents.length} ouvert
      </span>
    </div>

    {summary.incidents.length === 0 ? (
      <p className="mt-4 text-sm text-slate-500">
        Aucun incident post-prod ouvert.
      </p>
    ) : (
      <ol className="mt-4 space-y-3">
        {summary.incidents.map((incident) => (
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
                label={incident.lifecycleStatus ?? statusLabel[incident.status]}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {incident.source} · {formatDateTime(incident.openedAt)}
            </p>
          </li>
        ))}
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
                  {formatDateTime(report.timestamp)} · {report.affected} shift
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
              label={gate.status}
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
    mutationFn: (item: OpsActionCenterItem) =>
      opsApi.getRunbook(item.sourceReference, { tenantId: period.tenantId }),
    onSuccess: (runbook) => {
      setOpenedRunbook(runbook);
      setRunbookError(false);
      setActionMessage('Runbook chargé pour la référence action-center.');
    },
    onError: () => {
      setRunbookError(true);
      setActionMessage('Runbook indisponible pour cette référence.');
    },
  });

  const resolveActionCenterItemMutation = useMutation({
    mutationFn: (item: OpsActionCenterItem) =>
      opsApi.resolveAlert(
        {
          id: item.sourceReference.id,
          sourceKind: 'OPERATIONAL_ALERT',
        },
        'Résolution depuis l’action-center ops.',
      ),
    onSuccess: async () => {
      setActionMessage('Action-center: alerte résolue.');
      await refreshOps();
    },
    onError: () => {
      setActionMessage('Action-center: résolution indisponible.');
    },
  });

  const isActionMutating =
    resolveAlertMutation.isPending ||
    rerunCheckMutation.isPending ||
    openIncidentMutation.isPending ||
    openRunbookMutation.isPending ||
    resolveActionCenterItemMutation.isPending;

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
          <StatusBadge status={summary.status} label={summary.statusLabel} />
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
              API {summary.health.api?.status ?? 'N/A'} · Observabilité{' '}
              {summary.health.observability?.status ?? 'N/A'} · Readiness{' '}
              {summary.health.readiness?.status ?? 'N/A'}
            </p>
          </div>
        </div>
      </section>

      <KpiStrip summary={summary} />

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
            onOpenRunbook={(item) => openRunbookMutation.mutate(item)}
            onResolve={(item) => resolveActionCenterItemMutation.mutate(item)}
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
          />
          <AnomaliesPanel summary={summary} />
          <SlaPanel summary={summary} />
          <GatesPanel summary={summary} />
        </div>
        <div className="space-y-5">
          <NotificationPanel summary={summary} />
          <BackupPanel summary={summary} />
          <IncidentsPanel summary={summary} />
          <RoutinesPanel summary={summary} />
          <DirectionReportsPanel summary={summary} />
        </div>
      </div>
    </main>
  );
};
