import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { managerApi } from '../api/manager.api';
import type {
  ManagerCockpit,
  ManagerWorklistItem,
  ObservabilityStatus,
} from '../api/manager.api';
import { managerQueryKeys, queryCacheProfiles } from '../api/queryKeys';
import { ManagerKpiTile } from '../components/manager/ManagerKpiTile';
import { ServiceIndicatorsTable } from '../components/manager/ServiceIndicatorsTable';
import { ApiErrorState, EmptyState, PageSkeleton } from '../components/UIStates';
import { cn } from '../utils/cn';

const startOfCurrentWeek = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfCurrentWeek = (start: Date) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Non disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date invalide';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const getApiError = (error: unknown) => {
  const maybeError = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = maybeError.response?.data?.message || maybeError.message;
  return Array.isArray(message)
    ? message.join(', ')
    : message || 'Le cockpit manager est indisponible.';
};

const statusMeta: Record<
  ObservabilityStatus,
  { label: string; className: string }
> = {
  HEALTHY: {
    label: 'Sain',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  DEGRADED: {
    label: 'Degrade',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  CRITICAL: {
    label: 'Critique',
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  UNKNOWN: {
    label: 'Inconnu',
    className: 'border-slate-700 bg-slate-900 text-slate-300',
  },
};

const categoryLabels: Record<ManagerWorklistItem['category'], string> = {
  REST_INSUFFICIENT: 'Repos insuffisant',
  WEEKLY_OVERLOAD: 'Surcharge hebdo',
  MISSING_COMPETENCY: 'Competence manquante',
  LEAVE_CONFLICT: 'Conge conflictuel',
};

const severityClass = {
  HIGH: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  MEDIUM: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  LOW: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const reasonLabels: Record<string, string> = {
  HIGH_ALERTS_OPEN: 'Alertes critiques ouvertes',
  REFUSED_PUBLICATIONS: 'Publication refusee recemment',
  PENDING_SHIFTS: 'Shifts en attente',
  COMPLIANCE_SCAN_FAILED: 'Scan conformite en echec',
};

const isCockpitEmpty = (cockpit: ManagerCockpit) => {
  const counters = cockpit.counters;
  return (
    counters.openAlerts === 0 &&
    counters.blockedShifts === 0 &&
    counters.agentsAtRisk === 0 &&
    counters.refusedPublications === 0 &&
    counters.pendingCorrections === 0 &&
    cockpit.serviceIndicators.services.length === 0
  );
};

export const ManagerCockpitPage = () => {
  const initialStart = useMemo(() => startOfCurrentWeek(), []);
  const [from, setFrom] = useState(initialStart);
  const [to, setTo] = useState(() => endOfCurrentWeek(initialStart));
  const hasInvalidPeriod = from.getTime() > to.getTime();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: managerQueryKeys.cockpit.period({
      from: from.toISOString(),
      to: to.toISOString(),
    }),
    queryFn: () =>
      managerApi.getCockpit({
        from: from.toISOString(),
        to: to.toISOString(),
      }),
    enabled: !hasInvalidPeriod,
    ...queryCacheProfiles.operational,
  });

  const topServices = useMemo(() => {
    return [...(data?.serviceIndicators.services || [])]
      .sort((a, b) => {
        const alertDelta =
          b.openAlertsBySeverity.HIGH - a.openAlertsBySeverity.HIGH;
        if (alertDelta !== 0) return alertDelta;
        const overloadDelta = b.weeklyOverloadAgents - a.weeklyOverloadAgents;
        if (overloadDelta !== 0) return overloadDelta;
        return a.coverageRate - b.coverageRate;
      })
      .slice(0, 8);
  }, [data]);

  const updatePeriod = (days: number) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);
    end.setHours(23, 59, 59, 999);
    setFrom(start);
    setTo(end);
  };

  if (hasInvalidPeriod) {
    return (
      <div className="mx-auto max-w-[1700px] space-y-6 pb-12">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Cockpit manager
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Ajustez la période pour relancer les indicateurs manager.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updatePeriod(7)}
              className={cn(
                'rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900',
                focusRing,
              )}
            >
              7 jours
            </button>
            <button
              onClick={() => updatePeriod(30)}
              className={cn(
                'rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900',
                focusRing,
              )}
            >
              30 jours
            </button>
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
              De
              <input
                type="date"
                value={from.toISOString().slice(0, 10)}
                aria-invalid={hasInvalidPeriod}
                aria-describedby="manager-cockpit-period-error"
                onChange={(event) => {
                  if (!event.target.value) return;
                  const next = new Date(event.target.value);
                  next.setHours(0, 0, 0, 0);
                  setFrom(next);
                }}
                className={cn('bg-transparent text-slate-200 outline-none', focusRing)}
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
              A
              <input
                type="date"
                value={to.toISOString().slice(0, 10)}
                aria-invalid={hasInvalidPeriod}
                aria-describedby="manager-cockpit-period-error"
                onChange={(event) => {
                  if (!event.target.value) return;
                  const next = new Date(event.target.value);
                  next.setHours(23, 59, 59, 999);
                  setTo(next);
                }}
                className={cn('bg-transparent text-slate-200 outline-none', focusRing)}
              />
            </label>
          </div>
        </div>

        <div
          id="manager-cockpit-period-error"
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-100"
        >
          La date de fin doit être postérieure ou égale à la date de début.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageSkeleton title="Chargement du cockpit manager" rows={4} sidePanel />;
  }

  if (isError || !data) {
    const message = getApiError(error);
    return (
      <div className="mx-auto flex min-h-[520px] max-w-3xl flex-col justify-center">
        <ApiErrorState
          title="Cockpit indisponible"
          message={message}
          onRetry={() => refetch()}
          retryLabel="Recharger"
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const status = statusMeta[data.status] || statusMeta.UNKNOWN;
  const empty = isCockpitEmpty(data);

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 pb-12">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Cockpit manager
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold',
                status.className,
              )}
            >
              <ShieldCheck size={15} />
              Sante planning: {status.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Tenant {data.tenantId} - Donnees generees le{' '}
            {formatDateTime(data.generatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => updatePeriod(7)}
            disabled={isFetching}
            className={cn(
              'rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-wait disabled:opacity-60',
              focusRing,
            )}
          >
            7 jours
          </button>
          <button
            onClick={() => updatePeriod(30)}
            disabled={isFetching}
            className={cn(
              'rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-wait disabled:opacity-60',
              focusRing,
            )}
          >
            30 jours
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            De
            <input
              type="date"
              value={from.toISOString().slice(0, 10)}
              aria-label="Date de début du cockpit manager"
              aria-invalid={hasInvalidPeriod}
              onChange={(event) => {
                if (!event.target.value) return;
                const next = new Date(event.target.value);
                next.setHours(0, 0, 0, 0);
                setFrom(next);
              }}
              className={cn('bg-transparent text-slate-200 outline-none', focusRing)}
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            A
            <input
              type="date"
              value={to.toISOString().slice(0, 10)}
              aria-label="Date de fin du cockpit manager"
              aria-invalid={hasInvalidPeriod}
              onChange={(event) => {
                if (!event.target.value) return;
                const next = new Date(event.target.value);
                next.setHours(23, 59, 59, 999);
                setTo(next);
              }}
              className={cn('bg-transparent text-slate-200 outline-none', focusRing)}
            />
          </label>
          <button
            onClick={() => refetch()}
            disabled={isFetching || hasInvalidPeriod}
            aria-label="Actualiser les indicateurs du cockpit manager"
            className={cn(
              'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70',
              focusRing,
            )}
          >
            <RefreshCw size={15} className={cn(isFetching && 'animate-spin')} />
            {isFetching ? 'Actualisation' : 'Actualiser'}
          </button>
        </div>
      </div>

      {isFetching && (
        <div
          role="status"
          className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-100"
        >
          Mise à jour du cockpit en cours. Les derniers indicateurs restent
          affichés.
        </div>
      )}

      {empty && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-emerald-300" size={22} />
            <div>
              <p className="font-bold text-emerald-100">
                Aucun point bloquant sur la periode
              </p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Le cockpit ne signale ni correction urgente, ni publication
                refusee, ni service a risque.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <ManagerKpiTile
          label="Alertes ouvertes"
          value={data.counters.openAlerts}
          detail={`${data.counters.highAlerts} critiques, ${data.counters.mediumAlerts} moyennes`}
          tone={
            data.counters.highAlerts > 0
              ? 'rose'
              : data.counters.openAlerts > 0
                ? 'amber'
                : 'emerald'
          }
          icon={AlertTriangle}
        />
        <ManagerKpiTile
          label="Shifts bloques"
          value={data.counters.blockedShifts}
          detail={`${data.counters.pendingCorrections} corrections en file manager`}
          tone={data.counters.blockedShifts > 0 ? 'rose' : 'emerald'}
          icon={FileWarning}
        />
        <ManagerKpiTile
          label="Agents a risque"
          value={data.counters.agentsAtRisk}
          detail={`${data.counters.weeklyOverloadAgents} agents en surcharge hebdo`}
          tone={data.counters.agentsAtRisk > 0 ? 'amber' : 'emerald'}
          icon={Users}
        />
        <ManagerKpiTile
          label="Publications refusees"
          value={data.counters.refusedPublications}
          detail={`${data.observability.counters.publicationAttempts} tentatives sur la periode`}
          tone={data.counters.refusedPublications > 0 ? 'rose' : 'emerald'}
          icon={XCircle}
        />
        <ManagerKpiTile
          label="Services a surveiller"
          value={data.counters.servicesUnderCovered}
          detail={`${data.counters.servicesWithOpenAlerts} services avec alertes ouvertes`}
          tone={data.counters.servicesUnderCovered > 0 ? 'amber' : 'emerald'}
          icon={CalendarDays}
        />
        <ManagerKpiTile
          label="Shifts publies"
          value={data.counters.publishedShifts}
          detail={`${data.counters.validatedShifts} valides, ${data.counters.pendingShifts} pending`}
          tone="blue"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">
                Indicateurs par service
              </h2>
              <p className="text-xs text-slate-500">
                Couverture, surcharge, conformite publication et alertes par
                criticite.
              </p>
            </div>
            <span className="rounded-xl bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
              {topServices.length} services
            </span>
          </div>
          <ServiceIndicatorsTable services={topServices} />
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-black text-white">Sante planning</h2>
            <div className="mt-4 space-y-3">
              {(data.reasons.length
                ? data.reasons
                : ['Aucun signal degradant']
              ).map((reason) => (
                <div
                  key={reason}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                >
                  <AlertTriangle
                    className={
                      data.reasons.length
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }
                    size={18}
                  />
                  <span className="min-w-0 break-words text-sm font-semibold text-slate-200">
                    {reasonLabels[reason] || reason}
                  </span>
                </div>
              ))}
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Derniere publication</span>
                  <span className="font-semibold text-white">
                    {formatDateTime(
                      data.observability.lastPublication?.timestamp,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Job scan conformite</span>
                  <span className="font-semibold text-white">
                    {data.observability.jobs?.complianceScan?.status ||
                      'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-black text-white">
              Actions prioritaires
            </h2>
            <div className="mt-4 space-y-3">
              {data.priorityActions.length === 0 ? (
                <EmptyState
                  title="Aucune correction prioritaire."
                  message="Les alertes critiques et shifts bloqués sont absents sur la période."
                  icon={CheckCircle2}
                  tone="emerald"
                  compact
                />
              ) : (
                data.priorityActions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="break-words text-sm font-bold text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {categoryLabels[item.category]} - {item.source}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold',
                          severityClass[item.severity],
                        )}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
                      {item.shiftId && (
                        <span className="rounded bg-slate-800 px-2 py-1">
                          Shift #{item.shiftId}
                        </span>
                      )}
                      {item.agentId && (
                        <span className="rounded bg-slate-800 px-2 py-1">
                          Agent #{item.agentId}
                        </span>
                      )}
                      {item.alertId && (
                        <span className="rounded bg-slate-800 px-2 py-1">
                          Alerte #{item.alertId}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">
              Commandes recommandees
            </h2>
            <p className="text-xs text-slate-500">
              Actions backend disponibles pour enchainer correction, validation
              et publication.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock3 size={14} />
            {data.recommendedActions.length} actions
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.recommendedActions.length === 0 ? (
            <EmptyState
              title="Rien à exécuter pour l'instant."
              message="Aucune commande corrective ou publication n'est recommandée par le moteur."
              icon={CheckCircle2}
              tone="emerald"
              compact
            />
          ) : (
            data.recommendedActions.map((action, index) => {
              const endpointPath =
                typeof action.endpoint?.path === 'string'
                  ? action.endpoint.path
                  : undefined;

              return (
                <div
                  key={`${action.type}-${action.shiftId || action.alertId || index}`}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <p className="break-words text-sm font-bold text-white">
                    {action.label}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-blue-300">
                    {action.type}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                    {action.shiftId && (
                      <span className="rounded bg-slate-800 px-2 py-1">
                        Shift #{action.shiftId}
                      </span>
                    )}
                    {action.alertId && (
                      <span className="rounded bg-slate-800 px-2 py-1">
                        Alerte #{action.alertId}
                      </span>
                    )}
                    {endpointPath && (
                      <span className="break-all rounded bg-slate-800 px-2 py-1">
                        {endpointPath}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
