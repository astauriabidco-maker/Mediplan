import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HeartPulse, Activity, Zap, ShieldAlert, Moon, Clock, User, CheckCircle2 } from 'lucide-react';
import { fetchQvtDashboard, QvtAgentAnalysis } from '../api/qvt.api';
import { useAuth } from '../store/useAuth';

export const QvtPage = () => {
    const { user } = useAuth();
    
    // Admin & Managers load the global dashboard logic
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['qvtDashboard'],
        queryFn: () => fetchQvtDashboard(),
        refetchInterval: 60000 // Refresh every minute
    });

    const isGlobalView = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    // Calculate score percentage (mapping score 0-15 to an arbitrary 0-100% risk)
    const getRiskPercentage = (score: number) => Math.min(Math.round((score / 15) * 100), 100);
    const getScoreColor = (score: number) => {
        if (score > 10) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        if (score > 5) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    const globalScore = dashboardData?.globalScore || 0;
    const AgentsAtRisk = dashboardData?.agents.filter(a => a.score > 5) || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-700 rounded-xl shadow-lg shadow-rose-900/20">
                        <HeartPulse size={28} className="text-white" />
                    </div>
                    Santé & QVT
                </h1>
                <p className="text-slate-400">Qualité de Vie au Travail et prévention de la fatigue du personnel.</p>
            </div>

            {/* Global Hospital Index (Only for admins) */}
            {isGlobalView && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Indice de Fatigue Global</h3>
                        
                        <div className="flex items-center gap-6">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" className="stroke-slate-800" strokeWidth="8" fill="none" />
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        className={`${globalScore > 5 ? 'stroke-rose-500' : 'stroke-emerald-500'} transition-all duration-1000 ease-out`} 
                                        strokeWidth="8" fill="none" 
                                        strokeDasharray="283" 
                                        strokeDashoffset={283 - (283 * getRiskPercentage(globalScore)) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black text-white">{globalScore}</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score</span>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <ShieldAlert size={18} className={AgentsAtRisk.length > 0 ? "text-amber-500" : "text-slate-600"} />
                                        <span className="text-sm font-bold text-slate-300">Agents en Surrégime</span>
                                    </div>
                                    <span className="text-xl font-bold tracking-tight text-white">{isLoading ? '-' : AgentsAtRisk.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <Moon size={18} className="text-indigo-400" />
                                        <span className="text-sm font-bold text-slate-300">Nuits (Derniers 30j)</span>
                                    </div>
                                    <span className="text-xl font-bold tracking-tight text-white">{isLoading ? '-' : dashboardData?.metrics.totalNights}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-900/20 to-slate-900 border border-slate-800 p-8 rounded-3xl lg:col-span-2">
                        <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Activity size={16} /> Alertes Prioritaires
                        </h3>
                        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                            {AgentsAtRisk.length > 0 ? AgentsAtRisk.map((analysis, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/80 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-rose-400">
                                            {analysis.agent.nom.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{analysis.agent.nom}</p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                                {analysis.metrics.nbNights} Nuits • {analysis.metrics.nbLongShifts} Gardes Longues
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full border text-xs font-bold ${getScoreColor(analysis.score)}`}>
                                        Score : {analysis.score}
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-3">
                                    <CheckCircle2 size={32} className="text-emerald-500/50" />
                                    <p className="text-sm font-medium">Aucun agent en surrégime détecté.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed per-agent list (For admins, or standalone for single agent) */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <User size={16} /> 
                    {isGlobalView ? 'Analyse Détaillée du Personnel' : 'Mon Dossier Santé'}
                </h3>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <th className="pb-4 px-2">Professionnel</th>
                                <th className="pb-4 px-2 text-center">Nuits Cumulées</th>
                                <th className="pb-4 px-2 text-center">Gardes 24h</th>
                                <th className="pb-4 px-2 text-center">Heures Repos</th>
                                <th className="pb-4 px-2 text-right">Score Cumulé</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-500 italic">Analyse des algorithmes RH en cours...</td></tr>
                            ) : dashboardData?.agents.map((data: QvtAgentAnalysis) => (
                                <tr key={data.agent.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-blue-400">
                                                {data.agent.nom.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">{data.agent.nom}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center text-sm font-mono text-slate-300">
                                        {data.metrics.nbNights}
                                    </td>
                                    <td className="py-4 px-2 text-center text-sm font-mono text-slate-300">
                                        {data.metrics.nbLongShifts}
                                    </td>
                                    <td className="py-4 px-2 text-center text-sm font-mono text-emerald-400">
                                        {Math.floor(data.metrics.hoursRest)}h
                                    </td>
                                    <td className="py-4 px-2 text-right">
                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(data.score)}`}>
                                            {data.score > 0 ? data.score : '0'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {dashboardData?.agents.length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-slate-500 italic">Aucune donnée de garde à analyser.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
