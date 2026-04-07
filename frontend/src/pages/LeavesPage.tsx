import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi, LeaveType, LeaveStatus, Leave, LeaveBalance } from '../api/leaves.api';
import { fetchMyTeam, Agent } from '../api/agents.api';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Loader2, AlertCircle, FileText, User, Battery, BatteryFull, BatteryMedium } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../utils/cn';
import { useAuth } from '../store/useAuth';

// Helper for safe date formatting
const safeFormat = (dateStr: string, pattern: string) => {
    try {
        if (!dateStr) return 'Date inconnue';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Date invalide';
        return format(date, pattern, { locale: fr });
    } catch (e) {
        return 'Date invalide';
    }
};

const safeDaysDiff = (startStr: string, endStr: string) => {
    try {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return Math.max(0, differenceInDays(end, start));
    } catch (e) {
        return 0;
    }
};

function LeaveCard({ leave }: { leave: Leave }) {
    const statusConfig = {
        [LeaveStatus.PENDING]: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock, label: 'En attente' },
        [LeaveStatus.APPROVED]: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle, label: 'Validé' },
        [LeaveStatus.REJECTED]: { color: 'text-rose-400', bg: 'bg-rose-400/10', icon: XCircle, label: 'Refusé' },
    }[leave.status] || { color: 'text-slate-400', bg: 'bg-slate-400/10', icon: AlertCircle, label: leave.status };

    const StatusIcon = statusConfig.icon;

    return (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all duration-300">
            <div className="flex items-center gap-5">
                <div className={cn("p-4 rounded-2xl shadow-lg", statusConfig.bg, statusConfig.color)}>
                    <StatusIcon size={28} />
                </div>
                <div>
                    <h4 className="font-bold text-white text-lg">{leave.type.replace(/_/g, ' ')}</h4>
                    <p className="text-slate-400">
                        {safeFormat(leave.start, 'dd MMMM')} - {safeFormat(leave.end, 'dd MMMM yyyy')}
                    </p>
                    {leave.rejectionReason && (
                        <p className="text-rose-400/80 text-sm mt-1 flex items-center gap-1 italic">
                            <AlertCircle size={12} />
                            Refus: {leave.rejectionReason}
                        </p>
                    )}
                </div>
            </div>
            <div className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm", statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
            </div>
        </div>
    );
}

function MyLeavesView({ leaves, isLoading, onNewRequest }: { leaves: Leave[], isLoading: boolean, onNewRequest: () => void }) {
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-slate-400 font-medium animate-pulse">Chargement de vos demandes...</p>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-blue-500" size={20} />
                    Historique
                </h2>
                <button
                    onClick={onNewRequest}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black transition-all duration-300 shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <Plus size={20} />
                    Nouvelle Demande
                </button>
            </div>

            <div className="grid gap-4">
                {(!leaves || leaves.length === 0) ? (
                    <div className="text-center p-20 bg-slate-900/40 rounded-3xl border-2 border-slate-800 border-dashed group hover:border-slate-700 transition-colors">
                        <Calendar className="mx-auto h-16 w-16 text-slate-800 mb-4 group-hover:text-slate-700 transition-colors" />
                        <p className="text-slate-500 text-lg font-medium">Vous n'avez pas encore fait de demande.</p>
                        <button onClick={onNewRequest} className="mt-4 text-blue-500 hover:text-blue-400 font-bold underline">Faire une demande maintenant</button>
                    </div>
                ) : (
                    leaves.map((leave) => (
                        <LeaveCard key={leave.id} leave={leave} />
                    ))
                )}
            </div>
        </div>
    );
}

function BalancesWidget({ balances, isLoading }: { balances?: LeaveBalance[], isLoading: boolean }) {
    if (isLoading) return <div className="h-24 rounded-3xl bg-slate-900/50 animate-pulse border border-slate-800" />;

    if (!balances || balances.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {balances.map(b => {
                const remaining = b.allowance - b.consumed;
                const percent = Math.min(100, Math.max(0, (remaining / b.allowance) * 100));
                
                let batteryColor = 'text-blue-500';
                let BatteryIcon = BatteryFull;
                if (percent < 25) { batteryColor = 'text-rose-500'; BatteryIcon = Battery; }
                else if (percent < 60) { batteryColor = 'text-amber-500'; BatteryIcon = BatteryMedium; }

                return (
                    <div key={b.id} className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <BatteryIcon size={80} className={batteryColor} />
                        </div>
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Solde Acquis</p>
                                <h3 className="text-xl font-black text-white">{b.type.replace(/_/g, ' ')}</h3>
                            </div>
                            <div className={cn("px-3 py-1.5 rounded-xl font-black text-sm", percent < 25 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300')}>
                                {b.year}
                            </div>
                        </div>

                        <div className="mt-6 relative z-10">
                            <div className="flex items-end gap-2 mb-3">
                                <span className={cn("text-5xl font-black tracking-tighter", batteryColor)}>{remaining}</span>
                                <span className="text-slate-500 font-bold mb-1">/ {b.allowance} j.</span>
                            </div>
                            
                            {/* Wait, the progress bar */}
                            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden shadow-inner flex relative">
                                <div className={cn("h-full transition-all duration-1000 bg-current", batteryColor)} style={{ width: `${percent}%` }} />
                            </div>
                            <div className="flex justify-between mt-2 text-xs font-bold text-slate-500">
                                <span>{b.consumed} consommés</span>
                                <span>{remaining} restants</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TeamValidationView({ requests, isLoading }: { requests: Leave[], isLoading: boolean }) {
    const queryClient = useQueryClient();
    const validateMutation = useMutation({
        mutationFn: ({ id, status, reason }: { id: number, status: LeaveStatus.APPROVED | LeaveStatus.REJECTED, reason?: string }) =>
            leavesApi.validateLeave(id, status, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-requests'] });
            queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
        }
    });

    if (isLoading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="text-emerald-500" size={20} />
                Demandes en attente
            </h2>

            {(!requests || requests.length === 0) ? (
                <div className="text-center p-20 bg-slate-900/40 rounded-3xl border-2 border-slate-800 border-dashed">
                    <CheckCircle className="mx-auto h-20 w-20 text-emerald-500/10 mb-6" />
                    <p className="text-slate-500 text-xl font-medium italic">Aucune demande en attente. Votre équipe est au complet !</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {requests.map(req => {
                        const days = differenceInDays(new Date(req.end), new Date(req.start));
                        
                        // AI Audit Risk Level
                        let aiRiskColor = 'bg-slate-800 text-slate-300 border-slate-700/50';
                        let aiIconColor = 'text-green-500';
                        if (req.isAutoRejected) {
                            aiRiskColor = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                            aiIconColor = 'text-rose-500';
                        } else if (req.aiScore && req.aiScore > 50) {
                            aiRiskColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                            aiIconColor = 'text-amber-500';
                        }

                        return (
                            <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
                                {req.status === LeaveStatus.APPROVED && <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle size={100} className="text-green-500" /></div>}
                                {req.status === LeaveStatus.REJECTED && <div className="absolute top-0 right-0 p-4 opacity-5"><XCircle size={100} className="text-rose-500" /></div>}

                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shrink-0">
                                                <User className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-lg">{req.agent?.firstName} {req.agent?.lastName}</p>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{req.type.replace(/_/g, ' ')}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm",
                                            req.status === LeaveStatus.PENDING ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                                req.status === LeaveStatus.APPROVED ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                    "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        )}>
                                            {req.status}
                                        </span>
                                    </div>

                                    {/* Banner Vigie IA */}
                                    {(req.aiRecommendation || req.isAutoRejected) && (
                                        <div className={cn("mb-4 rounded-2xl p-4 border text-sm flex gap-3 backdrop-blur-sm", aiRiskColor)}>
                                            <AlertCircle className={cn("shrink-0 mt-0.5", aiIconColor)} size={18} />
                                            <div>
                                                <p className="font-bold mb-1 flex items-center gap-2">
                                                    Audit IA
                                                    {req.aiScore !== undefined && (
                                                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] uppercase font-black bg-slate-950/50")}>
                                                            Score de risque: {req.aiScore}/100
                                                        </span>
                                                    )}
                                                    {req.isAutoRejected && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-black bg-rose-500 text-white">
                                                            Blocage Légal
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-opacity-80 leading-snug">{req.aiRecommendation}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-6 text-sm text-slate-300">
                                        <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                            <div className="flex gap-2">
                                                <Calendar size={16} className="text-blue-500" />
                                                <span>Du <span className="font-bold text-white">{format(new Date(req.start), 'dd MMM yyyy', { locale: fr })}</span> au <span className="font-bold text-white">{format(new Date(req.end), 'dd MMM yyyy', { locale: fr })}</span></span>
                                            </div>
                                            <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">{days} jours</span>
                                        </div>
                                        <p className="text-slate-400 line-clamp-2"><span className="text-slate-500">Motif:</span> {req.reason}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end mt-4">
                                    <button
                                        onClick={() => {
                                            const reason = prompt("Raison du refus (obligatoire) :");
                                            if (reason) validateMutation.mutate({ id: req.id, status: LeaveStatus.REJECTED, reason });
                                        }}
                                        className="px-6 py-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-black flex items-center gap-2 active:scale-95"
                                    >
                                        <XCircle size={18} />
                                        Refuser
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm("Valider cette demande de congé ?")) {
                                                validateMutation.mutate({ id: req.id, status: LeaveStatus.APPROVED });
                                            }
                                        }}
                                        className="px-6 py-4 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all font-black flex items-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/10"
                                    >
                                        <CheckCircle size={18} />
                                        Approuver
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function NewRequestModal({ onClose, teamAgents }: { onClose: () => void, teamAgents: Agent[] }) {
    const queryClient = useQueryClient();
    // First agent in the list is the current user (from my-team endpoint)
    const currentAgentId = teamAgents.length > 0 ? teamAgents[0].id : undefined;
    const [formData, setFormData] = useState({
        agentId: currentAgentId,
        type: LeaveType.CONGE_ANNUEL,
        start: '',
        end: '',
        reason: ''
    });

    const mutation = useMutation({
        mutationFn: (data: any) => leavesApi.requestLeave({
            ...data,
            start: new Date(data.start),
            end: new Date(data.end)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
            queryClient.invalidateQueries({ queryKey: ['team-requests'] });
            onClose();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Simple client-side check if end is before start
        if (new Date(formData.end) <= new Date(formData.start)) {
            alert("La date de fin doit être après la date de début.");
            return;
        }

        mutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900/80 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden backdrop-saturate-150">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600" />

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tighter">Nouvelle Demande</h2>
                    <p className="text-slate-400">Soumettez votre absence pour validation.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {teamAgents.length > 1 && (
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Agent concerné</label>
                            <div className="relative">
                                <select
                                    value={formData.agentId}
                                    onChange={e => setFormData({ ...formData, agentId: Number(e.target.value) })}
                                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                                >
                                    {teamAgents.map((a, index) => (
                                        <option key={a.id} value={a.id}>
                                            {a.firstName} {a.nom} {index === 0 ? '(Moi)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Type de congé</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value as LeaveType })}
                            className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                        >
                            {Object.values(LeaveType).map(t => (
                                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Début</label>
                            <input
                                type="date"
                                required
                                value={formData.start}
                                onChange={e => setFormData({ ...formData, start: e.target.value })}
                                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-600 transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Fin</label>
                            <input
                                type="date"
                                required
                                value={formData.end}
                                onChange={e => setFormData({ ...formData, end: e.target.value })}
                                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-600 transition-all [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Motif</label>
                        <textarea
                            required
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                            className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:border-blue-600 transition-all placeholder:text-slate-700"
                            placeholder="Veuillez préciser la raison de votre demande..."
                        />
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="button" onClick={onClose} className="flex-1 py-5 hover:bg-slate-800 text-slate-500 font-black rounded-2xl transition-all tracking-tight underline-offset-4 hover:underline">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50"
                        >
                            {mutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            Envoyer {formData.agentId !== currentAgentId ? "pour l'agent" : "ma demande"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Main Component
export function LeavesPage() {
    const [activeTab, setActiveTab] = useState<'my-leaves' | 'team-validation'>('my-leaves');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Data Fetching with error handling
    const { data: myLeaves, isLoading: isLoadingMyLeaves, isError: isErrorMyLeaves, error: errorMyLeaves } = useQuery({
        queryKey: ['my-leaves'],
        queryFn: leavesApi.getMyLeaves
    });

    const { data: teamRequests, isLoading: isLoadingTeamRequests } = useQuery({
        queryKey: ['team-requests'],
        queryFn: leavesApi.getTeamRequests
    });

    const { data: myTeam } = useQuery({
        queryKey: ['my-team'],
        queryFn: fetchMyTeam
    });

    const { data: myBalances, isLoading: isLoadingBalances } = useQuery({
        queryKey: ['my-balances'],
        queryFn: () => leavesApi.getMyBalances()
    });

    if (isErrorMyLeaves) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center animate-in zoom-in-95 duration-500">
                <div className="p-8 bg-rose-500/10 border-2 border-rose-500/20 rounded-[2.5rem] max-w-md shadow-2xl shadow-rose-500/5">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                        <AlertCircle size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">Erreur de connexion</h3>
                    <p className="text-slate-400 font-medium leading-relaxed">
                        {(errorMyLeaves as any)?.message || "Impossible de récupérer les données des congés pour le moment."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-10 bg-blue-600 rounded-full" />
                    <h1 className="text-6xl font-black tracking-tighter text-white">Congés</h1>
                </div>
                <p className="text-slate-500 text-xl font-medium max-w-2xl leading-relaxed">
                    Gérez vos absences, consultez vos soldes et gardez un œil sur la disponibilité de votre équipe au sein de l'HGD.
                </p>
            </div>

            {/* Balances Widget */}
            <BalancesWidget balances={myBalances} isLoading={isLoadingBalances} />

            {/* Premium UI Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800/50 rounded-2xl md:w-fit shadow-xl">
                <button
                    onClick={() => setActiveTab('my-leaves')}
                    className={cn(
                        "px-8 py-3.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2",
                        activeTab === 'my-leaves'
                            ? "bg-slate-800 text-white shadow-lg ring-1 ring-white/5"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    )}
                >
                    <FileText size={16} />
                    Mes Demandes
                </button>
                <button
                    onClick={() => setActiveTab('team-validation')}
                    className={cn(
                        "px-8 py-3.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center gap-2",
                        activeTab === 'team-validation'
                            ? "bg-slate-800 text-white shadow-lg ring-1 ring-white/5"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    )}
                >
                    <CheckCircle size={16} />
                    Validation Équipe
                    {teamRequests && teamRequests?.length > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                            {teamRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Tabbed Content */}
            <div className="min-h-[500px] animate-in fade-in zoom-in-95 duration-500">
                {activeTab === 'my-leaves' ? (
                    <MyLeavesView
                        leaves={myLeaves || []}
                        isLoading={isLoadingMyLeaves}
                        onNewRequest={() => setIsModalOpen(true)}
                    />
                ) : (
                    <TeamValidationView
                        requests={teamRequests || []}
                        isLoading={isLoadingTeamRequests}
                    />
                )}
            </div>

            {isModalOpen && (
                <NewRequestModal onClose={() => setIsModalOpen(false)} teamAgents={myTeam || []} />
            )}
        </div>
    );
}
