import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, AlertCircle } from 'lucide-react';
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
        <div className="p-8 space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Activity className="text-blue-500" /> Tableau de Bord Décisionnel
                    </h1>
                    <p className="text-slate-400 mt-2">Vue consolidée RH et Financière - {tenantId}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Masse Salariale Mensuelle" 
                    value={formatCFA(kpis?.masseSalariale?.value || 0)} 
                    growth={kpis?.masseSalariale?.growth} 
                    icon={<DollarSign className="text-blue-500" />}
                    color="blue"
                />
                <KpiCard 
                    title="Coût Heures Supp. & Gardes" 
                    value={formatCFA(kpis?.coutHeuresSupp?.value || 0)} 
                    growth={kpis?.coutHeuresSupp?.growth} 
                    icon={<AlertCircle className="text-rose-500" />}
                    color="rose"
                />
                <KpiCard 
                    title="Taux d'Absentéisme" 
                    value={`${kpis?.tauxAbsentéisme?.value || 0}%`} 
                    growth={kpis?.tauxAbsentéisme?.growth} 
                    icon={<TrendingDown className="text-amber-500" />}
                    color="amber"
                />
                <KpiCard 
                    title="Effectif Actif" 
                    value={kpis?.effectifActif?.value || 0} 
                    growth={kpis?.effectifActif?.growth} 
                    icon={<Users className="text-emerald-500" />}
                    color="emerald"
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

const KpiCard = ({ title, value, growth, icon, color }: any) => {
    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-${color}-500/50 transition-colors`}>
            <div className="flex justify-between items-start mb-4">
                <div className="text-slate-400 text-sm font-medium">{title}</div>
                <div className={`p-2 bg-${color}-500/10 rounded-xl`}>{icon}</div>
            </div>
            
            <div className="text-3xl font-bold text-white mb-2 relative z-10">{value}</div>
            
            {growth !== undefined && (
                <div className="flex items-center gap-1 mt-3">
                    <span className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                        growth > 0 ? "bg-emerald-500/20 text-emerald-400" : (growth < 0 ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-400")
                    )}>
                        {growth > 0 ? <TrendingUp size={12} /> : (growth < 0 ? <TrendingDown size={12} /> : null)}
                        {growth > 0 ? '+' : ''}{growth}%
                    </span>
                    <span className="text-xs text-slate-500">vs mois précédent</span>
                </div>
            )}
        </div>
    );
};
