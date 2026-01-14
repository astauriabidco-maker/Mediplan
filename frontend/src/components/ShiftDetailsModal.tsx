import React from 'react'
import { X, User, Clock, Briefcase, CreditCard, ChevronRight } from 'lucide-react'
import { Shift } from '../api/planning.api'
import { useAppConfig } from '../store/useAppConfig'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface ShiftDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    shift: Shift | null
}

export const ShiftDetailsModal = ({ isOpen, onClose, shift }: ShiftDetailsModalProps) => {
    const { mobileMoney, themeColor } = useAppConfig()

    if (!isOpen || !shift) return null

    const handlePayment = () => {
        window.alert("Paiement envoyé à l'API !")
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className={cn("h-32 relative flex items-end p-8", `bg-${themeColor}`)}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4 text-white">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold leading-tight">{shift.agentName}</h2>
                            <p className="text-white/70 text-sm font-medium uppercase tracking-widest">{shift.type === 'WORK' ? 'Service Actif' : 'Repos / Astreinte'}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Briefcase size={14} />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Poste</span>
                            </div>
                            <p className="text-white font-semibold">{shift.type === 'WORK' ? 'Médecin Garde' : 'Repos'}</p>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Clock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Statut</span>
                            </div>
                            <p className={cn(
                                "text-sm font-bold",
                                shift.status === 'VALIDATED' ? "text-emerald-500" :
                                    shift.status === 'PENDING' ? "text-orange-500" : "text-red-500"
                            )}>
                                {shift.status}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Horaires Détailés</label>
                        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Début</p>
                                <p className="text-lg font-bold text-white">{format(shift.start, 'HH:mm')}</p>
                            </div>
                            <ChevronRight className="text-slate-700" />
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Fin</p>
                                <p className="text-lg font-bold text-white">{format(shift.end, 'HH:mm')}</p>
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-500">
                            {format(shift.start, 'EEEE d MMMM yyyy', { locale: fr })}
                        </p>
                    </div>

                    {/* Footer / Action */}
                    <div className="pt-4">
                        {mobileMoney && shift.status === 'VALIDATED' ? (
                            <button
                                onClick={handlePayment}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(249,115,22,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <CreditCard size={20} />
                                💸 Payer la garde (Orange/MTN)
                            </button>
                        ) : (
                            <button
                                className="w-full bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl cursor-default flex items-center justify-center gap-3 border border-slate-700 opacity-50"
                                disabled
                            >
                                <X size={20} />
                                Export Paie (Indisponible)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
