import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, AlertTriangle, CheckCircle, Clock, Search, Calendar, UserX, MapPin } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../store/useAuth';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttendanceReport {
    agent: {
        id: number;
        firstName: string;
        lastName: string;
        jobTitle: string;
        serviceName: string;
    };
    shift: {
        id: number;
        start: string;
        end: string;
        type: string;
    } | null;
    attendance: {
        firstIn: string | null;
        firstInSource: string | null;
        firstInLocation: string | null;
        lastOut: string | null;
        delayMinutes: number;
        lateTolerance: number;
    };
    status: 'OFF' | 'EXTRA_SHIFT' | 'PRESENT_ON_TIME' | 'LATE' | 'ABSENT' | 'PLANNED';
}

export const AttendancePage = () => {
    const { token, impersonatedTenantId, user } = useAuth();
    const isAgent = user?.role === 'AGENT';
    const [search, setSearch] = useState('');

    const { data: reports, isLoading } = useQuery<AttendanceReport[]>({
        queryKey: ['dailyAttendanceStatus', impersonatedTenantId],
        queryFn: async () => {
            const res = await api.get('/api/attendance/daily-status', {
                params: { tenantId: impersonatedTenantId || 'HGD-DOUALA' }
            });
            return res.data;
        },
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    const getStatusStyle = (status: AttendanceReport['status']) => {
        switch (status) {
            case 'PRESENT_ON_TIME': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'EXTRA_SHIFT': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'LATE': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'ABSENT': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'PLANNED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            default: return 'bg-zinc-800/50 text-zinc-500 border-zinc-800';
        }
    };

    const getStatusLabel = (status: AttendanceReport['status']) => {
        switch (status) {
            case 'PRESENT_ON_TIME': return 'Présent (À l\'heure)';
            case 'EXTRA_SHIFT': return 'Heure Supp. (Non planifié)';
            case 'LATE': return 'En Retard';
            case 'ABSENT': return 'Absent';
            case 'PLANNED': return 'Prévu plus tard';
            default: return 'Repos';
        }
    };

    if (isLoading) return <div className="p-8 text-white">Chargement des logs des pointeuses...</div>;

    let filteredReports = reports?.filter(r => 
        (r.agent.firstName?.toLowerCase() || '').includes(search.toLowerCase()) || 
        (r.agent.lastName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        r.agent.serviceName.toLowerCase().includes(search.toLowerCase())
    ) || [];

    if (isAgent) {
        filteredReports = filteredReports.filter(r => r.agent.id === user?.id);
    }

    // KPI Calc
    const plannedAgents = reports?.filter(r => r.shift !== null).length || 0;
    const presents = reports?.filter(r => ['PRESENT_ON_TIME', 'LATE'].includes(r.status)).length || 0;
    const absents = reports?.filter(r => r.status === 'ABSENT').length || 0;
    const lates = reports?.filter(r => r.status === 'LATE').length || 0;

    // Micro-lateness detection
    const microLates = reports?.filter(r => r.attendance.delayMinutes > 0 && r.attendance.delayMinutes <= r.attendance.lateTolerance).length || 0;

    return (
        <div className="p-8 space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Clock className="text-blue-500" /> {isAgent ? "Mes Pointages" : "Tour de Contrôle : Assiduité"}
                    </h1>
                    <p className="text-slate-400 mt-2">Suivi instantané {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
                </div>
            </div>

            {/* KPIs */}
            {!isAgent && (
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2"><Calendar size={16}/> Effectif Prévu</div>
                    <div className="text-4xl font-bold text-white">{plannedAgents}</div>
                </div>
                <div className="bg-emerald-950 border border-emerald-900/50 rounded-3xl p-6">
                    <div className="text-emerald-400 text-sm font-medium mb-2 flex items-center gap-2"><CheckCircle size={16}/> Présents</div>
                    <div className="text-4xl font-bold text-emerald-400">{presents}</div>
                </div>
                <div className="bg-amber-950 border border-amber-900/50 rounded-3xl p-6">
                    <div className="text-amber-500 text-sm font-medium mb-2 flex items-center gap-2"><Clock size={16}/> Retards</div>
                    <div className="text-4xl font-bold text-amber-500">{lates}</div>
                </div>
                <div className="bg-rose-950 border border-rose-900/50 rounded-3xl p-6">
                    <div className="text-rose-500 text-sm font-medium mb-2 flex items-center gap-2"><UserX size={16}/> Absents (Non Signalé)</div>
                    <div className="text-4xl font-bold text-rose-500">{absents}</div>
                </div>
                <div className="bg-indigo-950 border border-indigo-900/50 rounded-3xl p-6 relative overflow-hidden">
                    <div className="text-indigo-400 text-sm font-medium mb-2 flex items-center gap-2 relative z-10"><AlertTriangle size={16}/> Micro-Retards (Furtifs)</div>
                    <div className="text-4xl font-bold text-indigo-400 relative z-10">{microLates}</div>
                    <div className="absolute -bottom-6 -right-6 text-indigo-500/10"><AlertTriangle size={100} /></div>
                </div>
            </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                {!isAgent && (
                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher un agent ou service..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                <th className="py-4 px-4 font-medium">Agent</th>
                                <th className="py-4 px-4 font-medium">Service</th>
                                <th className="py-4 px-4 font-medium">Planning (Théorique)</th>
                                <th className="py-4 px-4 font-medium">Pointage Réel (IN)</th>
                                <th className="py-4 px-4 font-medium">Retard Constaté</th>
                                <th className="py-4 px-4 font-medium">Statut En Temps Réel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map(r => (
                                <tr key={r.agent.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="font-medium text-white">{r.agent.firstName} {r.agent.lastName}</div>
                                        <div className="text-xs text-slate-500">{r.agent.jobTitle}</div>
                                    </td>
                                    <td className="py-4 px-4 text-slate-400">
                                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs">{r.agent.serviceName}</span>
                                    </td>
                                    <td className="py-4 px-4 text-slate-300">
                                        {r.shift ? (
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-blue-400" />
                                                {format(new Date(r.shift.start), 'HH:mm')} - {format(new Date(r.shift.end), 'HH:mm')}
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 italic">Repos</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4">
                                        {r.attendance.firstIn ? (
                                            <div className="flex items-center gap-2">
                                                <div className="font-mono text-emerald-400">{format(new Date(r.attendance.firstIn), 'HH:mm:ss')}</div>
                                                {r.attendance.firstInSource === 'WHATSAPP' && r.attendance.firstInLocation && (
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${r.attendance.firstInLocation}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Voir la localisation GPS du pointage sur Google Maps"
                                                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500/20 transition-colors"
                                                    >
                                                        <MapPin size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4">
                                        {r.attendance.delayMinutes > 0 ? (
                                            <span className={clsx("font-bold text-sm", r.status === 'LATE' ? 'text-rose-500' : 'text-indigo-400')}>
                                                +{r.attendance.delayMinutes} min
                                                {r.status !== 'LATE' && <span className="ml-2 text-xs font-normal opacity-70">(Toléré)</span>}
                                            </span>
                                        ) : (r.attendance.firstIn && r.shift ? <span className="text-emerald-500 text-sm">À l'heure</span> : <span className="text-slate-600">-</span>)}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={clsx("px-3 py-1 rounded-full text-xs font-bold border", getStatusStyle(r.status))}>
                                            {getStatusLabel(r.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredReports.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            Aucun agent correspondant à la recherche.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
