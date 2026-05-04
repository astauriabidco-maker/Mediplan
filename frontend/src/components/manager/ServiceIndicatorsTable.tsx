import React from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ServiceComplianceIndicator } from '../../api/manager.api';
import { cn } from '../../utils/cn';

const readinessLabel = (service: ServiceComplianceIndicator) => {
    if (service.weeklyOverloadAgents > 0 || service.openAlertsBySeverity.HIGH > 0) return 'A corriger';
    if (service.coverageRate < 80 || service.publishedComplianceRate < 100) return 'A surveiller';
    return 'Pret';
};

const readinessTone = (service: ServiceComplianceIndicator) => {
    if (service.weeklyOverloadAgents > 0 || service.openAlertsBySeverity.HIGH > 0) return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
    if (service.coverageRate < 80 || service.publishedComplianceRate < 100) return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
};

export const ServiceIndicatorsTable = ({ services }: { services: ServiceComplianceIndicator[] }) => {
    if (services.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
                <CheckCircle2 className="mx-auto text-emerald-400" size={28} />
                <p className="mt-3 text-sm font-semibold text-white">Aucun indicateur service sur la période</p>
                <p className="mt-1 text-xs text-slate-500">Le cockpit ne remonte ni activité planifiée ni alerte ouverte.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
                <caption className="sr-only">
                    Indicateurs manager par service: couverture, publication, shifts, surcharge, alertes et état.
                </caption>
                <thead className="bg-slate-900/80">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Couverture</th>
                        <th className="px-4 py-3">Publication</th>
                        <th className="px-4 py-3">Shifts</th>
                        <th className="px-4 py-3">Surcharge</th>
                        <th className="px-4 py-3">Alertes</th>
                        <th className="px-4 py-3">Etat</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {services.map((service) => (
                        <tr key={service.serviceId} className="hover:bg-slate-900/70">
                            <td className="px-4 py-3">
                                <div className="break-words font-semibold text-white">{service.serviceName}</div>
                                <div className="break-words text-xs text-slate-500">{service.serviceCode || `${service.activeAgents} agents actifs`}</div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-24 rounded-full bg-slate-800">
                                        <div
                                            role="progressbar"
                                            aria-label={`Couverture ${service.serviceName}`}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.min(service.coverageRate, 100)}
                                            className={cn('h-2 rounded-full', service.coverageRate < 80 ? 'bg-amber-400' : 'bg-emerald-400')}
                                            style={{ width: `${Math.min(service.coverageRate, 100)}%` }}
                                        />
                                    </div>
                                    <span className="font-bold text-white tabular-nums">{service.coverageRate}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                                <span className="font-bold text-white tabular-nums">{service.publishedComplianceRate}%</span>
                                <span className="ml-2 text-xs text-slate-500">{service.validatedOrPublishedShifts} valides</span>
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                                <span className="font-bold text-white tabular-nums">{service.plannedShifts}</span>
                                <span className="ml-2 text-xs text-slate-500">{service.pendingShifts} pending</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={cn(
                                    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold',
                                    service.weeklyOverloadAgents > 0 ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                                )}>
                                    <ShieldAlert size={13} />
                                    {service.weeklyOverloadAgents}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <span className="rounded bg-rose-500/10 px-2 py-1 text-rose-300">H {service.openAlertsBySeverity.HIGH}</span>
                                    <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-300">M {service.openAlertsBySeverity.MEDIUM}</span>
                                    <span className="rounded bg-blue-500/10 px-2 py-1 text-blue-300">L {service.openAlertsBySeverity.LOW}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold', readinessTone(service))}>
                                    <AlertCircle size={13} />
                                    {readinessLabel(service)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
