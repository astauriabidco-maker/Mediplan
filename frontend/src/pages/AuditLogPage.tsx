import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  BellRing,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Gauge,
  GitBranch,
  PlaySquare,
  PlusCircle,
  RotateCw,
  ScrollText,
  Search,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import { AuditLog, AuditLogFilters, fetchAuditLogs } from '../api/audit.api';
import { auditQueryKeys, queryCacheProfiles } from '../api/queryKeys';
import { ApiErrorState, EmptyState, PageSkeleton } from '../components/UIStates';
import { useAuth } from '../store/useAuth';
import { cn } from '../utils/cn';

type AuditScope = 'all' | 'action-center' | 'slo' | 'runbook' | 'notification';

type ReadableDetail = {
  label: string;
  value: string;
  important?: boolean;
};

const auditScopes: Array<{
  key: AuditScope;
  label: string;
  helper: string;
  icon: React.ElementType<{ size?: string | number; className?: string }>;
}> = [
  {
    key: 'all',
    label: 'Ops',
    helper: 'Tous les événements exploitation',
    icon: ScrollText,
  },
  {
    key: 'action-center',
    label: 'Action-center',
    helper: 'Lectures et mutations workflow',
    icon: GitBranch,
  },
  {
    key: 'slo',
    label: 'SLO',
    helper: 'Alertes SLO et signaux objectifs',
    icon: Gauge,
  },
  {
    key: 'runbook',
    label: 'Runbook',
    helper: 'Consultations de procédures ops',
    icon: PlaySquare,
  },
  {
    key: 'notification',
    label: 'Notification',
    helper: 'Escalades et preuves de notification',
    icon: BellRing,
  },
];

const actionLabels: Record<string, string> = {
  CREATE: 'Création',
  READ: 'Lecture',
  UPDATE: 'Mise à jour',
  DELETE: 'Suppression',
  VALIDATE: 'Validation',
  REJECT: 'Rejet',
  AUTO_GENERATE: 'Automatique',
};

const detailActionLabels: Record<string, string> = {
  READ_OPS_ACTION_CENTER: 'Lecture action-center',
  OPS_ACTION_CENTER_ASSIGN: 'Assignation action-center',
  OPS_ACTION_CENTER_COMMENT: 'Commentaire action-center',
  OPS_ACTION_CENTER_PRIORITY: 'Priorité action-center',
  OPS_ACTION_CENTER_STATUS: 'Statut action-center',
  OPS_ACTION_CENTER_RESOLVE: 'Résolution action-center',
  READ_OPS_RUNBOOK: 'Lecture runbook',
  CREATE_OPERATIONAL_ALERT: 'Alerte opérationnelle créée',
  DEDUP_OPERATIONAL_ALERT: 'Alerte opérationnelle dédupliquée',
  RESOLVE_OPERATIONAL_ALERT: 'Alerte opérationnelle résolue',
  DECLARE_INCIDENT: 'Incident déclaré',
  ASSIGN_INCIDENT: 'Incident assigné',
  ESCALATE_INCIDENT: 'Incident escaladé',
  RESOLVE_INCIDENT: 'Incident résolu',
  CLOSE_INCIDENT: 'Incident clos',
  AUTO_CREATE_INCIDENT: 'Incident auto créé',
  AUTO_UPDATE_INCIDENT: 'Incident auto mis à jour',
  AUTO_ESCALATE_INCIDENT: 'Incident auto escaladé',
  AUTO_ESCALATE_OPERATIONAL_ALERT: 'Alerte auto escaladée',
  AUTO_ESCALATE_OPERATIONS_JOURNAL_ENTRY: 'Journal ops auto escaladé',
  CREATE_OPERATIONS_JOURNAL_ENTRY: 'Entrée journal ops créée',
  UPDATE_OPERATIONS_JOURNAL_ENTRY: 'Entrée journal ops mise à jour',
};

const detailLabels: Record<string, string> = {
  action: 'Action détaillée',
  workflowAction: 'Workflow',
  itemId: 'Item action-center',
  itemType: 'Type action-center',
  sourceEntity: 'Source',
  sourceId: 'ID source',
  status: 'Statut',
  priority: 'Priorité',
  alertId: 'Alerte',
  alertType: 'Type alerte',
  source: 'Origine',
  sourceReference: 'Référence',
  incidentId: 'Incident',
  severity: 'Sévérité',
  sourceType: 'Type source',
  recommendedActionId: 'Action recommandée',
  requiredPermissionCount: 'Permissions requises',
  evidenceRequirementCount: 'Preuves attendues',
  actionCount: 'Actions',
  journalEntryId: 'Journal ops',
  journalEntryType: 'Type journal',
  notificationStatus: 'Statut notification',
  eventType: 'Type notification',
  channels: 'Canaux',
  recipientRoles: 'Rôles destinataires',
  activeRecipientRoles: 'Rôles actifs',
  escalationLevel: 'Niveau escalade',
  total: 'Total',
  filters: 'Filtres',
};

const sensitiveKeyFragments = [
  'authorization',
  'password',
  'token',
  'secret',
  'email',
  'telephone',
  'phone',
  'recipient',
  'nom',
  'firstname',
  'lastname',
  'fullname',
  'agentname',
  'matricule',
  'nir',
  'niu',
  'cnps',
  'iban',
  'bic',
  'address',
  'birth',
  'payload',
  'comment',
  'message',
  'description',
];

const bulkyKeys = new Set([
  'before',
  'after',
  'timeline',
  'evidence',
  'metadata',
  'notificationPolicy',
  'notificationProof',
  'attempts',
  'artifacts',
  'stderrTail',
]);

const readableDetailOrder = [
  'action',
  'workflowAction',
  'itemType',
  'itemId',
  'sourceEntity',
  'sourceId',
  'alertType',
  'source',
  'sourceReference',
  'incidentId',
  'journalEntryType',
  'notificationStatus',
  'eventType',
  'channels',
  'status',
  'severity',
  'priority',
  'recommendedActionId',
  'requiredPermissionCount',
  'evidenceRequirementCount',
  'actionCount',
  'total',
];

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isSensitiveKey = (key: string) => {
  const normalized = normalizeKey(key);
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Non daté';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Non renseigné';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Aucun';
    return value.map((entry) => formatValue(entry)).join(', ');
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => !isSensitiveKey(key) && !bulkyKeys.has(key))
      .slice(0, 4)
      .map(([key, entry]) => `${detailLabels[key] ?? key}: ${formatValue(entry)}`)
      .join(' · ');
  }
  return String(value);
};

const getDetails = (log: AuditLog): Record<string, unknown> =>
  isRecord(log.details) ? log.details : {};

const detailAction = (log: AuditLog) => {
  const action = getDetails(log).action;
  return typeof action === 'string' ? action : null;
};

const classifyLog = (log: AuditLog): Set<AuditScope> => {
  const details = getDetails(log);
  const action = detailAction(log) ?? '';
  const entity = log.entityType;
  const entityId = log.entityId ?? '';
  const source = formatValue(details.source).toLowerCase();
  const sourceReference = formatValue(details.sourceReference).toLowerCase();
  const alertType = formatValue(details.alertType).toLowerCase();
  const journalType = formatValue(details.journalEntryType).toLowerCase();
  const notificationStatus = formatValue(details.notificationStatus).toLowerCase();
  const scopes = new Set<AuditScope>();

  if (
    entity === 'OPERATION_ALERT' ||
    entity === 'OPERATION_INCIDENT' ||
    entityId.includes('ops-') ||
    entityId.includes('operation-') ||
    action.includes('OPS_') ||
    action.includes('INCIDENT') ||
    action.includes('OPERATIONAL_ALERT')
  ) {
    scopes.add('all');
  }

  if (action === 'READ_OPS_ACTION_CENTER' || action.startsWith('OPS_ACTION_CENTER_')) {
    scopes.add('action-center');
  }

  if (
    alertType.includes('slo') ||
    source.includes('slo') ||
    sourceReference.includes('slo') ||
    action.includes('SLO')
  ) {
    scopes.add('slo');
  }

  if (action === 'READ_OPS_RUNBOOK' || entityId.includes('ops-runbook')) {
    scopes.add('runbook');
  }

  if (
    action.includes('NOTIFICATION') ||
    action.includes('ESCALATE') ||
    journalType.includes('notification') ||
    notificationStatus !== 'non renseigné'
  ) {
    scopes.add('notification');
  }

  return scopes;
};

const getReadableDetails = (log: AuditLog): ReadableDetail[] => {
  const details = getDetails(log);
  const orderedKeys = [
    ...readableDetailOrder,
    ...Object.keys(details).filter((key) => !readableDetailOrder.includes(key)),
  ];
  const seen = new Set<string>();

  return orderedKeys
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return key in details && !isSensitiveKey(key) && !bulkyKeys.has(key);
    })
    .map((key) => ({
      label: detailLabels[key] ?? key,
      value: key === 'action'
        ? detailActionLabels[formatValue(details[key])] ?? formatValue(details[key])
        : formatValue(details[key]),
      important: readableDetailOrder.includes(key),
    }))
    .filter((detail) => detail.value && detail.value !== 'Non renseigné')
    .slice(0, 10);
};

const hiddenDetailCount = (log: AuditLog) =>
  Object.keys(getDetails(log)).filter(
    (key) => isSensitiveKey(key) || bulkyKeys.has(key),
  ).length;

const actorLabel = (log: AuditLog) => {
  const fullName = `${log.actor?.nom ?? ''} ${log.actor?.prenom ?? ''}`.trim();
  return fullName || (log.actorId === 0 ? 'Automatisation ops' : 'Système');
};

const logTitle = (log: AuditLog) => {
  const detailsAction = detailAction(log);
  if (detailsAction) return detailActionLabels[detailsAction] ?? detailsAction;
  return actionLabels[log.action] ?? log.action;
};

const entityLabel = (log: AuditLog) =>
  `${log.entityType.replaceAll('_', ' ').toLowerCase()} #${log.entityId ?? 'n/a'}`;

const matchesSearch = (log: AuditLog, searchTerm: string) => {
  if (!searchTerm.trim()) return true;
  const details = getReadableDetails(log)
    .map((detail) => `${detail.label} ${detail.value}`)
    .join(' ');
  const haystack = [
    actorLabel(log),
    log.actor?.jobTitle ?? '',
    logTitle(log),
    log.action,
    log.entityType,
    log.entityId,
    details,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
};

const csvValue = (value: string | number | undefined) => {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
};

const exportLogsCsv = (logs: AuditLog[]) => {
  const rows = [
    ['timestamp', 'acteur', 'fonction', 'action', 'cible', 'details_lisibles'],
    ...logs.map((log) => [
      log.timestamp,
      actorLabel(log),
      log.actor?.jobTitle || 'Système',
      logTitle(log),
      entityLabel(log),
      getReadableDetails(log)
        .map((detail) => `${detail.label}: ${detail.value}`)
        .join(' | '),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-ops-mediplan-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const ActionBadge = ({ action }: { action: AuditLog['action'] }) => {
  const iconByAction: Partial<Record<AuditLog['action'], React.ReactNode>> = {
    CREATE: <PlusCircle size={12} />,
    VALIDATE: <CheckCircle2 size={12} />,
    REJECT: <XCircle size={12} />,
    AUTO_GENERATE: <RotateCw size={12} />,
    READ: <Search size={12} />,
    UPDATE: <GitBranch size={12} />,
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
      {iconByAction[action]}
      {actionLabels[action] ?? action}
    </span>
  );
};

const TimelineItem = ({ log }: { log: AuditLog }) => {
  const details = getReadableDetails(log);
  const hiddenCount = hiddenDetailCount(log);

  return (
    <article className="relative border-l border-slate-800 pl-5">
      <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border border-blue-400 bg-slate-950" />
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge action={log.action} />
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {formatDateTime(log.timestamp)}
              </span>
            </div>
            <h3 className="mt-2 text-base font-bold text-white">{logTitle(log)}</h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {entityLabel(log)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-900">
              <User size={15} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{actorLabel(log)}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {log.actor?.jobTitle || 'Système'}
              </p>
            </div>
          </div>
        </div>

        {details.length > 0 ? (
          <dl className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {details.map((detail) => (
              <div
                key={`${log.id}-${detail.label}`}
                className={cn(
                  'rounded-md border px-3 py-2',
                  detail.important
                    ? 'border-blue-500/20 bg-blue-500/10'
                    : 'border-slate-800 bg-slate-900/70',
                )}
              >
                <dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  {detail.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-slate-100">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-500">
            Aucun détail métier utile à afficher.
          </p>
        )}

        {hiddenCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Shield size={12} />
            {hiddenCount} champ(s) sensible(s) ou volumineux masqué(s)
          </p>
        )}
      </div>
    </article>
  );
};

const buildDefaultFilters = (tenantId?: string): AuditLogFilters => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 14);

  return {
    tenantId,
    from: from.toISOString(),
    to: to.toISOString(),
    limit: 250,
  };
};

export const AuditLogPage = () => {
  const { impersonatedTenantId } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [scope, setScope] = React.useState<AuditScope>('all');
  const filters = React.useMemo(
    () => buildDefaultFilters(impersonatedTenantId ?? undefined),
    [impersonatedTenantId],
  );

  const { data: logs, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: auditQueryKeys.logs(filters),
    queryFn: () => fetchAuditLogs(filters),
    refetchInterval: 60000,
    ...queryCacheProfiles.auditTrail,
  });

  const opsLogs = React.useMemo(
    () =>
      (logs ?? []).filter((log) => {
        const scopes = classifyLog(log);
        if (scope === 'all') return scopes.has('all') || scopes.size > 0;
        return scopes.has(scope);
      }),
    [logs, scope],
  );

  const filteredLogs = React.useMemo(
    () => opsLogs.filter((log) => matchesSearch(log, searchTerm)),
    [opsLogs, searchTerm],
  );

  const countsByScope = React.useMemo(() => {
    const counts: Record<AuditScope, number> = {
      all: 0,
      'action-center': 0,
      slo: 0,
      runbook: 0,
      notification: 0,
    };
    (logs ?? []).forEach((log) => {
      const scopes = classifyLog(log);
      if (scopes.has('all') || scopes.size > 0) counts.all += 1;
      scopes.forEach((entry) => {
        if (entry !== 'all') counts[entry] += 1;
      });
    });
    return counts;
  }, [logs]);

  if (isLoading) return <PageSkeleton title="Journal audit ops" rows={7} />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Clock className="text-blue-500" />
            Journal audit ops
          </h2>
          <p className="text-sm font-medium text-slate-400">
            Timeline filtrée action-center, SLO, runbook et notifications.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/ops"
              className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-white"
            >
              <ExternalLink size={12} /> Tableau ops
            </Link>
            <Link
              to="/manager/cockpit"
              className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-white"
            >
              <ExternalLink size={12} /> Cockpit manager
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Rechercher action, acteur, cible..."
              aria-label="Rechercher dans le journal audit ops"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/70 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:w-80"
            />
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Filter size={14} />
          Filtres audit
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          {auditScopes.map((item) => {
            const Icon = item.icon;
            const active = scope === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setScope(item.key)}
                className={cn(
                  'min-h-[76px] rounded-md border p-3 text-left transition',
                  active
                    ? 'border-blue-500/50 bg-blue-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-white',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Icon size={15} />
                    {item.label}
                  </span>
                  <span className="rounded-md bg-black/20 px-2 py-0.5 text-[11px] font-black">
                    {countsByScope[item.key]}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.helper}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {isError ? (
        <ApiErrorState
          title="Audit ops indisponible"
          message="Le endpoint audit ne répond pas pour ces filtres."
          onRetry={() => refetch()}
        />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="Aucun événement audit ops"
          message={
            searchTerm
              ? 'Aucune preuve ne correspond à cette recherche.'
              : 'Aucune preuve action-center, SLO, runbook ou notification sur la période.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <TimelineItem key={log.id} log={log} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 py-2 text-slate-500 md:flex-row md:items-center md:justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide">
          Affichage de {filteredLogs.length} preuve(s) audit sur {logs?.length ?? 0}{' '}
          événement(s) chargé(s)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400 transition hover:border-slate-700 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            <RotateCw size={12} className={isFetching ? 'animate-spin' : undefined} />
            Actualiser
          </button>
          <button
            onClick={() => exportLogsCsv(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownToLine size={12} /> Exporter CSV
          </button>
        </div>
      </div>
    </div>
  );
};
