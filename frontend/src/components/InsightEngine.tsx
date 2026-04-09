import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, User, AlertTriangle, Hospital, DollarSign, ArrowRight, Loader2, X } from 'lucide-react';
import api from '../api/axios';
import { clsx } from 'clsx';
import { useAppConfig } from '../store/useAppConfig';

interface InsightResult {
    type: 'AGENT' | 'HEALTH_ALERT' | 'SERVICE' | 'METRIC';
    title: string;
    subtitle: string;
    id: number | string;
    icon: string;
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const InsightEngine = ({ tenantId }: { tenantId: string }) => {
    const { themeColor } = useAppConfig();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<InsightResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setIsOpen(true);
        try {
            const response = await api.get('/api/analytics/insight', {
                params: { query: val, tenantId }
            });
            setResults(response.data);
        } catch (error) {
            console.error('Insight error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'user': return <User size={18} />;
            case 'alert-triangle': return <AlertTriangle size={18} />;
            case 'hospital': return <Hospital size={18} />;
            case 'dollar-sign': return <DollarSign size={18} />;
            default: return <Sparkles size={18} />;
        }
    };

    return (
        <div className="relative w-full max-w-2xl" ref={dropdownRef}>
            <div className={clsx(
                "relative group transition-all duration-300",
                isOpen ? "z-50" : "z-10"
            )}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Sparkles className={clsx(`text-${themeColor}`, "animate-pulse")} size={20} />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Posez une question à l'Insight Engine (ex: 'Agents en défaut', 'Cardio'...)"
                    className={clsx(
                        "w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-white outline-none transition-all",
                        "focus:ring-2 focus:ring-offset-0 focus:ring-blue-500/50 focus:border-blue-500/50",
                        "placeholder:text-slate-500 font-medium shadow-2xl"
                    )}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isLoading ? (
                        <Loader2 className="animate-spin text-slate-500" size={20} />
                    ) : query ? (
                        <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}>
                            <X className="text-slate-500 hover:text-white transition-colors" size={20} />
                        </button>
                    ) : (
                        <kbd className="hidden md:inline-flex h-6 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    )}
                </div>
            </div>

            {isOpen && (results.length > 0 || isLoading) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[400px] overflow-y-auto">
                        {results.map((result, idx) => (
                            <button
                                key={`${result.type}-${result.id}-${idx}`}
                                onClick={() => {
                                    if (typeof result.id === 'number') {
                                        window.location.href = `/agents?id=${result.id}`;
                                    }
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-all group/item text-left"
                            >
                                <div className={clsx(
                                    "p-2.5 rounded-xl transition-colors",
                                    result.severity === 'HIGH' ? "bg-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-400 group-hover/item:text-white"
                                )}>
                                    {getIcon(result.icon)}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white group-hover/item:text-blue-400 transition-colors">{result.title}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{result.subtitle}</div>
                                </div>
                                <ArrowRight size={14} className="text-slate-600 group-hover/item:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                    <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by MediPlan AI Insights</span>
                        <div className="flex gap-2 text-[10px] text-slate-500">
                            <span>Esc pour fermer</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
