import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Activity, Banknote, ShieldCheck } from 'lucide-react';
import { PageSkeleton, ApiErrorState } from '../../components/UIStates';

const StatCard = ({ title, value, icon: Icon, description, trend, tone = 'blue' }: any) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${tones[tone]} border`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
        {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
      </div>
    </div>
  );
};

export const MarketplaceDashboardPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace-analytics'],
    queryFn: async () => {
      const res = await api.get('/marketplace/analytics');
      return res.data;
    },
  });

  if (isLoading) return <PageSkeleton title="Dashboard Marketplace" rows={3} />;
  if (isError) return <ApiErrorState title="Erreur" message="Impossible de charger les KPI" />;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <TrendingUp className="text-emerald-500" />
            Performance Marketplace
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Mois en cours — Analyse de la bourse d'échange et d'affectation des gardes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Taux de Remplissage"
          value={`${data.fillRate}%`}
          icon={Activity}
          tone="emerald"
          trend="+12%"
          description="Des gardes pourvues par la marketplace"
        />
        <StatCard
          title="Total Candidatures"
          value={data.totalApplications}
          icon={Users}
          tone="blue"
          trend="+5"
          description="Postulées ce mois-ci"
        />
        <StatCard
          title="Gardes Pourvues"
          value={data.acceptedApplications}
          icon={ShieldCheck}
          tone="purple"
          description="Validées et conformes"
        />
        <StatCard
          title="Économie Intérim"
          value={`${data.avoidedCost} €`}
          icon={Banknote}
          tone="amber"
          description="Coût d'intérim externe évité estimé"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Tendances d'activité (7 jours)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPourvues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="candidatures" name="Candidatures reçues" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCand)" />
                <Area type="monotone" dataKey="pourvues" name="Gardes pourvues" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPourvues)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-6">Top Soignants (Fiabilité)</h2>
          {data.topCandidates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">Pas de données</div>
          ) : (
            <div className="space-y-4">
              {data.topCandidates.map((candidate: any, index: number) => (
                <div key={candidate.name} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      #{index + 1}
                    </div>
                    <span className="font-semibold text-slate-200">{candidate.name}</span>
                  </div>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded text-xs">
                    {candidate.value} gardes
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
