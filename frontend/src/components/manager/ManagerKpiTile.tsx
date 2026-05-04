import React from 'react';
import { AlertTriangle, CheckCircle2, LucideIcon, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';

type Tone = 'rose' | 'amber' | 'emerald' | 'blue' | 'slate';

const toneClasses: Record<Tone, string> = {
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    blue: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    slate: 'border-slate-700 bg-slate-900 text-slate-300'
};

const iconToneClasses: Record<Tone, string> = {
    rose: 'bg-rose-500/15 text-rose-300',
    amber: 'bg-amber-500/15 text-amber-300',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    blue: 'bg-blue-500/15 text-blue-300',
    slate: 'bg-slate-800 text-slate-300'
};

export interface ManagerKpiTileProps {
    label: string;
    value: number | string;
    detail: string;
    tone?: Tone;
    icon?: LucideIcon;
}

export const ManagerKpiTile = ({
    label,
    value,
    detail,
    tone = 'slate',
    icon: Icon
}: ManagerKpiTileProps) => {
    const FallbackIcon = tone === 'emerald' ? CheckCircle2 : tone === 'slate' ? TrendingUp : AlertTriangle;
    const TileIcon = Icon || FallbackIcon;

    return (
        <article
            aria-label={`${label}: ${value}. ${detail}`}
            className={cn('rounded-2xl border p-4 transition-colors', toneClasses[tone])}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="break-words text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-2 text-3xl font-black text-white tabular-nums">{value}</p>
                </div>
                <div aria-hidden="true" className={cn('shrink-0 rounded-xl p-2', iconToneClasses[tone])}>
                    <TileIcon size={18} />
                </div>
            </div>
            <p className="mt-3 break-words text-xs leading-5 text-slate-400">{detail}</p>
        </article>
    );
};
