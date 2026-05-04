import React, { useMemo, useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  PlanningTimelineItem,
  PublishPlanningIssue,
  PublishPlanningReport,
} from '../api/planning.api';
import {
  usePlanningComplianceTimeline,
  usePlanningPublicationPreview,
  usePublishPlanningPeriod,
} from '../hooks/usePlanningPublication';
import { ApiErrorState, EmptyState, PageSkeleton, SkeletonBlock } from '../components/UIStates';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const toInputDate = (date: Date) => format(date, 'yyyy-MM-dd');

const toPeriodStart = (date: string) => {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toISOString();
};

const toPeriodEnd = (date: string) => {
  if (!date) return '';
  const parsed = new Date(`${date}T23:59:59.999`);
  return parsed.toISOString();
};

const ruleLabels: Record<string, string> = {
  UNASSIGNED_SHIFT: 'Shift sans agent assigné',
  INVALID_SHIFT_DATES: 'Dates de garde invalides',
  INVALID_SHIFT_RANGE: 'Plage horaire incohérente',
  AGENT_NOT_FOUND: 'Agent introuvable',
  AGENT_INACTIVE: 'Agent inactif',
  MANDATORY_HEALTH_RECORD_EXPIRED: 'Certificat obligatoire expiré',
  MANDATORY_COMPETENCY_EXPIRED: 'Compétence obligatoire manquante ou expirée',
  APPROVED_LEAVE_OVERLAP: 'Congé approuvé en conflit',
  WEEKLY_HOURS_LIMIT_EXCEEDED: 'Limite hebdomadaire dépassée',
  MAX_GUARD_DURATION_EXCEEDED: 'Durée maximale de garde dépassée',
  REST_TIME_BEFORE_SHIFT_TOO_SHORT: 'Repos insuffisant avant garde',
  REST_TIME_AFTER_SHIFT_TOO_SHORT: 'Repos insuffisant après garde',
  SHIFT_OVERLAP: 'Chevauchement de shifts',
};

const actionTone: Record<string, string> = {
  PUBLISH_PLANNING: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  REASSIGN_SHIFT: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  REQUEST_REPLACEMENT: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  APPROVE_SHIFT_EXCEPTION: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  RESOLVE_ALERT: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  REVALIDATE_SHIFT: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const getIssueReasons = (issue: PublishPlanningIssue) =>
  issue.blockingReasons || issue.warnings || [];

const getExceptionReason = (issue: PublishPlanningIssue) => {
  const exception = issue.metadata?.complianceException;
  return typeof exception?.reason === 'string' ? exception.reason : undefined;
};

const formatRule = (rule: string) =>
  ruleLabels[rule] || rule.replaceAll('_', ' ').toLowerCase();

const formatDateTime = (value?: string) => {
  if (!value) return 'Non renseigné';
  return format(new Date(value), 'dd MMM yyyy HH:mm', { locale: fr });
};

const getApiError = (error: unknown) => {
  const maybeError = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = maybeError.response?.data?.message || maybeError.message;
  return Array.isArray(message)
    ? message.join(', ')
    : message || 'Erreur inconnue';
};

const ReportStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
    <div className={cn('text-2xl font-black', tone)}>{value}</div>
    <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </div>
  </div>
);

const IssueList = ({
  title,
  items,
  empty,
  variant,
}: {
  title: string;
  items: PublishPlanningIssue[];
  empty: string;
  variant: 'blocking' | 'warning';
}) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
        {title}
      </h2>
      <span
        className={cn(
          'rounded-full px-2.5 py-1 text-xs font-bold',
          variant === 'blocking'
            ? 'bg-rose-500/10 text-rose-300'
            : 'bg-amber-500/10 text-amber-300',
        )}
      >
        {items.length}
      </span>
    </div>

    {items.length === 0 ? (
      <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
        {empty}
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${variant}-${item.shiftId}`}
            className="rounded-lg border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-white">
                  Shift #{item.shiftId}
                </div>
                {item.agentId && (
                  <div className="mt-1 text-xs text-slate-500">
                    Agent #{item.agentId}
                  </div>
                )}
              </div>
              {variant === 'blocking' ? (
                <XCircle size={18} className="shrink-0 text-rose-400" />
              ) : (
                <AlertTriangle size={18} className="shrink-0 text-amber-400" />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {getIssueReasons(item).map((reason) => (
                <span
                  key={reason}
                  className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300"
                >
                  {formatRule(reason)}
                </span>
              ))}
            </div>

            {getExceptionReason(item) && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                Exception approuvée: {getExceptionReason(item)}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </section>
);

const TimelineRow = ({ item }: { item: PlanningTimelineItem }) => (
  <div className="grid gap-3 border-b border-slate-800 py-4 last:border-b-0 sm:grid-cols-[120px_1fr] sm:gap-4">
    <div className="text-xs text-slate-500">
      <div className="font-bold text-slate-300">
        {format(new Date(item.timestamp), 'dd MMM', { locale: fr })}
      </div>
      <div>{format(new Date(item.timestamp), 'HH:mm')}</div>
    </div>
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'break-all rounded-full border px-2.5 py-1 text-xs font-bold',
            actionTone[item.action] ||
              'border-slate-700 bg-slate-800 text-slate-300',
          )}
        >
          {item.action}
        </span>
        {item.status && (
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            {item.status}
          </span>
        )}
        {item.severity && (
          <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-300">
            {item.severity}
          </span>
        )}
      </div>
      <div>
        <div className="break-words font-semibold text-white">{item.label}</div>
        <div className="mt-1 text-xs text-slate-500">
          {item.entity.type} {item.entity.id ? `#${item.entity.id}` : ''} ·
          acteur #{item.actorId}
        </div>
      </div>
    </div>
  </div>
);

const Recommendations = ({ report }: { report?: PublishPlanningReport }) => {
  const recommendations = report?.recommendations || [];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-blue-300" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
          Recommandations
        </h2>
      </div>
      {recommendations.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucune recommandation corrective à appliquer.
        </p>
      ) : (
        <div className="space-y-2">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation}
              className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200"
            >
              {recommendation}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const PlanningPrepublicationPage = () => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const [from, setFrom] = useState(toInputDate(weekStart));
  const [to, setTo] = useState(toInputDate(weekEnd));
  const [agentId, setAgentId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [limit, setLimit] = useState(80);
  const [publishedReport, setPublishedReport] =
    useState<PublishPlanningReport | null>(null);
  const hasMissingPeriod = !from || !to;
  const hasInvalidPeriod = Boolean(from && to && from > to);

  const period = useMemo(
    () => ({
      start: toPeriodStart(from),
      end: toPeriodEnd(to),
    }),
    [from, to],
  );

  const timelineFilters = useMemo(
    () => ({
      from: period.start,
      to: period.end,
      limit,
      agentId: agentId ? Number(agentId) : undefined,
      shiftId: shiftId ? Number(shiftId) : undefined,
    }),
    [period.start, period.end, limit, agentId, shiftId],
  );

  const preview = usePlanningPublicationPreview(
    period,
    !hasMissingPeriod && !hasInvalidPeriod,
  );
  const publish = usePublishPlanningPeriod();
  const timeline = usePlanningComplianceTimeline(
    timelineFilters,
    !hasMissingPeriod && !hasInvalidPeriod,
  );

  const report = publishedReport || preview.data?.report;
  const canPublish = Boolean(preview.data?.publishable && !publish.isPending);

  const handlePublish = async () => {
    if (!preview.data?.publishable) return;
    const confirmed = window.confirm(
      'Publier ce planning conforme ? Cette action sera auditée.',
    );
    if (!confirmed) return;

    try {
      const result = await publish.mutateAsync(period);
      setPublishedReport(result.report);
      await timeline.refetch();
    } catch {
      // React Query expose l'erreur dans publish.error pour l'UI.
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
              <CalendarCheck size={24} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Pré-publication planning
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Validation globale avant publication et timeline métier associée.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3 md:flex">
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">
              Début
            </span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-invalid={hasMissingPeriod || hasInvalidPeriod}
              aria-describedby={
                hasMissingPeriod || hasInvalidPeriod
                  ? 'planning-prepublication-period-error'
                  : undefined
              }
              className={cn(
                'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500',
                focusRing,
              )}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase text-slate-500">
              Fin
            </span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-invalid={hasMissingPeriod || hasInvalidPeriod}
              aria-describedby={
                hasMissingPeriod || hasInvalidPeriod
                  ? 'planning-prepublication-period-error'
                  : undefined
              }
              className={cn(
                'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500',
                focusRing,
              )}
            />
          </label>
          <button
            onClick={() => preview.refetch()}
            disabled={
              preview.isFetching || hasMissingPeriod || hasInvalidPeriod
            }
            aria-label="Recalculer la pré-publication planning"
            className={cn(
              'col-span-2 flex items-center justify-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-60 md:col-span-1 md:self-end',
              focusRing,
            )}
          >
            {preview.isFetching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {preview.isFetching ? 'Recalcul' : 'Recalculer'}
          </button>
        </div>
      </div>

      {hasMissingPeriod ? (
        <div
          id="planning-prepublication-period-error"
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-sm font-medium text-amber-100"
        >
          La période de publication doit avoir une date de début et une date de
          fin.
        </div>
      ) : hasInvalidPeriod ? (
        <div
          id="planning-prepublication-period-error"
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-sm font-medium text-amber-100"
        >
          La date de fin doit être postérieure ou égale à la date de début.
        </div>
      ) : preview.isLoading ? (
        <PageSkeleton title="Analyse de publication en cours" rows={3} sidePanel />
      ) : preview.isError ? (
        <ApiErrorState
          title="Impossible de calculer la pré-publication"
          message={getApiError(preview.error)}
          onRetry={() => preview.refetch()}
          retryLabel="Réessayer le calcul"
          isRetrying={preview.isFetching}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            {preview.isFetching && (
              <div role="status" className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-100">
                Recalcul de pré-publication en cours. Le dernier rapport reste
                affiché.
              </div>
            )}

            <section
              className={cn(
                'rounded-lg border p-5',
                report?.publishable
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-rose-500/30 bg-rose-500/10',
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  {report?.publishable ? (
                    <ShieldCheck size={28} className="mt-1 text-emerald-300" />
                  ) : (
                    <ShieldAlert size={28} className="mt-1 text-rose-300" />
                  )}
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {report?.publishable
                        ? 'Planning publiable'
                        : 'Publication bloquée'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatDateTime(report?.start)} -{' '}
                      {formatDateTime(report?.end)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  title={
                    !preview.data?.publishable
                      ? 'Corrigez les violations bloquantes avant publication.'
                      : undefined
                  }
                  aria-label={
                    canPublish
                      ? 'Publier le planning conforme'
                      : 'Publication indisponible: corrigez les violations bloquantes'
                  }
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-black text-white transition',
                    focusRing,
                    canPublish
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500',
                  )}
                >
                  {publish.isPending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                  Publier
                </button>
              </div>

              {publish.isError && (
                <div role="alert" className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                  {getApiError(publish.error)}
                </div>
              )}

              {publish.isSuccess && (
                <div role="status" className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  {publish.data.message} · {publish.data.affected} shift(s)
                  publié(s).
                </div>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReportStat
                label="Shifts pending"
                value={report?.totalPending || 0}
                tone="text-slate-100"
              />
              <ReportStat
                label="Validés"
                value={report?.validatedShiftIds?.length || 0}
                tone="text-emerald-300"
              />
              <ReportStat
                label="Violations"
                value={report?.violations?.length || 0}
                tone="text-rose-300"
              />
              <ReportStat
                label="Warnings"
                value={report?.warnings?.length || 0}
                tone="text-amber-300"
              />
            </div>

            {report?.totalPending === 0 ? (
              <EmptyState
                title="Aucun brouillon à publier sur cette période"
                message="Modifie la période ou génère des shifts pending avant publication."
                icon={CheckCircle2}
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <IssueList
                  title="Violations bloquantes"
                  items={report?.violations || []}
                  empty="Aucune violation bloquante."
                  variant="blocking"
                />
                <IssueList
                  title="Warnings et exceptions"
                  items={report?.warnings || []}
                  empty="Aucun warning métier."
                  variant="warning"
                />
              </div>
            )}

            <Recommendations report={report} />
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Filter size={18} className="text-slate-400" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
                  Filtres timeline
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Agent
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={agentId}
                    onChange={(event) => setAgentId(event.target.value)}
                    placeholder="ID"
                    className={cn(
                      'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500',
                      focusRing,
                    )}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Shift
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={shiftId}
                    onChange={(event) => setShiftId(event.target.value)}
                    placeholder="ID"
                    className={cn(
                      'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500',
                      focusRing,
                    )}
                  />
                </label>
                <label className="col-span-2 space-y-1">
                  <span className="text-xs font-bold uppercase text-slate-500">
                    Limite
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={limit}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isNaN(next)) return;
                      setLimit(Math.min(200, Math.max(1, next)));
                    }}
                    className={cn(
                      'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500',
                      focusRing,
                    )}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-cyan-300" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
                    Timeline métier
                  </h2>
                </div>
                {timeline.isFetching && (
                  <Loader2 role="status" aria-label="Actualisation de la timeline métier" size={16} className="animate-spin text-slate-500" />
                )}
              </div>

              {timeline.isLoading ? (
                <div className="space-y-3" role="status" aria-label="Chargement de la timeline métier">
                  <SkeletonBlock className="h-16" />
                  <SkeletonBlock className="h-16" />
                  <SkeletonBlock className="h-16" />
                </div>
              ) : timeline.isError ? (
                <ApiErrorState
                  title="Timeline indisponible"
                  message={getApiError(timeline.error)}
                  onRetry={() => timeline.refetch()}
                  isRetrying={timeline.isFetching}
                  compact
                />
              ) : !timeline.data || timeline.data.items.length === 0 ? (
                <EmptyState
                  title="Aucun événement métier"
                  message="Aucune publication, correction ou exception ne correspond aux filtres sélectionnés."
                  icon={Clock}
                  compact
                />
              ) : (
                <div>
                  <div className="mb-2 text-xs font-medium text-slate-500">
                    {timeline.data.total} événement(s)
                  </div>
                  <div>
                    {timeline.data.items.map((item) => (
                      <TimelineRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};
