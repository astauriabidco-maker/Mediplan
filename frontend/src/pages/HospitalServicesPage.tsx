import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchHospitalServicesTree,
    fetchHospitalServices,
    createHospitalService,
    createSubService,
    updateHospitalService,
    deleteHospitalService,
    assignResponsible,
    fetchHospitalServicesStats,
    HospitalService
} from '../api/hospital-services.api';
import { fetchAgents, updateAgent, Agent } from '../api/agents.api';
import { useAuth } from '../store/useAuth';
import {
    Layers, Plus, Search, Trash2, Edit2, X, Loader2, Users, TrendingUp, Building2,
    ChevronRight, ChevronDown, UserCircle, UserCheck, Stethoscope, Clipboard
} from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const HospitalServicesPage = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<HospitalService | null>(null);
    const [parentServiceForNew, setParentServiceForNew] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');

    const { data: servicesTree = [], isLoading: isTreeLoading } = useQuery({
        queryKey: ['hospital-services-tree'],
        queryFn: fetchHospitalServicesTree,
    });

    const { data: services = [], isLoading: isServicesLoading } = useQuery({
        queryKey: ['hospital-services'],
        queryFn: fetchHospitalServices,
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: fetchAgents,
    });

    const { data: stats } = useQuery({
        queryKey: ['hospital-services-stats'],
        queryFn: fetchHospitalServicesStats,
    });

    const createMutation = useMutation({
        mutationFn: createHospitalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hospital-services'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-tree'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-stats'] });
            setIsModalOpen(false);
            setParentServiceForNew(null);
        },
    });

    const createSubMutation = useMutation({
        mutationFn: ({ parentId, data }: { parentId: number; data: Partial<HospitalService> }) =>
            createSubService(parentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hospital-services'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-tree'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-stats'] });
            setIsModalOpen(false);
            setParentServiceForNew(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<HospitalService> }) =>
            updateHospitalService(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hospital-services'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-tree'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-stats'] });
            setIsModalOpen(false);
            setEditingService(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteHospitalService,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hospital-services'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-tree'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-stats'] });
        },
    });

    const assignResponsibleMutation = useMutation({
        mutationFn: ({ serviceId, role, agentId }: { serviceId: number; role: string; agentId: number | null }) =>
            assignResponsible(serviceId, role as any, agentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hospital-services'] });
            queryClient.invalidateQueries({ queryKey: ['hospital-services-tree'] });
        },
    });

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(search.toLowerCase()) ||
        (service.code?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const handleEdit = (service: HospitalService) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleDelete = async (service: HospitalService) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le service "${service.name}" ?`)) {
            try {
                await deleteMutation.mutateAsync(service.id);
            } catch (error: any) {
                alert(error.response?.data?.message || 'Erreur lors de la suppression');
            }
        }
    };

    const handleAddSubService = (parentId: number) => {
        setParentServiceForNew(parentId);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
        setParentServiceForNew(null);
    };

    const isLoading = isTreeLoading || isServicesLoading;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Services Hospitaliers</h1>
                    <p className="text-slate-400">Gérez la hiérarchie des services, sous-services et responsables.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setViewMode(viewMode === 'tree' ? 'grid' : 'tree')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                        {viewMode === 'tree' ? '📊 Vue Grille' : '🌳 Vue Arbre'}
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95",
                            `bg-${themeColor}`
                        )}
                    >
                        <Plus size={20} />
                        Nouveau Service
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <Building2 className="text-blue-400" size={24} />
                            </div>
                            <TrendingUp className="text-blue-400/50" size={20} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Total Services</p>
                        <p className="text-3xl font-bold text-white">{stats.totalServices}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                                <Users className="text-emerald-400" size={24} />
                            </div>
                            <TrendingUp className="text-emerald-400/50" size={20} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Agents Assignés</p>
                        <p className="text-3xl font-bold text-white">{stats.totalAgents}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <UserCheck className="text-purple-400" size={24} />
                            </div>
                            <TrendingUp className="text-purple-400/50" size={20} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Services avec Chef</p>
                        <p className="text-3xl font-bold text-white">
                            {stats.services.filter(s => s.hasChief).length}
                        </p>
                    </div>
                </div>
            )}

            {/* Services List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Toolbar */}
                {viewMode === 'grid' && (
                    <div className="p-4 border-b border-slate-800 flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher par nom ou code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 outline-none focus:border-slate-600 transition-colors placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-slate-500" size={32} />
                    </div>
                ) : viewMode === 'tree' ? (
                    <div className="p-6">
                        <ServiceTreeView
                            services={servicesTree}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddSubService={handleAddSubService}
                            themeColor={themeColor}
                        />
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="p-12 text-center">
                        <Layers className="mx-auto text-slate-700 mb-4" size={48} />
                        <p className="text-slate-500 mb-2">Aucun service trouvé</p>
                        <p className="text-slate-600 text-sm">Créez votre premier service hospitalier</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {filteredServices.map((service) => {
                            const serviceStats = stats?.services.find(s => s.id === service.id);
                            return (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    serviceStats={serviceStats}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    themeColor={themeColor}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ServiceModal
                    service={editingService}
                    parentServiceId={parentServiceForNew}
                    agents={agents}
                    services={services}
                    onClose={handleCloseModal}
                    onSubmit={async (data: any) => {
                        if (editingService) {
                            await updateMutation.mutateAsync({ id: editingService.id, data });
                        } else if (parentServiceForNew) {
                            await createSubMutation.mutateAsync({ parentId: parentServiceForNew, data });
                        } else {
                            // Creation flow with potential agent assignment
                            const agentsToAdd = data.agentsToAdd as number[];
                            delete data.agentsToAdd; // Clean up before sending to API

                            const newService = await createMutation.mutateAsync(data);

                            // Chain agent assignment if any
                            if (agentsToAdd && agentsToAdd.length > 0 && newService) {
                                await Promise.all(agentsToAdd.map(agentId =>
                                    updateAgent(agentId, { hospitalServiceId: newService.id })
                                ));
                                // Re-invalidate to show updated agents
                                queryClient.invalidateQueries({ queryKey: ['agents'] });
                                queryClient.invalidateQueries({ queryKey: ['hospital-services'] });
                            }
                        }
                    }}
                    isLoading={createMutation.isPending || updateMutation.isPending || createSubMutation.isPending}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
};

// Service Tree View Component
const ServiceTreeView = ({
    services,
    onEdit,
    onDelete,
    onAddSubService,
    themeColor,
    level = 0
}: {
    services: HospitalService[];
    onEdit: (service: HospitalService) => void;
    onDelete: (service: HospitalService) => void;
    onAddSubService: (parentId: number) => void;
    themeColor: string;
    level?: number;
}) => {
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const toggleExpand = (id: number) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    return (
        <div className="space-y-2">
            {services.map((service) => {
                const isExpanded = expandedIds.has(service.id);
                const hasSubServices = service.subServices && service.subServices.length > 0;

                return (
                    <div key={service.id} className="space-y-2">
                        <div
                            className={cn(
                                "group flex items-center gap-3 p-4 rounded-xl hover:bg-slate-800/50 transition-all",
                                level > 0 && "ml-8 border-l-2 border-slate-700"
                            )}
                        >
                            {/* Expand/Collapse */}
                            {hasSubServices ? (
                                <button
                                    onClick={() => toggleExpand(service.id)}
                                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                    {isExpanded ? (
                                        <ChevronDown size={18} className="text-slate-400" />
                                    ) : (
                                        <ChevronRight size={18} className="text-slate-400" />
                                    )}
                                </button>
                            ) : (
                                <div className="w-6" />
                            )}

                            {/* Service Icon */}
                            <div className={cn("p-2 rounded-lg", `bg-${themeColor}/10`)}>
                                <Layers className={cn(`text-${themeColor}`)} size={20} />
                            </div>

                            {/* Service Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">{service.name}</h4>
                                    {service.code && (
                                        <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                                            {service.code}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-500">
                                        {service.agents?.length || 0} agent{(service.agents?.length || 0) > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Responsables */}
                                <div className="flex gap-3 mt-2 text-xs">
                                    {service.chief && (
                                        <div className="flex items-center gap-1 text-blue-400">
                                            <Stethoscope size={12} />
                                            <span>{service.chief.nom}</span>
                                        </div>
                                    )}
                                    {service.major && (
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <UserCircle size={12} />
                                            <span>{service.major.nom}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onAddSubService(service.id)}
                                    className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                                    title="Ajouter sous-service"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onClick={() => onEdit(service)}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(service)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Sub-services */}
                        {isExpanded && hasSubServices && (
                            <ServiceTreeView
                                services={service.subServices!}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onAddSubService={onAddSubService}
                                themeColor={themeColor}
                                level={level + 1}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Service Card Component (for grid view)
const ServiceCard = ({
    service,
    serviceStats,
    onEdit,
    onDelete,
    themeColor
}: {
    service: HospitalService;
    serviceStats?: any;
    onEdit: (service: HospitalService) => void;
    onDelete: (service: HospitalService) => void;
    themeColor: string;
}) => {
    return (
        <div className="group bg-slate-950/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-lg", `bg-${themeColor}/10`)}>
                    <Layers className={cn(`text-${themeColor}`)} size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(service)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(service)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
            {service.code && (
                <p className="text-xs font-mono text-slate-500 mb-3 bg-slate-800 px-2 py-1 rounded inline-block">
                    {service.code}
                </p>
            )}
            {service.description && (
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{service.description}</p>
            )}

            <div className="flex items-center gap-2 text-sm">
                <Users size={16} className="text-slate-500" />
                <span className="text-slate-400">
                    {serviceStats?.agentCount || 0} agent{(serviceStats?.agentCount || 0) > 1 ? 's' : ''}
                </span>
            </div>
        </div>
    );
};

// Service Modal Component
const ServiceModal = ({
    service,
    parentServiceId,
    agents,
    services,
    onClose,
    onSubmit,
    isLoading,
    themeColor
}: {
    service: HospitalService | null;
    parentServiceId: number | null;
    agents: Agent[];
    services: HospitalService[];
    onClose: () => void;
    onSubmit: (data: Partial<HospitalService>) => void;
    isLoading: boolean;
    themeColor: string;
}) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');
    const [selectedAgentToAdd, setSelectedAgentToAdd] = useState<string>('');
    const [selectedAgentsForCreate, setSelectedAgentsForCreate] = useState<Set<number>>(new Set());

    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const hasStaffPermission = user?.permissions?.includes('*') || user?.permissions?.includes('services:manage_staff') || isAdminOrManager;

    const serviceAgents = service
        ? agents.filter(a => a.hospitalServiceId === service.id)
        : agents.filter(a => selectedAgentsForCreate.has(a.id));

    const availableAgents = service
        ? agents.filter(a => !a.hospitalServiceId || a.hospitalServiceId !== service.id)
        : agents.filter(a => !selectedAgentsForCreate.has(a.id));

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        // Convert numeric fields
        if (data.parentServiceId) data.parentServiceId = Number(data.parentServiceId);
        if (data.chiefId) data.chiefId = Number(data.chiefId);
        if (data.deputyChiefId) data.deputyChiefId = Number(data.deputyChiefId);
        if (data.majorId) data.majorId = Number(data.majorId);
        if (data.nursingManagerId) data.nursingManagerId = Number(data.nursingManagerId);
        if (data.maxAgents) data.maxAgents = Number(data.maxAgents);
        if (data.minAgents) data.minAgents = Number(data.minAgents);

        // Append temporarily selected agents if creating
        if (!service) {
            data.agentsToAdd = Array.from(selectedAgentsForCreate);
        }

        onSubmit(data);
    };

    const tabs = [
        { id: 'general', label: 'Général', icon: Building2 },
        { id: 'responsibles', label: 'Responsables', icon: UserCheck },
        { id: 'capacity', label: 'Capacités', icon: Layers },
        { id: 'staff', label: 'Personnel & Agents', icon: Users },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {service ? 'Modifier le Service' : parentServiceId ? 'Nouveau Sous-Service' : 'Nouveau Service Principal'}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {service ? 'Mettez à jour les informations du service' : 'Créez un nouveau service avec responsables et capacités'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-slate-800 px-6 pt-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-4 py-2 font-medium text-sm transition-all relative flex items-center gap-2",
                                    activeTab === tab.id
                                        ? `text-${themeColor}`
                                        : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", `bg-${themeColor}`)} />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 space-y-6">
                        {activeTab !== 'staff' ? (
                            <form id="service-form" onSubmit={handleSubmit}>
                                {/* Tab: General */}
                                {activeTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">
                                                Nom du Service <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                name="name"
                                                required
                                                defaultValue={service?.name}
                                                className="input-field"
                                                placeholder="ex: Urgences, Cardiologie"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Code Court</label>
                                            <input
                                                name="code"
                                                defaultValue={service?.code}
                                                className="input-field font-mono"
                                                placeholder="ex: URG, CARD"
                                                maxLength={10}
                                            />
                                        </div>

                                        {!service && !parentServiceId && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Service Parent</label>
                                                <select name="parentServiceId" className="input-field">
                                                    <option value="">-- Service Principal --</option>
                                                    {services.filter(s => s.level === 1).map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="col-span-2 space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                            <textarea
                                                name="description"
                                                defaultValue={service?.description}
                                                className="input-field min-h-[80px] resize-none"
                                                placeholder="Description du service, spécialités, équipements..."
                                            />
                                        </div>

                                        {/* Section Personnel Rapide */}
                                        {service && (
                                            <div className="col-span-2 p-4 bg-slate-950/30 border border-slate-800 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aperçu du personnel ({serviceAgents.length})</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab('staff')}
                                                        className={cn("text-[10px] font-bold uppercase transition-colors hover:underline", `text-${themeColor}`)}
                                                    >
                                                        Gérer tout le personnel →
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {serviceAgents.slice(0, 5).map(agent => (
                                                        <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-lg border border-white/5">
                                                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white", `bg-${themeColor}`)}>
                                                                {agent.nom.charAt(0)}
                                                            </div>
                                                            <span className="text-[10px] text-slate-300 font-medium">{agent.nom}</span>
                                                        </div>
                                                    ))}
                                                    {serviceAgents.length > 5 && (
                                                        <span className="text-[10px] text-slate-500 flex items-center">+{serviceAgents.length - 5} autres</span>
                                                    )}
                                                    {serviceAgents.length === 0 && (
                                                        <p className="text-[10px] text-slate-600 italic">Aucun agent encore associé</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab: Responsibles */}
                                {activeTab === 'responsibles' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                <Stethoscope size={14} />
                                                Chef de Service
                                            </label>
                                            <select name="chiefId" className="input-field" defaultValue={service?.chiefId || ''}>
                                                <option value="">-- Aucun --</option>
                                                {agents.map(agent => (
                                                    <option key={agent.id} value={agent.id}>{agent.nom}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                <UserCircle size={14} />
                                                Adjoint au Chef
                                            </label>
                                            <select name="deputyChiefId" className="input-field" defaultValue={service?.deputyChiefId || ''}>
                                                <option value="">-- Aucun --</option>
                                                {agents.map(agent => (
                                                    <option key={agent.id} value={agent.id}>{agent.nom}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                <UserCheck size={14} />
                                                Major (Infirmier Principal)
                                            </label>
                                            <select name="majorId" className="input-field" defaultValue={service?.majorId || ''}>
                                                <option value="">-- Aucun --</option>
                                                {agents.map(agent => (
                                                    <option key={agent.id} value={agent.id}>{agent.nom}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                <Clipboard size={14} />
                                                Cadre Infirmier
                                            </label>
                                            <select name="nursingManagerId" className="input-field" defaultValue={service?.nursingManagerId || ''}>
                                                <option value="">-- Aucun --</option>
                                                {agents.map(agent => (
                                                    <option key={agent.id} value={agent.id}>{agent.nom}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Capacity */}
                                {activeTab === 'capacity' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre Minimum d'Agents</label>
                                            <input
                                                name="minAgents"
                                                type="number"
                                                min="0"
                                                defaultValue={service?.minAgents}
                                                className="input-field"
                                                placeholder="ex: 5"
                                            />
                                            <p className="text-xs text-slate-500">Alerte si en dessous de ce seuil</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre Maximum d'Agents</label>
                                            <input
                                                name="maxAgents"
                                                type="number"
                                                min="0"
                                                defaultValue={service?.maxAgents}
                                                className="input-field"
                                                placeholder="ex: 20"
                                            />
                                            <p className="text-xs text-slate-500">Quota maximum autorisé</p>
                                        </div>
                                    </div>
                                )}
                            </form>
                        ) : (
                            activeTab === 'staff' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    {/* Removed blocking message for !service */}

                                    {hasStaffPermission && (
                                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Ajouter un agent au service</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedAgentToAdd}
                                                    onChange={(e) => setSelectedAgentToAdd(e.target.value)}
                                                    className="input-field flex-1"
                                                >
                                                    <option value="">-- Sélectionner un agent --</option>
                                                    {availableAgents.map(a => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.nom || 'Anonyme'} ({a.hospitalService?.name || 'Sans service'})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    disabled={!selectedAgentToAdd}
                                                    onClick={async () => {
                                                        const agentId = Number(selectedAgentToAdd);
                                                        if (service) {
                                                            await updateAgent(agentId, { hospitalServiceId: service.id });
                                                            queryClient.invalidateQueries({ queryKey: ['agents'] });
                                                        } else {
                                                            // Temp state for creation
                                                            const newSet = new Set(selectedAgentsForCreate);
                                                            newSet.add(agentId);
                                                            setSelectedAgentsForCreate(newSet);
                                                        }
                                                        setSelectedAgentToAdd('');
                                                    }}
                                                    className={cn("px-4 py-2 rounded-xl font-bold text-white transition-all disabled:opacity-50", `bg-${themeColor}`)}
                                                >
                                                    Ajouter
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase">Liste du personnel ({serviceAgents.length})</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {serviceAgents.length === 0 ? (
                                                <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
                                                    <Users size={24} className="mx-auto text-slate-700 mb-2" />
                                                    <p className="text-sm text-slate-500">Aucun agent assigné à ce service</p>
                                                </div>
                                            ) : (
                                                serviceAgents.map(agent => (
                                                    <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white", `bg-${themeColor}`)}>
                                                                {(agent.nom || '?').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-200 text-sm">{agent.nom || 'Sans Nom'}</p>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{agent.jobTitle || 'Agent'}</p>
                                                            </div>
                                                        </div>
                                                        {hasStaffPermission && (
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (confirm(`Retirer ${agent.nom || 'cet agent'} de ce service ?`)) {
                                                                        if (service) {
                                                                            await updateAgent(agent.id, { hospitalServiceId: null } as any);
                                                                            queryClient.invalidateQueries({ queryKey: ['agents'] });
                                                                        } else {
                                                                            const newSet = new Set(selectedAgentsForCreate);
                                                                            newSet.delete(agent.id);
                                                                            setSelectedAgentsForCreate(newSet);
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        Annuler
                    </button>
                    {activeTab !== 'staff' && (
                        <button
                            form="service-form"
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                `bg-${themeColor}`
                            )}
                        >
                            {isLoading ? 'Enregistrement...' : service ? 'Mettre à jour' : 'Créer le Service'}
                        </button>
                    )}
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
            </div>
        </div>
    );
};
