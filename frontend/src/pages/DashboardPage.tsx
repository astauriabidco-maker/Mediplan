import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, AlertCircle, Shield, Award, Heart, Sparkles, ChevronRight } from 'lucide-react';
import { InsightEngine } from '../components/InsightEngine';
import clsx from 'clsx';
import api from '../api/axios';
import { useAuth } from '../store/useAuth';

const formatCFA = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(value);
};

export const DashboardPage = () => {
    const { token, impersonatedTenantId } = useAuth();
    const tenantId = impersonatedTenantId || 'HGD-DOUALA';

    const { data: kpis, isLoading: isLoadingKpis } = useQuery({
        queryKey: ['analytics', 'kpis', tenantId],
        queryFn: async () => (await api.get('/api/analytics/kpis', { params: { tenantId } })).data
    });

    const { data: trends, isLoading: isLoadingTrends } = useQuery({
        queryKey: ['analytics', 'trends', tenantId],
        queryFn: async () => (await api.get('/api/analytics/trends', { params: { tenantId } })).data
    });

    const { data: services, isLoading: isLoadingServices } = useQuery({
        queryKey: ['analytics', 'services', tenantId],
        queryFn: async () => (await api.get('/api/analytics/services', { params: { tenantId } })).data
    });

    const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

    if (isLoadingKpis || isLoadingTrends || isLoadingServices) {
        return <div className="p-8 text-white">Création du rapport analytique...</div>;
    }

    return (
        <div className="p-8 space-y-8 animate-[fadeIn_0.5s_ease-out] max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tighter">
                        <Activity className="text-blue-500" size={36} /> Dashboard <span className="text-slate-500 font-light">MediPlan</span>
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium italic">Intelligence opérationnelle & Pilotage RH — {tenantId}</p>
                </div>
                <InsightEngine tenantId={tenantId} />
            </div>

            {/* AI Insights Quick Alert (Optional/New) */}
            {kpis?.healthAlerts?.value > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between group animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg shadow-rose-500/20">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <div className="text-rose-500 font-bold">ALERTE COMPLIANCE SANTÉ</div>
                            <div className="text-sm text-rose-500/70">{kpis.healthAlerts.value} agents ont des visites médicales obligatoires expirées. Le planning est partiellement bloqué.</div>
                        </div>
                    </div>
                    <button onClick={() => window.location.href='/agents'} className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-all">
                        Régregulariser <ChevronRight size={16} />
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
                {/* NEW GPEC 카드 */}
                <KpiCard 
                    title="Conformité GPEC" 
                    value={`${kpis?.gpecConformity?.value || 0}%`} 
                    growth={kpis?.gpecConformity?.growth} 
                    icon={<Award className="text-purple-500" />}
                    color="purple"
                    compact
                />
                {/* NEW HEALTH 카드 */}
                <KpiCard 
                    title="Alertes Santé" 
                    value={kpis?.healthAlerts?.value || 0} 
                    growth={0} 
                    icon={<Shield className="text-red-500" />}
                    color="red"
                    compact
                    isCritical={kpis?.healthAlerts?.value > 0}
                />
                {/* NEW QVT 카드 */}
                <KpiCard 
                    title="Indice QVT" 
                    value={`${kpis?.qvtIndex?.value || 0}/100`} 
                    growth={kpis?.qvtIndex?.growth} 
                    icon={<Heart className="text-pink-500" />}
                    color="pink"
                    compact
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Évolution de la Masse Salariale sur 6 mois</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends || []} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMasseSalariale" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorOvertime" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M FCFA`} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                                    formatter={(value: any) => [formatCFA(Number(value) || 0), undefined]}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="masseSalariale" name="Masse Salariale Nette" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMasseSalariale)" />
                                <Area type="monotone" dataKey="coutGardes" name="Coût Gardes/Heures Supp." stroke="#f43f5e" fillOpacity={1} fill="url(#colorOvertime)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Services Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Répartition par Service</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={services || []} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" axisLine={false} tickLine={false} width={80} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                                    formatter={(value: any, name: any) => [String(name) === 'coutsGénérés' ? formatCFA(Number(value) || 0) : value, String(name) === 'coutsGénérés' ? 'Coût Total' : String(name)]}
                                    cursor={{fill: '#334155', opacity: 0.2}}
                                />
                                <Bar dataKey="coutsGénérés" name="Coût Total Régulier" radius={[0, 4, 4, 0]} barSize={20}>
                                    {
                                        (services || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

const KpiCard = ({ title, value, growth, icon, color, compact, isCritical }: any) => {
    return (
        <div className={clsx(
            "bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden group transition-all duration-300",
            isCritical ? "border-rose-500/50 bg-rose-500/5" : "hover:border-slate-700 hover:bg-slate-800/50"
        )}>
            <div className="flex justify-between items-start mb-3">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</div>
                <div className={clsx(`p-2 bg-${color}-500/10 rounded-xl`, isCritical && "animate-pulse")}>{icon}</div>
            </div>
            
            <div className={clsx(
                "font-black text-white relative z-10 tracking-tight",
                compact ? "text-xl" : "text-3xl"
            )}>{value}</div>
            
            {growth !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                    <span className={clsx(
                        "text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5",
                        growth > 0 ? "bg-emerald-500/20 text-emerald-400" : (growth < 0 ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-400")
                    )}>
                        {growth > 0 ? <TrendingUp size={10} /> : (growth < 0 ? <TrendingDown size={10} /> : null)}
                        {growth > 0 ? '+' : ''}{growth}%
                    </span>
                </div>
            )}

            {/* Decorative background flare */}
            <div className={clsx(
                "absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40",
                `bg-${color}-500`
            )} />
        </div>
    );
};
