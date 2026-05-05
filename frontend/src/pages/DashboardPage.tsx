import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  Shield,
  Award,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { InsightEngine } from '../components/InsightEngine';
import { clsx } from 'clsx';
import api from '../api/axios';
import { useAuth } from '../store/useAuth';

const DashboardAnalyticsCharts = lazy(() =>
  import('../components/dashboard/DashboardAnalyticsCharts').then((module) => ({
    default: module.DashboardAnalyticsCharts,
  })),
);
const CHARTS_IDLE_TIMEOUT_MS = 1200;

type IdleWindow = typeof window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const formatCFA = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
};

export const DashboardPage = () => {
  const { impersonatedTenantId } = useAuth();
  const tenantId = impersonatedTenantId || 'HGD-DOUALA';
  const [dynamicWidgets, setDynamicWidgets] = useState<any[]>([]);
  const [hospitalServiceId, setHospitalServiceId] = useState<
    number | undefined
  >(undefined);
  const [shouldRenderCharts, setShouldRenderCharts] = useState(false);

  // Fetch services for the filter
  const { data: allServices } = useQuery({
    queryKey: ['hospital-services', tenantId],
    queryFn: async () =>
      (await api.get('/api/hospital-services', { params: { tenantId } })).data,
  });

  const { data: kpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ['analytics', 'kpis', tenantId, hospitalServiceId],
    queryFn: async () =>
      (
        await api.get('/api/analytics/kpis', {
          params: { tenantId, hospitalServiceId },
        })
      ).data,
  });

  const { data: trends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['analytics', 'trends', tenantId],
    queryFn: async () =>
      (await api.get('/api/analytics/trends', { params: { tenantId } })).data,
  });

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['analytics', 'services', tenantId],
    queryFn: async () =>
      (await api.get('/api/analytics/services', { params: { tenantId } })).data,
  });

  useEffect(() => {
    if (
      isLoadingKpis ||
      isLoadingTrends ||
      isLoadingServices ||
      shouldRenderCharts
    )
      return;

    const renderCharts = () => setShouldRenderCharts(true);
    const idleWindow = window as IdleWindow;
    let timeoutId: number | undefined;
    let idleCallbackId: number | undefined;

    const frameId = window.requestAnimationFrame(() => {
      if (idleWindow.requestIdleCallback) {
        idleCallbackId = idleWindow.requestIdleCallback(renderCharts, {
          timeout: CHARTS_IDLE_TIMEOUT_MS,
        });
        return;
      }

      timeoutId = window.setTimeout(renderCharts, 120);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (idleCallbackId !== undefined)
        idleWindow.cancelIdleCallback?.(idleCallbackId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [isLoadingKpis, isLoadingServices, isLoadingTrends, shouldRenderCharts]);

  const addWidget = useCallback((widget: any) => {
    // Avoid duplicates based on title
    setDynamicWidgets((prev) =>
      prev.find((w) => w.title === widget.title)
        ? prev
        : [widget, ...prev].slice(0, 4),
    );
  }, []);

  const removeWidget = useCallback((title: string) => {
    setDynamicWidgets((prev) => prev.filter((w) => w.title !== title));
  }, []);

  if (isLoadingKpis || isLoadingTrends || isLoadingServices) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="text-blue-500 animate-pulse" size={48} />
          <p className="text-slate-400 font-medium">
            Initialisation de l'Intelligence MediPlan...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-[fadeIn_0.5s_ease-out] max-w-[1600px] mx-auto pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tighter">
            <Activity className="text-blue-500" size={36} /> Dashboard{' '}
            <span className="text-slate-500 font-light">MediPlan</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-400 font-medium italic">
              Intelligence opérationnelle & Pilotage RH — {tenantId}
            </p>
            <div className="h-4 w-[1px] bg-slate-800 mx-2" />
            <select
              value={hospitalServiceId || ''}
              onChange={(e) =>
                setHospitalServiceId(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="bg-slate-900 border border-slate-800 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full hover:border-blue-500/50 transition-all outline-none"
            >
              <option value="">Vue Globale (Hôpital)</option>
              {allServices?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <InsightEngine tenantId={tenantId} onSelectWidget={addWidget} />
      </div>

      {/* AI Insights Quick Alert */}
      {kpis?.qvtAlerts?.value > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center justify-between group animate-in slide-in-from-top-4 duration-500 mt-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-500/20">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-orange-500 font-bold">
                ALERTE QVT & FATIGUE
              </div>
              <div className="text-sm text-orange-500/70">
                {kpis.qvtAlerts.value} anomalies détectées (Dépassement 48h,
                Repos {'<'} 11h, Trop de nuits). Risque légal et épuisement.
              </div>
            </div>
          </div>
          <button
            onClick={() => (window.location.href = '/planning')}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
          >
            Réassigner <ChevronRight size={16} />
          </button>
        </div>
      )}

      {kpis?.healthAlerts?.value > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between group animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg shadow-rose-500/20">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="text-rose-500 font-bold">
                ALERTE COMPLIANCE SANTÉ
              </div>
              <div className="text-sm text-rose-500/70">
                {kpis.healthAlerts.value} agents ont des visites médicales
                obligatoires expirées. Le planning est partiellement bloqué.
              </div>
            </div>
          </div>
          <button
            onClick={() => (window.location.href = '/agents')}
            className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all"
          >
            Régulariser <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard
          title="Masse Salariale"
          value={formatCFA(kpis?.masseSalariale?.value || 0)}
          growth={kpis?.masseSalariale?.growth}
          icon={<DollarSign className="text-blue-500" />}
          color="blue"
          compact
        />
        <KpiCard
          title="Gardes & Supp."
          value={formatCFA(kpis?.coutHeuresSupp?.value || 0)}
          growth={kpis?.coutHeuresSupp?.growth}
          icon={<AlertCircle className="text-rose-500" />}
          color="rose"
          compact
        />
        <KpiCard
          title="Absentéisme"
          value={`${kpis?.tauxAbsentéisme?.value || 0}%`}
          growth={kpis?.tauxAbsentéisme?.growth}
          icon={<TrendingDown className="text-amber-500" />}
          color="amber"
          compact
        />
        <KpiCard
          title="Effectif Actif"
          value={kpis?.effectifActif?.value || 0}
          growth={kpis?.effectifActif?.growth}
          icon={<Users className="text-emerald-500" />}
          color="emerald"
          compact
        />
        <KpiCard
          title="Conformité GPEC"
          value={`${kpis?.gpecConformity?.value || 0}%`}
          growth={kpis?.gpecConformity?.growth}
          icon={<Award className="text-purple-500" />}
          color="purple"
          compact
        />
        <KpiCard
          title="Alertes Santé"
          value={kpis?.healthAlerts?.value || 0}
          growth={0}
          icon={<Shield className="text-red-500" />}
          color="red"
          compact
          isCritical={kpis?.healthAlerts?.value > 0}
        />
        <KpiCard
          title="Indice QVT"
          value={`${kpis?.qvtIndex?.value || 0}/100`}
          growth={kpis?.qvtIndex?.growth}
          icon={<Heart className="text-pink-500" />}
          color="pink"
          compact
        />
      </div>

      {shouldRenderCharts ? (
        <Suspense
          fallback={
            <DashboardChartsFallback
              dynamicWidgetCount={dynamicWidgets.length}
            />
          }
        >
          <DashboardAnalyticsCharts
            dynamicWidgets={dynamicWidgets}
            services={services}
            trends={trends}
            formatCFA={formatCFA}
            onRemoveWidget={removeWidget}
          />
        </Suspense>
      ) : (
        <DashboardChartsFallback dynamicWidgetCount={dynamicWidgets.length} />
      )}
    </div>
  );
};

const DashboardChartsFallback = ({
  dynamicWidgetCount,
}: {
  dynamicWidgetCount: number;
}) => {
  return (
    <div className="space-y-6" aria-hidden="true">
      {dynamicWidgetCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: dynamicWidgetCount }).map((_, index) => (
            <div
              key={index}
              className="h-80 rounded-3xl border border-blue-500/20 bg-slate-900/60 animate-pulse"
            />
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[25rem] rounded-3xl border border-slate-800 bg-slate-900/60 animate-pulse" />
        <div className="h-[25rem] rounded-3xl border border-slate-800 bg-slate-900/60 animate-pulse" />
      </div>
    </div>
  );
};

const KpiCard = ({
  title,
  value,
  growth,
  icon,
  color,
  compact,
  isCritical,
}: any) => {
  return (
    <div
      className={clsx(
        'bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden group transition-all duration-300',
        isCritical
          ? 'border-rose-500/50 bg-rose-500/5'
          : 'hover:border-slate-700 hover:bg-slate-800/50 shadow-lg',
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          {title}
        </div>
        <div
          className={clsx(
            `p-2 bg-${color}-500/10 rounded-xl`,
            isCritical && 'animate-pulse',
          )}
        >
          {icon}
        </div>
      </div>
      <div
        className={clsx(
          'font-black text-white relative z-10 tracking-tight',
          compact ? 'text-xl' : 'text-3xl',
        )}
      >
        {value}
      </div>
      {growth !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={clsx(
              'text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5',
              growth > 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : growth < 0
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-500/20 text-slate-400',
            )}
          >
            {growth > 0 ? (
              <TrendingUp size={10} />
            ) : growth < 0 ? (
              <TrendingDown size={10} />
            ) : null}
            {growth}%
          </span>
        </div>
      )}
      <div
        className={clsx(
          'absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-3xl opacity-10 group-hover:opacity-25 transition-opacity',
          `bg-${color}-500`,
        )}
      />
    </div>
  );
};
