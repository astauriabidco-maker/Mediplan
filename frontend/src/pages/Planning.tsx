import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../store/useAuth';
import { format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppConfig } from '../store/useAppConfig';
import { fetchShifts, generatePlanning, publishPlanning, updateShift, fetchLeaves, getAvailableSwaps, requestSwap, applyForSwap } from '../api/planning.api';
import { Filter, ChevronRight, Zap, Loader2, CheckCircle, AlertOctagon, ShieldAlert, Wifi, WifiOff, Send, Briefcase } from 'lucide-react';
import { facilityApi, type Facility as FacilityEntity } from '../api/facility.api';
import { fetchHospitalServices, type HospitalService } from '../api/hospital-services.api';
import { fetchPlanningProblems, fetchShiftProposals, applyShiftProposal, type PlanningIssue, type ShiftProposal } from '../api/planning-ai.api';
import { useSocket } from '../hooks/useSocket';
import { cn } from '../utils/cn';

const PlanningCalendar = lazy(() => import('../components/planning/PlanningCalendar').then((module) => ({ default: module.PlanningCalendar })));
const ShiftDetailsModal = lazy(() => import('../components/ShiftDetailsModal').then((module) => ({ default: module.ShiftDetailsModal })));
const ManagerGuidedActions = lazy(() => import('../components/ManagerGuidedActions').then((module) => ({ default: module.ManagerGuidedActions })));
const LeaveCreationModal = lazy(() => import('../components/LeaveCreationModal').then((module) => ({ default: module.LeaveCreationModal })));
const ReplacementModal = lazy(() => import('../components/ReplacementModal').then((module) => ({ default: module.ReplacementModal })));
const GhtValidationModal = lazy(() => import('../components/GhtValidationModal').then((module) => ({ default: module.GhtValidationModal })));

const CALENDAR_VIEWS = {
    MONTH: 'month',
    WEEK: 'week',
} as const;

export const PlanningPage = () => {
    const { themeColor } = useAppConfig();
    const [events, setEvents] = useState<any[]>([]);
    const [view, setView] = useState<any>(CALENDAR_VIEWS.WEEK);
    const [date, setDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
    const [isGhtModalOpen, setIsGhtModalOpen] = useState(false);
    const [isBourseOpen, setIsBourseOpen] = useState(false);
    const [selectedFacility, setSelectedFacility] = useState<string>('ALL'); // GHT Mode vs Local Mode
    const [selectedService, setSelectedService] = useState<string>('ALL');
    const [facilities, setFacilities] = useState<FacilityEntity[]>([]);
    const [services, setServices] = useState<HospitalService[]>([]);
    const [issues, setIssues] = useState<PlanningIssue[]>([]);
    const [proposals, setProposals] = useState<ShiftProposal[]>([]);
    const [showVigie, setShowVigie] = useState(true);
    const { socket, isConnected } = useSocket();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const { user } = useAuth();
    const isAgent = user?.role === 'AGENT';

    // Data Fetching: Shift Pool / Bourse d'échange
    const { data: availableSwaps = [], refetch: refetchSwaps } = useQuery({
        queryKey: ['availableSwaps'],
        queryFn: getAvailableSwaps,
        refetchInterval: 30000 // Poll every 30s
    });

    // Mutations for Swap
    const requestSwapMutation = useMutation({
        mutationFn: requestSwap,
        onSuccess: () => {
            alert("Votre garde a été placée sur la bourse d'échange.");
            setIsModalOpen(false);
            loadEvents();
            refetchSwaps();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || "Erreur lors de l'ajout à la Bourse.");
        }
    });

    const applySwapMutation = useMutation({
        mutationFn: applyForSwap,
        onSuccess: (data) => {
            alert(data.message || "Échange validé avec succès !");
            loadEvents();
            refetchSwaps();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || err.message || "Erreur lors de la validation QVT pour cet échange.");
        }
    });

    const loadEvents = async () => {
        const start = new Date(date);
        start.setDate(1);
        const end = new Date(date);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);

        const [shifts, leaves, facilitiesData, servicesData, issuesData, proposalsData] = await Promise.all([
            fetchShifts(
                start, 
                end, 
                selectedFacility === 'ALL' ? undefined : parseInt(selectedFacility),
                selectedService === 'ALL' ? undefined : parseInt(selectedService)
            ),
            fetchLeaves(),
            facilityApi.getAll(),
            fetchHospitalServices(),
            fetchPlanningProblems(),
            fetchShiftProposals()
        ]);

        setFacilities(facilitiesData);
        setServices(servicesData);
        setIssues(issuesData);
        setProposals(proposalsData);

        const formattedShifts = shifts.map(s => {
            const facilityCode = s.agent?.hospitalService?.facility?.code || s.agent?.hospitalService?.facility?.name?.substring(0, 3).toUpperCase() || 'H';
            return {
                id: s.id,
                title: selectedFacility === 'ALL' ? `[${facilityCode}] ${s.agentName}` : `🏥 ${s.agentName}`,
                start: s.start,
                end: s.end,
                type: 'SHIFT',
                resource: s,
            };
        });

        const formattedLeaves = leaves.map(l => ({
            id: `leave-${l.id}`,
            title: `🌴 ${l.type} - ${l.agent?.nom}`,
            start: new Date(l.start),
            end: new Date(l.end),
            type: 'LEAVE',
            resource: l,
        }));

        setEvents([...formattedShifts, ...formattedLeaves]);
    };

    const refetchLeaves = loadEvents;

    useEffect(() => {
        loadEvents();
    }, [date, selectedFacility, selectedService]);

    useEffect(() => {
        if (!socket) return;

        socket.on('vigie_update', () => {
            console.log('Real-time event: vigie_update');
            loadEvents();
            if (isGhtModalOpen) {
                // Modals can manage their own state typically or refresh via props.
            }
        });

        socket.on('planning_update', () => {
            console.log('Real-time event: planning_update');
            loadEvents();
        });

        return () => {
            socket.off('vigie_update');
            socket.off('planning_update');
        };
    }, [socket, date, selectedFacility, isGhtModalOpen]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            await generatePlanning(start, end);

            await loadEvents();
            setToastMessage("Brouillon généré selon la capacité litière et les impératifs H24 !");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            await publishPlanning(start, end);
            await loadEvents();
            setToastMessage("Le planning a été officiellement publié !");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la publication");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleApplyProposal = async (proposalId: number) => {
        try {
            await applyShiftProposal(proposalId);
            await loadEvents();
        } catch (error) {
            console.error(error);
        }
    };

    const eventPropGetter = (event: any) => {
        if (event.type === 'LEAVE') {
            return {
                style: {
                    backgroundColor: '#F43F5E',
                    borderRadius: '6px',
                    border: 'none',
                    color: 'white'
                }
            };
        }

        const status = event.resource.status;
        let className = 'border-none font-medium ';

        if (isAgent && event.resource.agent?.id !== user?.id) {
            className += 'bg-slate-800 text-slate-500 opacity-50';
            return { className };
        }

        className += 'text-white ';

        if (status === 'VALIDATED' || status === 'PUBLISHED') {
            className += themeColor === 'emerald-600' ? 'bg-emerald-500' : 'bg-blue-500';
        } else if (status === 'PENDING_GHT_APPROVAL') {
            className += 'bg-purple-600 border-2 border-dashed border-white/50';
        } else if (status === 'PENDING') {
            className += 'bg-orange-500';
        } else if (status === 'CONFLICT') {
            className += 'bg-red-500';
        } else if (status === 'BROADCASTED_LOCAL' || status === 'BROADCASTED_GHT') {
            className += 'bg-yellow-600 animate-pulse';
        }

        return { className };
    };

    const handleSelectEvent = (event: any) => {
        if (event.type === 'LEAVE') {
            setSelectedShift({
                id: event.id,
                start: event.start,
                end: event.end,
                agentName: event.resource.agent?.nom
            });
            setIsReplacementModalOpen(true);
        } else {
            setSelectedShift(event.resource);
            setIsModalOpen(true);
        }
    };

    const onEventResize = useCallback(
        async (data: any) => {
            if (isAgent) return;
            const { event, start, end } = data;
            if (event.type === 'LEAVE') return;

            const prevEvents = [...events];
            setEvents((prev) => {
                const existing = prev.find((ev) => ev.id === event.id);
                if (existing) {
                    existing.start = start;
                    existing.end = end;
                }
                return [...prev];
            });

            try {
                await updateShift(event.id, { start: start.toISOString(), end: end.toISOString() });
            } catch (err) {
                alert("Erreur: L'agent ne peut pas travailler (règle RH violée).");
                setEvents(prevEvents);
            }
        },
        [events]
    );

    const onEventDrop = useCallback(
        async (data: any) => {
            if (isAgent) return;
            const { event, start, end } = data;
            if (event.type === 'LEAVE') return;

            const prevEvents = [...events];
            setEvents((prev) => {
                const existing = prev.find((ev) => ev.id === event.id);
                if (existing) {
                    existing.start = start;
                    existing.end = end;
                }
                return [...prev];
            });

            try {
                await updateShift(event.id, { start: start.toISOString(), end: end.toISOString() });
            } catch (err) {
                alert("Erreur: Mouvement invalide (Limites légales dépassées).");
                setEvents(prevEvents);
            }
        },
        [events]
    );

    return (
        <div className="flex flex-col h-full -m-8 relative">
            {showToast && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium">
                        <CheckCircle size={20} />
                        {toastMessage}
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col p-8 overflow-hidden bg-slate-950">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold text-white">{isAgent ? "Mon Planning Personnel" : "Planning Hospitalier"}</h1>
                            {!isAgent && isConnected ? (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                                    <Wifi size={14} />
                                    <span>Temps-Réel Actif</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-medium">
                                    <WifiOff size={14} />
                                    <span>Mode Hors-ligne</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <button
                                onClick={() => setView(CALENDAR_VIEWS.MONTH)}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm transition-all",
                                    view === CALENDAR_VIEWS.MONTH ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Mois
                            </button>
                            <button
                                onClick={() => setView(CALENDAR_VIEWS.WEEK)}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm transition-all",
                                    view === CALENDAR_VIEWS.WEEK ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Semaine
                            </button>
                        </div>
                    </div>

                    {isBourseOpen && availableSwaps.length > 0 && (
                        <div className="mt-6 mb-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl">
                            <div className="flex items-center gap-3 mb-4">
                                <Briefcase className="text-blue-500" size={24} />
                                <h3 className="text-xl font-bold text-white">Bourse d'Échange Interne</h3>
                                <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase">
                                    {availableSwaps.length} Garde(s) Vacante(s)
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableSwaps.map((swapShift: any) => (
                                    <div key={swapShift.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-slate-400 text-xs font-bold uppercase">{swapShift.agent?.nom} cède sa garde</span>
                                            </div>
                                            <div className="text-white font-bold text-lg mb-1">{format(new Date(swapShift.start), 'EEEE d MMMM', { locale: fr })}</div>
                                            <div className="text-slate-300 text-sm">{format(new Date(swapShift.start), 'HH:mm')} - {format(new Date(swapShift.end), 'HH:mm')}</div>
                                            <div className="text-emerald-400 text-xs mt-2 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                                                {swapShift.type} • {swapShift.facility?.name || 'Local'}
                                            </div>
                                        </div>
                                        <button 
                                            disabled={applySwapMutation.isPending}
                                            onClick={() => applySwapMutation.mutate(Number(swapShift.id))}
                                            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {applySwapMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                            Postuler & Remplacer
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6 backdrop-blur-sm shadow-2xl relative overflow-hidden">
                        <Suspense fallback={<div className="h-full min-h-[420px] rounded-2xl bg-slate-900/70 animate-pulse" />}>
                            <PlanningCalendar
                                events={events}
                                view={view}
                                onView={(v: any) => setView(v)}
                                date={date}
                                onNavigate={(d: Date) => setDate(d)}
                                eventPropGetter={eventPropGetter}
                                onSelectEvent={handleSelectEvent}
                                onEventDrop={onEventDrop}
                                onEventResize={onEventResize}
                            />
                        </Suspense>
                    </div>
                </div>

                <aside className="w-80 bg-slate-900 border-l border-slate-800 p-8 flex flex-col gap-8 shadow-2xl">
                    <div className="flex items-center gap-3 text-white border-b border-slate-800 pb-4">
                        <Filter size={20} />
                        <h2 className="text-xl font-bold">Filtres</h2>
                    </div>

                    <div className="space-y-6">
                        {!isAgent && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</label>
                                <button
                                    onClick={() => setIsLeaveModalOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-300 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                                >
                                    <AlertOctagon size={18} />
                                    Signaler Absence
                                </button>

                            <button
                                onClick={() => setIsGhtModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-300 bg-purple-600 hover:bg-purple-500 text-white shadow-lg focus:ring-2 ring-purple-500/50"
                            >
                                <ShieldAlert size={18} />
                                Validations GHT
                            </button>
                            </div>
                        )}

                        {!isAgent && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">IA & Planification</label>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-300",
                                        "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25",
                                        isGenerating && "opacity-75 cursor-wait"
                                    )}
                                >
                                    {isGenerating ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Zap size={18} className="text-yellow-300 fill-yellow-300" />
                                    )}
                                    {isGenerating ? 'Calcul...' : 'Générer Planning'}
                                </button>
                                
                                {events.some(e => e.resource?.status === 'PENDING') && (
                                    <button
                                        onClick={handlePublish}
                                        disabled={isPublishing}
                                        className={cn(
                                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-300",
                                            "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg",
                                            isPublishing && "opacity-75 cursor-wait"
                                        )}
                                    >
                                        {isPublishing ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                        {isPublishing ? 'Publication...' : 'Publier Brouillon'}
                                    </button>
                                )}
                            </div>
                        )}
                        {!isAgent && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Établissement (GHT)</label>
                                <select 
                                    value={selectedFacility}
                                    onChange={(e) => setSelectedFacility(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-purple-500 transition-colors font-bold text-purple-400"
                                >
                                    <option value="ALL">🌐 Tout le GHT (Macro)</option>
                                    {facilities.map(f => (
                                        <option key={f.id} value={f.id}>🏥 {f.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Service</label>
                            <select 
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="ALL">Tous les services</option>
                                {services
                                    .filter(s => selectedFacility === 'ALL' || s.facility?.id === parseInt(selectedFacility))
                                    .map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        {!isAgent && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compétence</label>
                                <div className="space-y-2">
                                    {['Infirmier', 'Médecin', 'Aide-soignant'].map(role => (
                                        <label key={role} className="flex items-center gap-3 group cursor-pointer">
                                            <div className="w-5 h-5 border-2 border-slate-700 rounded flex items-center justify-center group-hover:border-slate-500 transition-colors">
                                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm opacity-0 group-hover:opacity-20 transition-opacity" />
                                            </div>
                                            <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <h3 className="text-sm font-semibold text-slate-200 mb-2">Légende</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-3 h-3 rounded bg-blue-500", themeColor === 'emerald-600' && "bg-emerald-500")} />
                                    <span className="text-slate-400 text-xs">Validé</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-orange-500" />
                                    <span className="text-slate-400">En attente</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-red-500" />
                                    <span className="text-slate-400">Conflict</span>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700">
                                    <div className="w-3 h-3 rounded bg-purple-600 border-2 border-dashed border-white/50" />
                                    <span className="text-slate-400 font-bold text-purple-400">Validation GHT Requise</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-yellow-600 animate-pulse" />
                                    <span className="text-slate-400">Garde Vacante (Vigie IA)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Vigie IA Side Panel */}
                {!isAgent && (
                <aside className={cn(
                    "bg-slate-900 border-l border-slate-800 flex flex-col transition-all duration-500 overflow-hidden relative",
                    showVigie ? "w-96" : "w-0"
                )}>
                    <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShieldAlert size={20} className="text-purple-400" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Vigie IA 2.0</h2>
                        </div>
                        <button onClick={() => setShowVigie(false)} className="text-slate-500 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                        {/* Summary Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                                <span className={cn("text-2xl font-black", issues.length > 0 ? "text-rose-500" : "text-emerald-500")}>
                                    {issues.length}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alertes</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                                <span className="text-2xl font-black text-purple-400">{proposals.length}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Résolutions</span>
                            </div>
                        </div>

                        {/* Problems Section */}
                        {issues.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risques détectés</h3>
                                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase">Urgent</span>
                                </div>
                                <div className="space-y-3">
                                    {issues.map((issue, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex gap-4">
                                            <div className="mt-1">
                                                <AlertOctagon size={16} className="text-rose-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-rose-200 leading-tight">{issue.message}</p>
                                                <p className="text-[10px] text-rose-500/60 font-medium uppercase">{issue.type}</p>
                                                {(issue.shiftId || issue.alertId) && (
                                                    <div className="pt-3">
                                                        <Suspense fallback={<div className="h-10 rounded-xl bg-slate-800/70 animate-pulse" />}>
                                                            <ManagerGuidedActions
                                                                compact
                                                                target={
                                                                    issue.shiftId
                                                                        ? { type: 'SHIFT', id: issue.shiftId }
                                                                        : { type: 'ALERT', id: issue.alertId as number }
                                                                }
                                                                onCompleted={(message) => {
                                                                    loadEvents();
                                                                    setToastMessage(message);
                                                                    setShowToast(true);
                                                                    setTimeout(() => setShowToast(false), 3000);
                                                                }}
                                                            />
                                                        </Suspense>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Proposals Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Solutions proposées</h3>
                            {proposals.length === 0 ? (
                                <div className="p-8 rounded-3xl border-2 border-dashed border-slate-800 text-center space-y-3">
                                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                                        <CheckCircle size={24} />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">Aucun conflit majeur détecté. Votre planning est sain.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {proposals.map((prop) => (
                                        <div key={prop.id} className="p-5 rounded-3xl bg-slate-800/60 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 space-y-4 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                                    <Zap size={20} className="fill-purple-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-white">Action : Remplacement</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{prop.reason}</p>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-2xl bg-slate-950/50 space-y-3">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500 font-medium">Actuel :</span>
                                                    <span className="text-rose-400 font-bold line-through">{prop.originalAgent?.nom || 'Vacant'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500 font-medium">IA suggère :</span>
                                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                        {prop.suggestedAgent?.nom}
                                                        <CheckCircle size={10} />
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button 
                                                    onClick={() => handleApplyProposal(prop.id)}
                                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3 rounded-2xl transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                                                >
                                                    Appliquer
                                                </button>
                                                <button className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-colors">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Floating button if closed - but integrated as toggle */}
                    </div>
                </aside>
                )}

                {!showVigie && !isAgent && (
                    <button 
                        onClick={() => setShowVigie(true)}
                        className="fixed bottom-8 right-8 w-14 h-14 bg-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all active:scale-90 z-40 group"
                    >
                        <ShieldAlert size={24} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900 text-[10px] font-black flex items-center justify-center">
                            {issues.length + proposals.length}
                        </div>
                        <span className="absolute right-full mr-4 px-3 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">Ouvrir Vigie IA</span>
                    </button>
                )}
            </div>

            <Suspense fallback={null}>
                {isModalOpen && (
                    <ShiftDetailsModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        shift={selectedShift}
                        onRequestSwap={(shiftId) => {
                            if (window.confirm("Voulez-vous proposer cette garde à l'échange ?")) {
                                requestSwapMutation.mutate(Number(shiftId));
                            }
                        }}
                        onManagerActionCompleted={(message) => {
                            loadEvents();
                            setToastMessage(message);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                        }}
                    />
                )}

                {isReplacementModalOpen && (
                    <ReplacementModal
                        isOpen={isReplacementModalOpen}
                        onClose={() => setIsReplacementModalOpen(false)}
                        shift={selectedShift}
                        onSuccess={() => {
                            loadEvents();
                            setShowToast(true);
                        }}
                    />
                )}

                {isLeaveModalOpen && (
                    <LeaveCreationModal
                        isOpen={isLeaveModalOpen}
                        onClose={() => setIsLeaveModalOpen(false)}
                        onSuccess={() => {
                            refetchLeaves();
                            setShowToast(true);
                        }}
                    />
                )}

                {isGhtModalOpen && (
                    <GhtValidationModal
                        isOpen={isGhtModalOpen}
                        onClose={() => setIsGhtModalOpen(false)}
                        onSuccess={() => {
                            loadEvents();
                            setShowToast(true);
                        }}
                    />
                )}
            </Suspense>
        </div>
    );
};
