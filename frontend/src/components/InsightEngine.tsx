import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, User, AlertTriangle, Building2, DollarSign, ArrowRight, Loader2, X, PieChart, BarChart2, TrendingUp } from 'lucide-react';
import api from '../api/axios';
import { clsx } from 'clsx';
import { useAppConfig } from '../store/useAppConfig';

interface InsightResult {
    type: 'AGENT' | 'HEALTH_ALERT' | 'SERVICE' | 'METRIC' | 'CHART';
    chartType?: 'PIE' | 'BAR' | 'LINE';
    title: string;
    subtitle: string;
    id: number | string;
    icon: string;
    data?: any;
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const InsightEngine = ({ tenantId, onSelectWidget }: { tenantId: string, onSelectWidget?: (widget: any) => void }) => {
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
            case 'hospital': case 'building': return <Building2 size={18} />;
            case 'dollar-sign': return <DollarSign size={18} />;
            case 'pie-chart': return <PieChart size={18} />;
            case 'bar-chart': return <BarChart2 size={18} />;
            case 'trending-up': return <TrendingUp size={18} />;
            default: return <Sparkles size={18} />;
        }
    };

    const handleResultClick = (result: InsightResult) => {
        if (result.type === 'CHART' && onSelectWidget) {
            onSelectWidget(result);
            setQuery('');
            setIsOpen(false);
        } else if (result.type === 'AGENT') {
            window.location.href = `/agents?id=${result.id}`;
            setIsOpen(false);
        } else if (result.type === 'HEALTH_ALERT') {
            window.location.href = `/agents`;
            setIsOpen(false);
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
                    placeholder="Posez une question (ex: 'Absentéisme', 'Pyramide des âges', 'Jean...')"
                    className={clsx(
                        "w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-white outline-none transition-all focus:ring-2 focus:ring-blue-500/50 shadow-2xl",
                        isOpen && "rounded-b-none border-b-transparent"
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
                <div className="absolute top-full left-0 right-0 bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-b-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="p-2 max-h-[400px] overflow-y-auto">
                        {results.map((result, idx) => (
                            <button
                                key={`${result.type}-${result.id}-${idx}`}
                                onClick={() => handleResultClick(result)}
                                className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-all group/item text-left border border-transparent hover:border-blue-500/20"
                            >
                                <div className={clsx(
                                    "p-2.5 rounded-xl transition-colors shrink-0",
                                    result.type === 'CHART' ? "bg-blue-500/20 text-blue-500" : (result.severity === 'HIGH' ? "bg-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-400 group-hover/item:text-white")
                                )}>
                                    {getIcon(result.icon)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-white group-hover/item:text-blue-400 transition-colors truncate">
                                        {result.title} 
                                        {result.type === 'CHART' && <span className="ml-2 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase">Analyse IA</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">{result.subtitle}</div>
                                </div>
                                <div className="p-2 bg-slate-800/50 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <ArrowRight size={14} className="text-white" />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>Powered by MediPlan AI Insights</span>
                        <div className="flex gap-2">
                            <span>{results.length} résultats</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
