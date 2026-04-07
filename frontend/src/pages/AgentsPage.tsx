import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgents, createAgent, updateAgent, Agent } from '../api/agents.api';
import { fetchHospitalServices, HospitalService } from '../api/hospital-services.api';
import { useAuth } from '../store/useAuth';
import {
    Users, Plus, Search, Trash2, Edit2, X, Loader2, Award, Network,
    Filter, TrendingUp, AlertCircle, CheckCircle, XCircle, FileText,
    Globe, Smartphone, ShieldCheck, Heart, Baby, Activity, Clock
} from 'lucide-react';
import { fetchBeneficiaries, createBeneficiary, deleteBeneficiary, updateBeneficiary, Beneficiary } from '../api/beneficiaries.api';
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
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Agent> }) => updateAgent(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            setIsModalOpen(false);
            setEditingAgent(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: createAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            setIsModalOpen(false);
        },
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
                (filters.status === 'active' && agent.status === 'ACTIVE') ||
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
                                                <button
                                                    onClick={() => {
                                                        setEditingAgent(agent);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                >
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
                                <h2 className="text-2xl font-bold text-white">
                                    {editingAgent ? `Modifier le Dossier : ${editingAgent.nom}` : 'Nouveau Dossier Personnel'}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {editingAgent ? 'Mettez à jour les informations de l\'agent.' : 'Créez une fiche complète incluant la hiérarchie et l\'affectation.'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingAgent(null);
                                }}
                                className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <AgentForm
                                agent={editingAgent}
                                onSubmit={(data) => {
                                    if (editingAgent) {
                                        updateMutation.mutate({ id: editingAgent.id, data });
                                    } else {
                                        createMutation.mutate(data);
                                    }
                                }}
                                isLoading={editingAgent ? updateMutation.isPending : createMutation.isPending}
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

// AgentForm component
const AgentForm = ({ agent, onSubmit, isLoading, themeColor, services, agents }: { agent: Agent | null, onSubmit: (data: any) => void, isLoading: boolean, themeColor: string, services: HospitalService[], agents: Agent[] }) => {
    const [activeTab, setActiveTab] = useState('identity');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        // Transform numeric IDs
        if (data.hospitalServiceId) data.hospitalServiceId = Number(data.hospitalServiceId);
        if (data.managerId) data.managerId = Number(data.managerId);
        data.isWhatsAppCompatible = formData.get('isWhatsAppCompatible') === 'on';

        onSubmit(data);
    };

    const tabs = [
        { id: 'identity', label: 'Identité & État Civil', icon: Users },
        { id: 'professional', label: 'Professionnel & Hiérarchie', icon: Award },
        { id: 'africa', label: 'Localisation / Afrique', icon: Globe },
        { id: 'family', label: 'Ayants-droit / Famille', icon: Heart },
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
                        <input name="nom" defaultValue={agent?.nom} required className="input-field" placeholder="ex: MBARGA" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Prénoms</label>
                        <input name="firstName" defaultValue={agent?.firstName} className="input-field" placeholder="ex: Jean Pierre" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Sexe</label>
                        <select name="gender" defaultValue={agent?.gender} className="input-field">
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Date de Naissance</label>
                        <input name="dateOfBirth" type="date" defaultValue={agent?.dateOfBirth} className="input-field" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Lieu de Naissance</label>
                        <input name="placeOfBirth" defaultValue={agent?.placeOfBirth} className="input-field" placeholder="ex: Yaoundé" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nationalité</label>
                        <input name="nationality" defaultValue={agent?.nationality || 'Camerounaise'} className="input-field" />
                    </div>
                </div>
            )}

            {/* Tab: Professional */}
            {activeTab === 'professional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Matricule</label>
                        <input name="matricule" defaultValue={agent?.matricule} required className="input-field font-mono" placeholder="MAT-2024-..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Service Hospitalier</label>
                        <select name="hospitalServiceId" defaultValue={agent?.hospitalServiceId} className="input-field">
                            <option value="">-- Sélectionner un service --</option>
                            {services.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Supérieur Hiérarchique (N+1)</label>
                        <select name="managerId" defaultValue={agent?.managerId} className="input-field">
                            <option value="">-- Aucun (Top level) --</option>
                            {agents.filter(a => a.id !== agent?.id).map(a => (
                                <option key={a.id} value={a.id}>{a.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Poste / Grade</label>
                        <input name="jobTitle" defaultValue={agent?.jobTitle} className="input-field" placeholder="ex: Médecin Chef d'Unité" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Type de Contrat</label>
                        <select name="contractType" defaultValue={agent?.contractType} className="input-field">
                            <option>CDI</option>
                            <option>CDD</option>
                            <option>Stage</option>
                            <option>Vacataire</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Date d'embauche</label>
                        <input name="hiringDate" type="date" defaultValue={agent?.hiringDate} className="input-field" />
                    </div>
                </div>
            )}

            {/* Tab: Localization Africa */}
            {activeTab === 'africa' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-blue-500" />
                                Identification Nationale & Sociale
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-800">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">NIU (Identifiant Unique Fiscal)</label>
                                    <input name="niu" defaultValue={agent?.niu} className="input-field" placeholder="ex: P012345678912Z" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">N° CNPS / Prévoyance</label>
                                    <input name="cnpsNumber" defaultValue={agent?.cnpsNumber} className="input-field" placeholder="ex: 345-000123-45" />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileText size={14} className="text-amber-500" />
                                Pièce d'Identité
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-800">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Type de document</label>
                                    <select name="idType" defaultValue={agent?.idType} className="input-field">
                                        <option value="CNI">CNI (Carte Nationale)</option>
                                        <option value="PASSPORT">Passeport</option>
                                        <option value="ATTESTATION">Attestation d'Identité</option>
                                        <option value="RESIDENCE_PERMIT">Titre de Séjour</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Numéro de pièce</label>
                                    <input name="idNumber" defaultValue={agent?.idNumber} className="input-field" placeholder="ex: 112233445" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date d'expiration</label>
                                    <input name="idExpiryDate" type="date" defaultValue={agent?.idExpiryDate} className="input-field" />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Smartphone size={14} className="text-emerald-500" />
                                Paiements Mobiles (Mobile Money)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/30 p-4 rounded-2xl border border-slate-800">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Opérateur</label>
                                    <select name="mobileMoneyProvider" defaultValue={agent?.mobileMoneyProvider} className="input-field font-bold text-emerald-500">
                                        <option value="">-- Aucun --</option>
                                        <option value="ORANGE_MONEY">Orange Money</option>
                                        <option value="MTN_MOMO">MTN MoMo</option>
                                        <option value="WAVE">Wave</option>
                                        <option value="MOOV_MONEY">Moov Money</option>
                                        <option value="AIRTEL_MONEY">Airtel Money</option>
                                        <option value="TELMA_MONEY">Telma Money</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Numéro de compte MM</label>
                                    <input name="mobileMoneyNumber" defaultValue={agent?.mobileMoneyNumber} className="input-field font-mono" placeholder="ex: 699000111" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Ayants-droit (Family) */}
            {activeTab === 'family' && (
                <BeneficiaryManager 
                    agentId={agent?.id} 
                    themeColor={themeColor} 
                />
            )}

            {/* Tab: Contact */}
            {activeTab === 'contact' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Adresse de résidence</label>
                        <input name="address" defaultValue={agent?.address} className="input-field" placeholder="Quartier, Ville..." />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email Professionnel</label>
                        <input name="email" type="email" defaultValue={agent?.email} required className="input-field" placeholder="nom@hopital.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Téléphone Personnel</label>
                        <div className="flex gap-2">
                            <input name="telephone" required defaultValue={agent?.telephone} className="input-field flex-1" placeholder="+237 ..." />
                            <label className="flex items-center gap-2 px-3 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:border-emerald-500/50 transition-colors">
                                <input name="isWhatsAppCompatible" type="checkbox" defaultChecked={agent ? agent.isWhatsAppCompatible : true} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
                                <Smartphone size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</span>
                            </label>
                        </div>
                    </div>

                    <div className="col-span-2 border-t border-slate-800 pt-6 mt-2">
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Contact d'urgence
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom du contact</label>
                                <input name="emergencyContactName" defaultValue={agent?.emergencyContactName} className="input-field" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Téléphone d'urgence</label>
                                <input name="emergencyContactPhone" defaultValue={agent?.emergencyContactPhone} className="input-field" />
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
                    {isLoading ? 'Enregistrement...' : agent ? 'Mettre à jour le Dossier' : 'Créer le Dossier Agent'}
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

const BeneficiaryManager = ({ agentId, themeColor }: { agentId?: number, themeColor: string }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);

    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

    const { data: beneficiaries = [], isLoading } = useQuery({
        queryKey: ['beneficiaries', agentId],
        queryFn: () => agentId ? fetchBeneficiaries(agentId) : Promise.resolve([]),
        enabled: !!agentId,
    });

    const addMutation = useMutation({
        mutationFn: createBeneficiary,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', agentId] });
            setIsAdding(false);
        },
    });

    const removeMutation = useMutation({
        mutationFn: deleteBeneficiary,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', agentId] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => updateBeneficiary(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', agentId] });
        },
    });

    if (!agentId) {
        return (
            <div className="p-12 text-center bg-slate-950/20 rounded-3xl border border-dashed border-slate-800">
                <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
                <h3 className="text-white font-bold mb-2">Dossier Agent non enregistré</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Veuillez d'abord créer le dossier de l'agent avant de pouvoir ajouter des ayants-droit.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Heart size={20} className="text-red-500" />
                        Membres de la Famille
                    </h3>
                    <p className="text-sm text-slate-500">Liste des bénéficiaires rattachés à cet agent</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105",
                        `bg-${themeColor}`
                    )}
                >
                    <Plus size={16} />
                    Ajouter un membre
                </button>
            </div>

            {isLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
            ) : beneficiaries.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/20 rounded-3xl border border-dashed border-slate-800">
                    <Baby className="mx-auto text-slate-700 mb-4" size={48} />
                    <p className="text-slate-500">Aucun ayant-droit enregistré</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {beneficiaries.map((b) => (
                        <div key={b.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                    b.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" :
                                    b.status === 'REJECTED' ? "bg-red-500/10 text-red-500" :
                                    "bg-yellow-500/10 text-yellow-500"
                                )}>
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-white flex items-center gap-2">
                                        {b.firstName} {b.lastName}
                                        {b.status === 'PENDING' && <span className="text-[9px] uppercase tracking-wider bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1"><Clock size={10}/> En attente</span>}
                                        {b.status === 'APPROVED' && <span className="text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10}/> Approuvé</span>}
                                        {b.status === 'REJECTED' && <span className="text-[9px] uppercase tracking-wider bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1"><XCircle size={10}/> Rejeté</span>}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs mt-1">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full font-bold uppercase",
                                            b.relationship === 'CONJOINT' ? "bg-pink-500/10 text-pink-500" :
                                            b.relationship === 'ENFANT' ? "bg-blue-500/10 text-blue-500" :
                                            "bg-slate-500/10 text-slate-500"
                                        )}>
                                            {b.relationship}
                                        </span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-400">{b.dateOfBirth || 'Date inconnue'}</span>
                                    </div>
                                    {b.proofDocumentUrl && (
                                        <a href={b.proofDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2">
                                            <FileText size={12} /> Voir le justificatif
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                {isAdminOrManager && b.status === 'PENDING' && (
                                    <>
                                        <button
                                            onClick={() => updateMutation.mutate({ id: b.id, data: { status: 'APPROVED' } })}
                                            className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                            title="Approuver"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            onClick={() => updateMutation.mutate({ id: b.id, data: { status: 'REJECTED' } })}
                                            className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                                            title="Rejeter"
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => removeMutation.mutate(b.id)}
                                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus size={20} className={cn(`text-${themeColor}`)} />
                                Nouvel Ayant-droit
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white"><X /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const data = Object.fromEntries(formData.entries());
                            addMutation.mutate({ ...data, agentId } as any);
                        }} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nom</label>
                                    <input name="lastName" required className="input-field" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Prénom</label>
                                    <input name="firstName" required className="input-field" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Lien de parenté</label>
                                <select name="relationship" className="input-field">
                                    <option value="CONJOINT">Conjoint(e)</option>
                                    <option value="ENFANT">Enfant</option>
                                    <option value="PARENT">Parent</option>
                                    <option value="TUTEUR">Tuteur / Pupille</option>
                                    <option value="AUTRE">Autre</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Date de naissance</label>
                                    <input name="dateOfBirth" type="date" className="input-field" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Sexe</label>
                                    <select name="gender" className="input-field">
                                        <option value="M">Masculin</option>
                                        <option value="F">Féminin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2 mt-4 bg-slate-950/30 p-4 rounded-xl border border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <FileText size={14} /> Pièce Justificative (Obligatoire pour validation)
                                </label>
                                <p className="text-xs text-slate-400 mb-2">Veuillez insérer un lien vers l'acte de naissance, de mariage ou un justificatif officiel. Sans cette pièce, le service RH ne pourra pas valider ce dossier.</p>
                                <input name="proofDocumentUrl" className="input-field" placeholder="ex: https://drive.google.com/doc..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 rounded-xl font-bold text-slate-400 hover:text-white transition-colors">Annuler</button>
                                <button type="submit" disabled={addMutation.isPending} className={cn("px-8 py-2 rounded-xl font-bold text-white transition-all hover:scale-105", `bg-${themeColor}`)}>
                                    {addMutation.isPending ? 'Ajout...' : 'Ajouter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
