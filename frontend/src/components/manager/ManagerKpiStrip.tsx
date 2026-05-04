import { AlertTriangle, CheckCircle2, ClipboardList, ShieldAlert, Users } from 'lucide-react';
import type { ManagerCockpit } from '../../api/manager.api';

const items = (cockpit: ManagerCockpit) => [
    {
        label: 'Alertes ouvertes',
        value: cockpit.counters.openAlerts,
        icon: ShieldAlert,
        tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
        label: 'Shifts bloqués',
        value: cockpit.counters.blockedShifts,
        icon: AlertTriangle,
        tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
        label: 'Agents à risque',
        value: cockpit.counters.agentsAtRisk,
        icon: Users,
        tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
        label: 'Corrections',
        value: cockpit.counters.pendingCorrections,
        icon: ClipboardList,
        tone: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    },
    {
        label: 'Conformité publiée',
        value: cockpit.counters.publishedShifts,
        icon: CheckCircle2,
        tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
];

export const ManagerKpiStrip = ({ cockpit }: { cockpit: ManagerCockpit }) => (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items(cockpit).map((item) => {
            const Icon = item.icon;
            return (
                <div key={item.label} className="border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                            <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
                        </div>
                        <div className={`rounded-lg border p-2 ${item.tone}`}>
                            <Icon size={20} />
                        </div>
                    </div>
                </div>
            );
        })}
    </section>
);
