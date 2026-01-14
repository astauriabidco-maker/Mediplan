import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgents, createAgent, Agent } from '../api/agents.api';
import { fetchHospitalServices, HospitalService } from '../api/hospital-services.api';
import {
    Users, Plus, Search, Trash2, Edit2, X, Loader2, Award, Network,
    Filter, TrendingUp, AlertCircle, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Filters {
    service: string;
    manager: string;
    contractType: string;
    status: string;
}

export const AgentsPage = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<Filters>({
        service: '',
        manager: '',
        contractType: '',
        status: 'all'
    });

    const { data: agents = [], isLoading: isAgentsLoading } = useQuery({
        queryKey: ['agents'],
        queryFn: fetchAgents,
    });

    const { data: services = [], isLoading: isServicesLoading } = useQuery({
        queryKey: ['hospital-services'],
        queryFn: fetchHospitalServices,
    });

    const createMutation = useMutation({
        mutationFn: createAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            setIsModalOpen(false);
        },
    });

    // Advanced filtering logic
    const filteredAgents = useMemo(() => {
        return agents.filter(agent => {
            // Search filter
            const searchLower = search.toLowerCase();
            const matchesSearch = !search ||
                agent.nom.toLowerCase().includes(searchLower) ||
                agent.matricule.toLowerCase().includes(searchLower) ||
                (agent.email?.toLowerCase() || '').includes(searchLower) ||
                (agent.hospitalService?.name.toLowerCase() || '').includes(searchLower) ||
                (agent.manager?.nom.toLowerCase() || '').includes(searchLower);

            // Service filter
            const matchesService = !filters.service ||
                agent.hospitalServiceId?.toString() === filters.service;

            // Manager filter
            const matchesManager = !filters.manager ||
                agent.managerId?.toString() === filters.manager;

            // Contract type filter
            const matchesContract = !filters.contractType ||
                agent.contractType === filters.contractType;

            // Status filter (you can extend this based on your needs)
            const matchesStatus = filters.status === 'all' ||
                (filters.status === 'active' && agent.isActive !== false) ||
                (filters.status === 'noManager' && !agent.managerId) ||
                (filters.status === 'noService' && !agent.hospitalServiceId);

            return matchesSearch && matchesService && matchesManager && matchesContract && matchesStatus;
        });
    }, [agents, search, filters]);

    // Statistics
    const stats = useMemo(() => {
        const total = agents.length;
        const byService = agents.reduce((acc, agent) => {
            const serviceName = agent.hospitalService?.name || 'Non assigné';
            acc[serviceName] = (acc[serviceName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byContract = agents.reduce((acc, agent) => {
            const contract = agent.contractType || 'Non spécifié';
            acc[contract] = (acc[contract] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const noManager = agents.filter(a => !a.managerId).length;
        const noService = agents.filter(a => !a.hospitalServiceId).length;

        return {
            total,
            filtered: filteredAgents.length,
            byService,
            byContract,
            noManager,
            noService
        };
    }, [agents, filteredAgents]);

    const clearFilters = () => {
        setFilters({
            service: '',
            manager: '',
            contractType: '',
            status: 'all'
        });
        setSearch('');
    };

    const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length + (search ? 1 : 0);

    const isLoading = isAgentsLoading || isServicesLoading;

    // Get unique managers
    const managers = useMemo(() => {
        const managerMap = new Map<number, Agent>();
        agents.forEach(agent => {
            if (agent.manager) {
                managerMap.set(agent.manager.id, agent.manager);
            }
        });
        return Array.from(managerMap.values());
    }, [agents]);

    // Get unique contract types
    const contractTypes = useMemo(() => {
        const types = new Set<string>();
        agents.forEach(agent => {
            if (agent.contractType) types.add(agent.contractType);
        });
        return Array.from(types);
    }, [agents]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Gestion des Agents</h1>
                    <p className="text-slate-400">
                        {stats.total} agent{stats.total > 1 ? 's' : ''} au total
                        {stats.filtered !== stats.total && ` • ${stats.filtered} affiché${stats.filtered > 1 ? 's' : ''}`}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95",
                        `bg-${themeColor}`
                    )}
                >
                    <Plus size={20} />
                    Nouvel Agent
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="text-blue-400" size={20} />
                        <TrendingUp className="text-blue-400/50" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-slate-400">Total Agents</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="text-emerald-400" size={20} />
                        <TrendingUp className="text-emerald-400/50" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.total - stats.noService}</p>
                    <p className="text-xs text-slate-400">Avec Service</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Network className="text-purple-400" size={20} />
                        <TrendingUp className="text-purple-400/50" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.total - stats.noManager}</p>
                    <p className="text-xs text-slate-400">Avec Manager</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <AlertCircle className="text-amber-400" size={20} />
                        <TrendingUp className="text-amber-400/50" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.noManager + stats.noService}</p>
                    <p className="text-xs text-slate-400">Alertes</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher par nom, matricule, email, service, manager..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 outline-none focus:border-slate-600 transition-colors placeholder:text-slate-600"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors",
                            showFilters || activeFiltersCount > 0
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                    >
                        <Filter size={18} />
                        Filtres
                        {activeFiltersCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>

                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2.5 rounded-lg font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Réinitialiser
                        </button>
                    )}
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Service</label>
                            <select
                                value={filters.service}
                                onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-slate-600 transition-colors"
                            >
                                <option value="">Tous les services</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Manager</label>
                            <select
                                value={filters.manager}
                                onChange={(e) => setFilters({ ...filters, manager: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-slate-600 transition-colors"
                            >
                                <option value="">Tous les managers</option>
                                {managers.map(m => (
                                    <option key={m.id} value={m.id}>{m.nom}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Type de Contrat</label>
                            <select
                                value={filters.contractType}
                                onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-slate-600 transition-colors"
                            >
                                <option value="">Tous les contrats</option>
                                {contractTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Statut</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-slate-600 transition-colors"
                            >
                                <option value="all">Tous</option>
                                <option value="active">Actifs</option>
                                <option value="noManager">Sans manager</option>
                                <option value="noService">Sans service</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Active Filter Badges */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {search && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                Recherche: "{search}"
                                <button onClick={() => setSearch('')} className="hover:text-blue-300">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {filters.service && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                                Service: {services.find(s => s.id.toString() === filters.service)?.name}
                                <button onClick={() => setFilters({ ...filters, service: '' })} className="hover:text-emerald-300">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {filters.manager && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                                Manager: {managers.find(m => m.id.toString() === filters.manager)?.nom}
                                <button onClick={() => setFilters({ ...filters, manager: '' })} className="hover:text-purple-300">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {filters.contractType && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                                Contrat: {filters.contractType}
                                <button onClick={() => setFilters({ ...filters, contractType: '' })} className="hover:text-amber-300">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {filters.status !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs">
                                Statut: {filters.status === 'active' ? 'Actifs' : filters.status === 'noManager' ? 'Sans manager' : 'Sans service'}
                                <button onClick={() => setFilters({ ...filters, status: 'all' })} className="hover:text-slate-300">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Agents List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-slate-500" size={32} />
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="mx-auto text-slate-700 mb-4" size={48} />
                        <p className="text-slate-500 mb-2">Aucun agent trouvé</p>
                        <p className="text-slate-600 text-sm">
                            {activeFiltersCount > 0
                                ? "Essayez de modifier vos filtres"
                                : "Créez votre premier agent"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-950/50">
                                    <th className="p-4 font-semibold text-slate-400 text-sm uppercase tracking-wider">Agent</th>
                                    <th className="p-4 font-semibold text-slate-400 text-sm uppercase tracking-wider">Service & Poste</th>
                                    <th className="p-4 font-semibold text-slate-400 text-sm uppercase tracking-wider">Hiérarchie (N+1)</th>
                                    <th className="p-4 font-semibold text-slate-400 text-sm uppercase tracking-wider">Contrat</th>
                                    <th className="p-4 font-semibold text-slate-400 text-sm uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredAgents.map((agent) => (
                                    <tr key={agent.id} className="group hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white", `bg-${themeColor}`)}>
                                                    {agent.nom.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white">{agent.nom}</p>
                                                    <p className="text-xs text-slate-500">{agent.matricule} • {agent.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 font-medium">
                                                    {agent.hospitalService?.name || agent.department || (
                                                        <span className="text-amber-500 text-xs">⚠️ Non assigné</span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-500">{agent.jobTitle || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {agent.manager ? (
                                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                    <Network size={14} className="text-blue-500" />
                                                    {agent.manager.nom}
                                                </div>
                                            ) : (
                                                <span className="text-amber-500 text-xs">⚠️ Pas de manager</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-xs font-medium",
                                                agent.contractType === 'CDI' ? "bg-emerald-500/20 text-emerald-400" :
                                                    agent.contractType === 'CDD' ? "bg-blue-500/20 text-blue-400" :
                                                        "bg-slate-500/20 text-slate-400"
                                            )}>
                                                {agent.contractType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Nouveau Dossier Personnel</h2>
                                <p className="text-slate-400 text-sm">Créez une fiche complète incluant la hiérarchie et l'affectation.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <AgentForm
                                onSubmit={(data) => createMutation.mutate(data)}
                                isLoading={createMutation.isPending}
                                themeColor={themeColor}
                                services={services}
                                agents={agents}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// AgentForm component remains the same as before
const AgentForm = ({ onSubmit, isLoading, themeColor, services, agents }: { onSubmit: (data: any) => void, isLoading: boolean, themeColor: string, services: HospitalService[], agents: Agent[] }) => {
    const [activeTab, setActiveTab] = useState('identity');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        // Transform numeric IDs
        if (data.hospitalServiceId) data.hospitalServiceId = Number(data.hospitalServiceId);
        if (data.managerId) data.managerId = Number(data.managerId);

        onSubmit(data);
    };

    const tabs = [
        { id: 'identity', label: 'Identité & État Civil', icon: Users },
        { id: 'professional', label: 'Professionnel & Hiérarchie', icon: Award },
        { id: 'contact', label: 'Contacts & Urgences', icon: Network },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tabs Navigation */}
            <div className="flex gap-2 border-b border-slate-800">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-6 py-3 font-medium text-sm transition-all relative",
                            activeTab === tab.id
                                ? `text-${themeColor}`
                                : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <tab.icon size={16} />
                            {tab.label}
                        </div>
                        {activeTab === tab.id && (
                            <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", `bg-${themeColor}`)} />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Identity */}
            {activeTab === 'identity' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nom de famille</label>
                        <input name="nom" required className="input-field" placeholder="ex: MBARGA" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Prénoms</label>
                        <input name="firstName" className="input-field" placeholder="ex: Jean Pierre" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Sexe</label>
                        <select name="gender" className="input-field">
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Date de Naissance</label>
                        <input name="dateOfBirth" type="date" className="input-field" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Lieu de Naissance</label>
                        <input name="placeOfBirth" className="input-field" placeholder="ex: Yaoundé" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nationalité</label>
                        <input name="nationality" className="input-field" defaultValue="Camerounaise" />
                    </div>
                </div>
            )}

            {/* Tab: Professional */}
            {activeTab === 'professional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Matricule</label>
                        <input name="matricule" required className="input-field font-mono" placeholder="MAT-2024-..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Service Hospitalier</label>
                        <select name="hospitalServiceId" className="input-field">
                            <option value="">-- Sélectionner un service --</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Supérieur Hiérarchique (N+1)</label>
                        <select name="managerId" className="input-field">
                            <option value="">-- Aucun (Top level) --</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Poste / Grade</label>
                        <input name="jobTitle" className="input-field" placeholder="ex: Médecin Chef d'Unité" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Type de Contrat</label>
                        <select name="contractType" className="input-field">
                            <option>CDI</option>
                            <option>CDD</option>
                            <option>Stage</option>
                            <option>Vacataire</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Date d'embauche</label>
                        <input name="hiringDate" type="date" className="input-field" />
                    </div>
                </div>
            )}

            {/* Tab: Contact */}
            {activeTab === 'contact' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Adresse de résidence</label>
                        <input name="address" className="input-field" placeholder="Quartier, Ville..." />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email Professionnel</label>
                        <input name="email" type="email" required className="input-field" placeholder="nom@hopital.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Téléphone Personnel</label>
                        <input name="telephone" required className="input-field" placeholder="+237 ..." />
                    </div>

                    <div className="col-span-2 border-t border-slate-800 pt-6 mt-2">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Contact d'urgence
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom du contact</label>
                                <input name="emergencyContactName" className="input-field" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone d'urgence</label>
                                <input name="emergencyContactPhone" className="input-field" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                        "px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                        `bg-${themeColor}`
                    )}
                >
                    {isLoading ? 'Enregistrement...' : 'Créer le Dossier Agent'}
                </button>
            </div>

            <style>{`
                .input-field {
                    width: 100%;
                    background-color: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 0.75rem;
                    padding: 0.75rem 1rem;
                    color: white;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-field:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
            `}</style>
        </form>
    );
}
