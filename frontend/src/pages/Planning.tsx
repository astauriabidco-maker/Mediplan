import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppConfig } from '../store/useAppConfig';
import { fetchShifts, generatePlanning, Shift, fetchLeaves } from '../api/planning.api';
import { ShiftDetailsModal } from '../components/ShiftDetailsModal';
import { LeaveCreationModal } from '../components/LeaveCreationModal';
import { ReplacementModal } from '../components/ReplacementModal';
import { Filter, ChevronRight, ChevronLeft, Zap, Loader2, CheckCircle, AlertOctagon, UserPlus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const locales = {
    'fr': fr,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export const PlanningPage = () => {
    const { themeColor } = useAppConfig();
    const [events, setEvents] = useState<any[]>([]);
    const [view, setView] = useState<any>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [selectedShift, setSelectedShift] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);

    // New states for generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const loadEvents = async () => {
        const start = new Date(date);
        start.setDate(1);
        const end = new Date(date);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);

        const [shifts, leaves] = await Promise.all([
            fetchShifts(start, end),
            fetchLeaves()
        ]);

        const formattedShifts = shifts.map(s => ({
            id: s.id,
            title: `🏥 ${s.agentName}`,
            start: s.start,
            end: s.end,
            type: 'SHIFT',
            resource: s,
        }));

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
    }, [date]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            // Adjust to cover full days
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            await generatePlanning(start, end);

            // Success
            await loadEvents(); // Refresh data
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération");
        } finally {
            setIsGenerating(false);
        }
    };

    const eventPropGetter = (event: any) => {
        if (event.type === 'LEAVE') {
            return {
                style: {
                    backgroundColor: '#F43F5E', // Rose-500
                    borderRadius: '6px',
                    border: 'none',
                    color: 'white'
                }
            };
        }

        const status = event.resource.status;
        let className = 'border-none text-white font-medium ';

        if (status === 'VALIDATED') {
            className += themeColor === 'emerald-600' ? 'bg-emerald-500' : 'bg-blue-500';
        } else if (status === 'PENDING') {
            className += 'bg-orange-500';
        } else if (status === 'CONFLICT') {
            className += 'bg-red-500';
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
            setIsReplacementModalOpen(true); // Direct to replacement for leaves
        } else {
            setSelectedShift(event.resource);
            setIsModalOpen(true);
        }
    };

    return (
        <div className="flex flex-col h-full -m-8 relative">
            {/* Toast Notification */}
            {showToast && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium">
                        <CheckCircle size={20} />
                        Planning généré avec succès !
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Calendar Side */}
                <div className="flex-1 flex flex-col p-8 overflow-hidden bg-slate-950">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-bold text-white">Planning Hospitalier</h1>

                        </div>

                        <div className="flex items-center gap-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
                            <button
                                onClick={() => setView(Views.MONTH)}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm transition-all",
                                    view === Views.MONTH ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Mois
                            </button>
                            <button
                                onClick={() => setView(Views.WEEK)}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm transition-all",
                                    view === Views.WEEK ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                Semaine
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6 backdrop-blur-sm shadow-2xl relative overflow-hidden">
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            culture="fr"
                            view={view}
                            onView={(v) => setView(v)}
                            date={date}
                            onNavigate={(d) => setDate(d)}
                            eventPropGetter={eventPropGetter}
                            onSelectEvent={handleSelectEvent}
                            messages={{
                                next: 'Suivant',
                                previous: 'Précédent',
                                today: 'Aujourd\'hui',
                                month: 'Mois',
                                week: 'Semaine',
                                day: 'Jour',
                            }}
                            components={{
                                toolbar: (props) => (
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => props.onNavigate('PREV')} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                                <ChevronLeft size={20} />
                                            </button>
                                            <button onClick={() => props.onNavigate('TODAY')} className="px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium text-slate-200">
                                                Aujourd'hui
                                            </button>
                                            <button onClick={() => props.onNavigate('NEXT')} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                        <span className="text-lg font-semibold text-slate-100 uppercase tracking-wide">
                                            {props.label}
                                        </span>
                                        <div />
                                    </div>
                                )
                            }}
                            className="custom-calendar"
                        />
                    </div>
                </div>

                {/* Filter Panel */}
                <aside className="w-80 bg-slate-900 border-l border-slate-800 p-8 flex flex-col gap-8 shadow-2xl">
                    <div className="flex items-center gap-3 text-white border-b border-slate-800 pb-4">
                        <Filter size={20} />
                        <h2 className="text-xl font-bold">Filtres</h2>
                    </div>

                    <div className="space-y-6">
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
                                {isGenerating ? 'Calcul...' : 'Générer Auto'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Service</label>
                            <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500 transition-colors">
                                <option>Tous les services</option>
                                <option>Urgences</option>
                                <option>Cardiologie</option>
                                <option>Pédiatrie</option>
                            </select>
                        </div>

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
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <ShiftDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                shift={selectedShift}
            />

            <ReplacementModal
                isOpen={isReplacementModalOpen}
                onClose={() => setIsReplacementModalOpen(false)}
                shift={selectedShift}
                onSuccess={() => {
                    loadEvents();
                    setShowToast(true);
                }}
            />

            <LeaveCreationModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                onSuccess={() => {
                    refetchLeaves();
                    setShowToast(true);
                }}
            />

            <style>{`
        .custom-calendar .rbc-header {
          padding: 12px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #1e293b;
        }
        .custom-calendar .rbc-month-view, .custom-calendar .rbc-time-view {
          border: none;
        }
        .custom-calendar .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid #1e293b;
        }
        .custom-calendar .rbc-month-row + .rbc-month-row {
          border-top: 1px solid #1e293b;
        }
        .custom-calendar .rbc-off-range-bg {
          background-color: transparent;
          opacity: 0.3;
        }
        .custom-calendar .rbc-today {
          background-color: #1e293b;
        }
        .custom-calendar .rbc-event {
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.875rem;
          margin-bottom: 2px;
        }
        .custom-calendar .rbc-timeslot-group {
          border-bottom: 1px solid #1e293b;
        }
        .custom-calendar .rbc-time-content {
          border-top: 1px solid #1e293b;
        }
      `}</style>
        </div>
    );
};
