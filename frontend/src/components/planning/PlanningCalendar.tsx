import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: {
        fr,
    },
});

const DnDCalendar = withDragAndDrop(Calendar);

export const PlanningCalendar = ({
    date,
    eventPropGetter,
    events,
    onEventDrop,
    onEventResize,
    onNavigate,
    onSelectEvent,
    onView,
    view,
}: any) => {
    return (
        <>
            <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: any) => event.start}
                endAccessor={(event: any) => event.end}
                style={{ height: '100%' }}
                culture="fr"
                view={view}
                onView={onView}
                date={date}
                onNavigate={onNavigate}
                eventPropGetter={eventPropGetter}
                onSelectEvent={onSelectEvent}
                onEventDrop={onEventDrop}
                onEventResize={onEventResize}
                resizable
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
                    ),
                }}
                className="custom-calendar"
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
        </>
    );
};
