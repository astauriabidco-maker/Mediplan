import type { ServiceComplianceIndicator } from '../../api/manager.api';

const statusTone = (value: number, warnBelow = 80) => {
    if (value >= 100) return 'text-emerald-300';
    if (value >= warnBelow) return 'text-amber-300';
    return 'text-rose-300';
};

export const ServiceComplianceTable = ({ services }: { services: ServiceComplianceIndicator[] }) => (
    <section className="border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-base font-bold text-white">Indicateurs par service</h2>
            <p className="text-xs text-slate-500">Couverture, surcharge, publication et alertes.</p>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="px-5 py-3">Service</th>
                        <th className="px-5 py-3">Couverture</th>
                        <th className="px-5 py-3">Surcharge</th>
                        <th className="px-5 py-3">Publication</th>
                        <th className="px-5 py-3">Alertes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {services.length === 0 && (
                        <tr>
                            <td className="px-5 py-8 text-slate-500" colSpan={5}>
                                Aucun service actif sur la période.
                            </td>
                        </tr>
                    )}

                    {services.map((service) => (
                        <tr key={service.serviceId}>
                            <td className="px-5 py-4">
                                <p className="font-semibold text-slate-100">{service.serviceName}</p>
                                <p className="text-xs text-slate-500">
                                    {service.activeAgents} agents · {service.plannedShifts} shifts
                                </p>
                            </td>
                            <td className={`px-5 py-4 font-bold ${statusTone(service.coverageRate)}`}>
                                {service.coverageRate}%
                            </td>
                            <td className="px-5 py-4 text-slate-300">{service.weeklyOverloadAgents}</td>
                            <td className={`px-5 py-4 font-bold ${statusTone(service.publishedComplianceRate, 90)}`}>
                                {service.publishedComplianceRate}%
                            </td>
                            <td className="px-5 py-4 text-slate-300">
                                H {service.openAlertsBySeverity.HIGH} · M {service.openAlertsBySeverity.MEDIUM} · L{' '}
                                {service.openAlertsBySeverity.LOW}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
);
