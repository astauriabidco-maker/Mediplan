import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCompetenciesMatrix, createCompetency } from '../api/competencies.api';
import { Award, Loader2, Check, X, Plus, Clock, AlertTriangle, Search } from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { CompetencyEditModal } from '../components/CompetencyEditModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const CompetenciesPage = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newCompName, setNewCompName] = useState('');

    // Modal states
    const [selectedCell, setSelectedCell] = useState<{ agent: any, competency: any } | null>(null);

    const [filterService, setFilterService] = useState('');
    const [filterJob, setFilterJob] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['competencies-matrix'],
        queryFn: fetchCompetenciesMatrix,
    });

    const createMutation = useMutation({
        mutationFn: () => createCompetency(newCompName, 'General'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['competencies-matrix'] });
            setIsCreating(false);
            setNewCompName('');
        }
    });

    if (isLoading) {
        return (
            <div className="h-96 w-full flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-500" size={40} />
            </div>
        );
    }

    const { agents = [], competencies = [] } = data || {};

    // Build unique filter lists
    const uniqueServices = Array.from(new Set(agents.map(a => a.hospitalService?.name).filter(Boolean)));
    const uniqueJobs = Array.from(new Set(agents.map(a => a.jobTitle).filter(Boolean)));

    // Filter agents
    const filteredAgents = agents.filter(a => {
        const matchSearch = a.nom.toLowerCase().includes(searchTerm.toLowerCase());
        const matchService = filterService ? a.hospitalService?.name === filterService : true;
        const matchJob = filterJob ? a.jobTitle === filterJob : true;
        return matchSearch && matchService && matchJob;
    });

    // Compute KPIs specifically for filtered agents
    let totalHabilitations = 0;
    let expiredHabilitations = 0;
    let expiringSoon = 0;

    filteredAgents.forEach(agent => {
        if (!agent.agentCompetencies) return;
        agent.agentCompetencies.forEach((relation: any) => {
            totalHabilitations++;
            if (relation.expirationDate) {
                const isExpired = new Date(relation.expirationDate) < new Date();
                const diffTime = new Date(relation.expirationDate).getTime() - new Date().getTime();
                const isExpiringSoon = !isExpired && diffTime < 30 * 24 * 60 * 60 * 1000;
                
                if (isExpired) expiredHabilitations++;
                if (isExpiringSoon) expiringSoon++;
            }
        });
    });

    const complianceRate = totalHabilitations ? Math.round(((totalHabilitations - expiredHabilitations) / totalHabilitations) * 100) : 100;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-end justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Tableau de Bord GPEC</h1>
                    <p className="text-slate-400">Gestion Prévisionnelle des Emplois et des Compétences sectorisée.</p>
                </div>

                <div className="flex items-center gap-4">
                    {isCreating ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                            <input
                                autoFocus
                                value={newCompName}
                                onChange={(e) => setNewCompName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createMutation.mutate()}
                                placeholder="Nom de la compétence..."
                                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-emerald-500 transition-all"
                            />
                            <button
                                onClick={() => createMutation.mutate()}
                                disabled={!newCompName || createMutation.isPending}
                                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg"
                            >
                                <Check size={18} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl transition-all font-medium shadow-xl"
                        >
                            <Plus size={18} className="text-emerald-500" />
                            Ajouter / Créer une Compétence
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-2">
                    <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Agents Filtrés</div>
                    <div className="text-4xl font-black text-white">{filteredAgents.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-2">
                    <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Habilitations Totales</div>
                    <div className="text-4xl font-black text-blue-500">{totalHabilitations}</div>
                    <div className="text-xs font-bold text-blue-500/70 bg-blue-500/10 px-2 py-1 rounded w-max mt-1">Conformité: {complianceRate}%</div>
                </div>
                <div className={cn("bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-2 transition-colors", expiringSoon > 0 && "border-amber-500/50 bg-amber-500/5")}>
                    <div className="text-amber-500/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Clock size={16} /> Expirations &lt; 30j
                    </div>
                    <div className="text-4xl font-black text-amber-500">{expiringSoon}</div>
                </div>
                <div className={cn("bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-2 transition-colors", expiredHabilitations > 0 && "border-rose-500/50 bg-rose-500/10 animate-pulse")}>
                    <div className="text-rose-500/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={16} /> Expiré (En Défaut)
                    </div>
                    <div className="text-4xl font-black text-rose-500">{expiredHabilitations}</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex gap-4 items-center bg-slate-900/50 p-4 border border-slate-800 rounded-2xl">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un agent..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all w-full"
                    />
                </div>
                <div className="w-px h-8 bg-slate-800 mx-2" />
                <select 
                    value={filterService} 
                    onChange={e => setFilterService(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all min-w-[200px]"
                >
                    <option value="">Tous les Services</option>
                    {uniqueServices.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                </select>
                <select 
                    value={filterJob} 
                    onChange={e => setFilterJob(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all min-w-[200px]"
                >
                    <option value="">Tous les Postes</option>
                    {uniqueJobs.map(j => <option key={j as string} value={j as string}>{j as string}</option>)}
                </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50">
                                <th className="p-6 border-b border-r border-slate-800 min-w-[240px] sticky left-0 bg-slate-950 z-20 font-bold text-white uppercase text-xs tracking-widest">
                                    Agents
                                </th>
                                {competencies.map(comp => (
                                    <th key={comp.id} className="p-4 border-b border-slate-800 min-w-[140px] text-center font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                                        <div className="flex flex-col items-center gap-2">
                                            <Award size={18} className="text-blue-500 opacity-50" />
                                            {comp.name}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredAgents.map(agent => (
                                <tr key={agent.id} className="group hover:bg-blue-500/[0.02] transition-colors">
                                    <td className="p-6 border-r border-slate-800 sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition-colors z-10 shadow-xl">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-100">{agent.nom}</span>
                                            <span className="text-xs text-slate-500">{agent.jobTitle || 'Personnel'}</span>
                                            {agent.hospitalService && (
                                                <span className="text-[10px] font-bold text-blue-500/60 mt-0.5">{agent.hospitalService.name}</span>
                                            )}
                                        </div>
                                    </td>
                                    {competencies.map(comp => {
                                        const relation = agent.agentCompetencies?.find(ac => ac.competency.id === comp.id);
                                        const expiresAt = relation?.expirationDate;
                                        const isExpired = expiresAt && new Date(expiresAt) < new Date();
                                        const isExpiringSoon = expiresAt && !isExpired &&
                                            new Date(expiresAt).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

                                        return (
                                            <td
                                                key={comp.id}
                                                className="p-4 text-center cursor-pointer hover:bg-white/5 transition-all group/cell"
                                                onClick={() => setSelectedCell({ agent, competency: comp })}
                                            >
                                                {relation ? (
                                                    <div className="flex flex-col items-center gap-1.5 animate-in scale-in-95 duration-200">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg",
                                                            isExpired ? "bg-rose-500/20 text-rose-500 border border-rose-500/30" :
                                                                isExpiringSoon ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" :
                                                                    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                        )}>
                                                            {relation.level}
                                                        </div>
                                                        {expiresAt && (
                                                            <div className={cn(
                                                                "flex items-center gap-1 text-[9px] font-bold uppercase",
                                                                isExpired ? "text-rose-500" : isExpiringSoon ? "text-orange-500" : "text-slate-500"
                                                            )}>
                                                                {isExpired ? <AlertTriangle size={10} /> : <Clock size={10} />}
                                                                {new Date(expiresAt).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-800 mx-auto flex items-center justify-center group-hover/cell:border-slate-700 transition-colors">
                                                        <Plus size={14} className="text-slate-700 group-hover/cell:text-slate-500 transition-colors" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredAgents.length === 0 && (
                    <div className="p-24 text-center">
                        <div className="inline-flex p-4 rounded-full bg-slate-800 text-slate-500 mb-4">
                            <Search size={32} />
                        </div>
                        <p className="text-slate-500 font-medium italic">Aucun agent ne correspond à votre recherche.</p>
                    </div>
                )}
            </div>

            {selectedCell && (
                <CompetencyEditModal
                    isOpen={!!selectedCell}
                    onClose={() => setSelectedCell(null)}
                    agent={selectedCell.agent}
                    competency={selectedCell.competency}
                    currentLevel={selectedCell.agent.agentCompetencies?.find((ac: any) => ac.competency.id === selectedCell.competency.id)?.level}
                    currentExpiration={selectedCell.agent.agentCompetencies?.find((ac: any) => ac.competency.id === selectedCell.competency.id)?.expirationDate}
                />
            )}
        </div>
    );
};
