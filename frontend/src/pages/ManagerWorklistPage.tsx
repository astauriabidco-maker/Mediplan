import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowDownUp,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    FileWarning,
    Filter,
    Loader2,
    RefreshCw,
    Search,
    ShieldAlert,
    Stethoscope,
    UserRound,
} from 'lucide-react';
import { fetchAgents } from '../api/agents.api';
import {
    AlertSeverity as WorklistSeverity,
    CorrectionGuidance as CorrectionGuidanceResponse,
    managerApi,
    ManagerWorklistItem,
    WorklistCategory,
} from '../api/manager.api';
import {
    agentsQueryKeys,
    managerQueryKeys,
    queryCacheProfiles,
} from '../api/queryKeys';
import { ApiErrorState, EmptyState, SkeletonBlock } from '../components/UIStates';
import { cn } from '../utils/cn';

const categoryLabels: Record<WorklistCategory | 'ALL', string> = {
    ALL: 'Tous les problèmes',
    REST_INSUFFICIENT: 'Repos insuffisant',
    WEEKLY_OVERLOAD: 'Surcharge hebdo',
    MISSING_COMPETENCY: 'Compétence manquante',
    LEAVE_CONFLICT: 'Congé conflictuel',
};

const categoryIcons: Record<WorklistCategory, typeof CalendarClock> = {
    REST_INSUFFICIENT: CalendarClock,
    WEEKLY_OVERLOAD: ShieldAlert,
    MISSING_COMPETENCY: Stethoscope,
    LEAVE_CONFLICT: FileWarning,
};

const severityLabels: Record<WorklistSeverity | 'ALL', string> = {
    ALL: 'Toutes criticités',
    HIGH: 'Critique',
    MEDIUM: 'À surveiller',
    LOW: 'Faible',
};

const severityStyles: Record<WorklistSeverity, string> = {
    HIGH: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    MEDIUM: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    LOW: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
};

const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

type SortMode = 'severity' | 'dueAt' | 'category';

const severityRank: Record<WorklistSeverity, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

const safeText = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'Non renseigné';
    if (value instanceof Date) return value.toLocaleString('fr-FR');
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value, null, 2);
};

const formatDateTime = (value?: string): string => {
    if (!value) return 'Échéance non définie';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date invalide';
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const getApiError = (error: unknown): string => {
    const maybeError = error as { response?: { data?: { message?: string | string[] } }; message?: string };
    const message = maybeError.response?.data?.message || maybeError.message;
    return Array.isArray(message) ? message.join(', ') : message || 'Erreur inconnue';
};

const getAgentName = (agentId: number | undefined, agents: Array<{ id: number; nom?: string; firstName?: string; lastName?: string; jobTitle?: string }>): string => {
    if (!agentId) return 'Agent non affecté';
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return `Agent #${agentId}`;
    return agent.nom || [agent.firstName, agent.lastName].filter(Boolean).join(' ') || `Agent #${agentId}`;
};

const compactMetadata = (metadata: unknown): Array<[string, string]> => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];

    return Object.entries(metadata as Record<string, unknown>)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .slice(0, 6)
        .map(([key, value]) => [key, safeText(value)]);
};

const DetailValue = ({ label, value }: { label: string; value: unknown }) => (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-1 break-words text-sm font-medium text-slate-200 whitespace-pre-wrap">{safeText(value)}</div>
    </div>
);

const WorklistSkeleton = () => (
    <div className="space-y-3">
        {[0, 1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="h-28" />
        ))}
    </div>
);

export const ManagerWorklistPage = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [from, setFrom] = useState(weekStart.toISOString().slice(0, 10));
    const [to, setTo] = useState(weekEnd.toISOString().slice(0, 10));
    const [category, setCategory] = useState<WorklistCategory | 'ALL'>('ALL');
    const [severity, setSeverity] = useState<WorklistSeverity | 'ALL'>('ALL');
    const [sortMode, setSortMode] = useState<SortMode>('severity');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const hasInvalidPeriod = Boolean(from && to && from > to);

    const queryFilters = {
        from: from ? new Date(`${from}T00:00:00.000`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    };

    const worklistQuery = useQuery({
        queryKey: managerQueryKeys.worklist.period(queryFilters),
        queryFn: () => managerApi.getWorklist(queryFilters),
        enabled: !hasInvalidPeriod,
        ...queryCacheProfiles.operational,
    });

    const agentsQuery = useQuery({
        queryKey: agentsQueryKeys.list('manager-worklist'),
        queryFn: fetchAgents,
        ...queryCacheProfiles.reference,
    });

    const items = worklistQuery.data?.items || [];
    const agents = agentsQuery.data || [];

    const selectedItem = useMemo(
        () => items.find((item) => item.id === selectedId) || null,
        [items, selectedId],
    );

    const guidanceQuery = useQuery({
        queryKey: selectedItem?.shiftId
            ? managerQueryKeys.correctionGuidance.shift(selectedItem.shiftId)
            : managerQueryKeys.correctionGuidance.alert(selectedItem?.alertId),
        queryFn: () => {
            const item = selectedItem as ManagerWorklistItem;
            if (item.shiftId) return managerApi.getShiftGuidance(item.shiftId);
            if (item.alertId) return managerApi.getAlertGuidance(item.alertId);
            throw new Error('Aucun shift ou alerte associé à cet élément.');
        },
        enabled: Boolean(selectedItem),
        retry: false,
        ...queryCacheProfiles.live,
    });

    const filteredItems = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return items
            .filter((item) => category === 'ALL' || item.category === category)
            .filter((item) => severity === 'ALL' || item.severity === severity)
            .filter((item) => {
                if (!normalizedSearch) return true;
                const agentName = getAgentName(item.agentId, agents).toLowerCase();
                return [
                    item.title,
                    item.ruleCode,
                    item.category,
                    item.shiftId,
                    item.alertId,
                    item.agentId,
                    agentName,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
            })
            .sort((a, b) => {
                if (sortMode === 'category') return a.category.localeCompare(b.category);
                if (sortMode === 'dueAt') {
                    return new Date(a.dueAt || a.detectedAt || 0).getTime() - new Date(b.dueAt || b.detectedAt || 0).getTime();
                }
                const severityDelta = severityRank[b.severity] - severityRank[a.severity];
                if (severityDelta !== 0) return severityDelta;
                return new Date(a.dueAt || a.detectedAt || 0).getTime() - new Date(b.dueAt || b.detectedAt || 0).getTime();
            });
    }, [agents, category, items, search, severity, sortMode]);

    const selectedAgentName = getAgentName(selectedItem?.agentId, agents);

    const openItem = (item: ManagerWorklistItem) => {
        setSelectedId(item.id);
    };

    return (
        <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <ClipboardList size={20} className="text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">File de correction manager</span>
                    </div>
                    <h1 className="mt-2 text-3xl font-black text-white">À corriger avant publication</h1>
                    <p className="mt-2 max-w-3xl text-sm text-slate-400">
                        Les blocages de conformité sont triés pour aider le cadre à décider vite: comprendre le problème, ouvrir le guidage, puis lancer la bonne action.
                    </p>
                </div>

                <button
                    onClick={() => worklistQuery.refetch()}
                    disabled={worklistQuery.isFetching || hasInvalidPeriod}
                    aria-label="Actualiser la file de correction manager"
                    className={cn(
                        'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:cursor-wait disabled:opacity-60',
                        focusRing,
                    )}
                >
                    <RefreshCw size={16} className={cn(worklistQuery.isFetching && 'animate-spin')} />
                    {worklistQuery.isFetching ? 'Actualisation' : 'Actualiser'}
                </button>
            </div>

            {hasInvalidPeriod && (
                <div id="manager-worklist-period-error" role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-100">
                    La date de fin doit être postérieure ou égale à la date de début.
                </div>
            )}

            {agentsQuery.isError && (
                <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    Les agents n’ont pas pu être chargés. La file reste exploitable, mais certains noms peuvent apparaître avec leur identifiant.
                </div>
            )}

            <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {Object.entries(worklistQuery.data?.counters || {
                    REST_INSUFFICIENT: 0,
                    WEEKLY_OVERLOAD: 0,
                    MISSING_COMPETENCY: 0,
                    LEAVE_CONFLICT: 0,
                }).map(([key, value]) => {
                    const CategoryIcon = categoryIcons[key as WorklistCategory];
                    return (
                        <div key={key} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{categoryLabels[key as WorklistCategory]}</span>
                                <CategoryIcon size={18} className="text-slate-500" />
                            </div>
                            <div className="mt-3 text-2xl font-black text-white">{value}</div>
                        </div>
                    );
                })}
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]">
                    <label className="relative block">
                        <span className="sr-only">Rechercher dans la file manager</span>
                        <Search size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Rechercher agent, règle, shift..."
                            aria-label="Rechercher dans la file manager"
                            className={cn(
                                'h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500/60',
                                focusRing,
                            )}
                        />
                    </label>

                    <label className="relative block">
                        <span className="sr-only">Filtrer par type de problème</span>
                        <Filter size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                        <select
                            value={category}
                            onChange={(event) => setCategory(event.target.value as WorklistCategory | 'ALL')}
                            aria-label="Filtrer par type de problème"
                            className={cn(
                                'h-10 w-full appearance-none rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm font-medium text-slate-100 outline-none transition focus:border-emerald-500/60',
                                focusRing,
                            )}
                        >
                            {Object.entries(categoryLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>

                    <select
                        value={severity}
                        onChange={(event) => setSeverity(event.target.value as WorklistSeverity | 'ALL')}
                        aria-label="Filtrer par criticité"
                        className={cn(
                            'h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm font-medium text-slate-100 outline-none transition focus:border-emerald-500/60',
                            focusRing,
                        )}
                    >
                        {Object.entries(severityLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    <label className="relative block">
                        <span className="sr-only">Trier la file manager</span>
                        <ArrowDownUp size={16} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
                        <select
                            value={sortMode}
                            onChange={(event) => setSortMode(event.target.value as SortMode)}
                            aria-label="Trier la file manager"
                            className={cn(
                                'h-10 w-full appearance-none rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm font-medium text-slate-100 outline-none transition focus:border-emerald-500/60',
                                focusRing,
                            )}
                        >
                            <option value="severity">Criticité puis échéance</option>
                            <option value="dueAt">Échéance la plus proche</option>
                            <option value="category">Type de problème</option>
                        </select>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={from}
                            onChange={(event) => setFrom(event.target.value)}
                            aria-label="Date de début de la file manager"
                            aria-invalid={hasInvalidPeriod}
                            aria-describedby={hasInvalidPeriod ? 'manager-worklist-period-error' : undefined}
                            className={cn(
                                'h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-medium text-slate-100 outline-none transition focus:border-emerald-500/60',
                                focusRing,
                            )}
                        />
                        <input
                            type="date"
                            value={to}
                            onChange={(event) => setTo(event.target.value)}
                            aria-label="Date de fin de la file manager"
                            aria-invalid={hasInvalidPeriod}
                            aria-describedby={hasInvalidPeriod ? 'manager-worklist-period-error' : undefined}
                            className={cn(
                                'h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-medium text-slate-100 outline-none transition focus:border-emerald-500/60',
                                focusRing,
                            )}
                        />
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="min-h-[520px] rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-white">Problèmes ouverts</h2>
                            <p className="text-xs text-slate-500">{filteredItems.length} item(s) affiché(s) sur {worklistQuery.data?.total || 0}</p>
                        </div>
                        {worklistQuery.isFetching && (
                            <Loader2 role="status" aria-label="Actualisation de la file manager" size={18} className="animate-spin text-emerald-400" />
                        )}
                    </div>

                    {worklistQuery.isLoading && <WorklistSkeleton />}

                    {worklistQuery.isError && (
                        <ApiErrorState
                            title="File manager indisponible"
                            message={getApiError(worklistQuery.error)}
                            onRetry={() => worklistQuery.refetch()}
                            isRetrying={worklistQuery.isFetching}
                            compact
                        />
                    )}

                    {!worklistQuery.isLoading && !worklistQuery.isError && filteredItems.length === 0 && (
                        <EmptyState
                            title="Aucune correction à traiter"
                            message="La période sélectionnée ne contient pas de repos insuffisant, surcharge, compétence manquante ou conflit congé visible avec ces filtres."
                            icon={CheckCircle2}
                            tone="emerald"
                        />
                    )}

                    <div className="space-y-3">
                        {filteredItems.map((item) => {
                            const CategoryIcon = categoryIcons[item.category];
                            const isSelected = item.id === selectedId;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => openItem(item)}
                                    className={cn(
                                        'w-full rounded-lg border p-4 text-left transition',
                                        focusRing,
                                        isSelected
                                            ? 'border-emerald-500/60 bg-emerald-500/10'
                                            : 'border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/70',
                                    )}
                                    aria-label={`Ouvrir le guidage pour ${item.title}`}
                                    aria-pressed={isSelected}
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={cn('rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-wider', severityStyles[item.severity])}>
                                                    {severityLabels[item.severity]}
                                                </span>
                                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">
                                                    <CategoryIcon size={13} />
                                                    {categoryLabels[item.category]}
                                                </span>
                                                <span className="rounded-md bg-slate-950 px-2 py-1 text-[11px] font-mono text-slate-400">{item.ruleCode}</span>
                                            </div>
                                            <h3 className="mt-3 break-words text-base font-bold text-white">{item.title}</h3>
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                                <span className="inline-flex items-center gap-1"><UserRound size={13} />{getAgentName(item.agentId, agents)}</span>
                                                {item.shiftId && <span>Shift #{item.shiftId}</span>}
                                                {item.alertId && <span>Alerte #{item.alertId}</span>}
                                                <span>{formatDateTime(item.dueAt || item.detectedAt)}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-300">Ouvrir le guidage</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <aside className="rounded-lg border border-slate-800 bg-slate-900 p-5 xl:sticky xl:top-0 xl:max-h-[calc(100vh-120px)] xl:overflow-y-auto">
                    {!selectedItem && (
                        <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                            <AlertTriangle size={40} className="text-slate-600" />
                            <h2 className="mt-4 text-lg font-bold text-white">Sélectionnez un problème</h2>
                            <p className="mt-2 text-sm text-slate-500">Le détail conformité et les actions disponibles apparaîtront ici.</p>
                        </div>
                    )}

                    {selectedItem && (
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className={cn('rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-wider', severityStyles[selectedItem.severity])}>
                                            {severityLabels[selectedItem.severity]}
                                        </span>
                                        <h2 className="mt-3 break-words text-xl font-black text-white">{selectedItem.title}</h2>
                                    </div>
                                    <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-mono text-slate-500">#{selectedItem.id}</span>
                                </div>
                                <p className="mt-2 text-sm text-slate-400">{categoryLabels[selectedItem.category]} pour {selectedAgentName}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <DetailValue label="Rule code" value={selectedItem.ruleCode} />
                                <DetailValue label="Source" value={selectedItem.source} />
                                <DetailValue label="Agent" value={selectedAgentName} />
                                <DetailValue label="Échéance" value={formatDateTime(selectedItem.dueAt || selectedItem.detectedAt)} />
                            </div>

                            {compactMetadata(selectedItem.metadata).length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Metadata utile</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {compactMetadata(selectedItem.metadata).map(([key, value]) => (
                                            <DetailValue key={key} label={key} value={value} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <GuidancePanel
                                guidance={guidanceQuery.data}
                                isLoading={guidanceQuery.isLoading}
                                isFetching={guidanceQuery.isFetching}
                                isError={guidanceQuery.isError}
                                error={guidanceQuery.error}
                                onRetry={() => guidanceQuery.refetch()}
                            />
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

const GuidancePanel = ({
    guidance,
    isLoading,
    isFetching,
    isError,
    error,
    onRetry,
}: {
    guidance?: CorrectionGuidanceResponse;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: unknown;
    onRetry: () => void;
}) => {
    if (isLoading) {
        return (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950 p-5" role="status" aria-label="Chargement du guidage de correction">
                <SkeletonBlock className="h-5 w-2/3" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-28" />
            </div>
        );
    }

    if (isError) {
        return (
            <ApiErrorState
                title="Guidage indisponible"
                message={getApiError(error)}
                onRetry={onRetry}
                retryLabel="Recharger le guidage"
                isRetrying={isFetching}
                compact
            />
        );
    }

    if (!guidance) return null;

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">Pourquoi ce point est bloqué</div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {guidance.reasons.map((reason) => (
                        <span key={reason} className="rounded-md bg-slate-950/70 px-2 py-1 text-xs font-mono text-emerald-100">{reason}</span>
                    ))}
                </div>
                {guidance.validation && (
                    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">Validation structurée</span>
                            <span className={cn('rounded-md px-2 py-1 text-xs font-bold', guidance.validation.isValid ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300')}>
                                {guidance.validation.isValid ? 'Conforme' : 'Bloquant'}
                            </span>
                        </div>
                        {guidance.validation.warnings.length > 0 && (
                            <p className="mt-2 text-xs text-amber-300">{guidance.validation.warnings.join(', ')}</p>
                        )}
                    </div>
                )}
            </div>

            <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Actions disponibles</h3>
                {guidance.availableActions.length === 0 ? (
                    <EmptyState
                        title="Aucune action ouverte"
                        message="Ce point doit être traité hors action automatisée ou après une nouvelle validation."
                        icon={CheckCircle2}
                        compact
                    />
                ) : (
                    <div className="space-y-2">
                        {guidance.availableActions.map((action) => (
                            <div key={action.code} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="break-words font-bold text-white">{action.label}</div>
                                        {action.description && <p className="mt-1 text-sm text-slate-400">{action.description}</p>}
                                    </div>
                                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300">{action.method}</span>
                                </div>
                                <div className="mt-3 break-all rounded-md bg-slate-900 px-2 py-1 font-mono text-xs text-slate-400">{action.endpoint}</div>
                                <div className="mt-2 text-xs text-slate-500">Permissions: {action.permissions.join(', ')}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
