import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, Agent } from '../api/agents.api';
import { fetchHospitalServicesTree, HospitalService } from '../api/hospital-services.api';
import { useAppConfig } from '../store/useAppConfig';
import { Network, Users, Building2, UserCircle, ChevronDown, ChevronRight, LayoutTemplate } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ... (Rest of the file remains same, but I'll write the full content to be safe)
const OrgNode = ({ title, subtitle, icon: Icon, themeColor, isLeaf, children, expanded, onToggle }: any) => {
    return (
        <div className="flex flex-col items-center">
            <div className={cn(
                "relative z-10 w-64 bg-slate-900 border-2 rounded-2xl p-4 shadow-xl text-center transform transition-all duration-300",
                expanded ? `border-${themeColor} shadow-${themeColor}/20` : "border-slate-800"
            )}>
                <div className={cn("mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3", `bg-${themeColor}/10 text-${themeColor}`)}>
                    <Icon size={24} />
                </div>
                <h3 className="font-bold text-white text-sm line-clamp-2">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{subtitle}</p>}
                {!isLeaf && (
                    <button 
                        onClick={onToggle}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-white hover:bg-slate-700 transition"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}
            </div>
            {!isLeaf && expanded && (
                <div className="flex flex-col items-center mt-4">
                    <div className="w-px h-8 bg-slate-700" />
                    <div className="flex relative justify-center gap-6 pt-4 border-t-2 border-slate-700">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

const ServiceTree = ({ services, themeColor }: { services: HospitalService[], themeColor: string }) => {
    return (
        <div className="flex justify-center p-8 overflow-auto min-h-[600px] custom-scrollbar">
            <div className="flex gap-8">
                {services.map(service => (
                    <ServiceRecursiveNode key={service.id} service={service} themeColor={themeColor} />
                ))}
            </div>
        </div>
    );
}

const ServiceRecursiveNode = ({ service, themeColor }: { service: HospitalService, themeColor: string }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = service.subServices && service.subServices.length > 0;

    return (
        <div className="relative">
            <OrgNode
                title={service.name}
                subtitle={`${service.agents?.length || 0} agents • ${service.facility?.name || 'GHT'}`}
                icon={Building2}
                themeColor={themeColor}
                isLeaf={!hasChildren}
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
            >
                {hasChildren && service.subServices!.map((child: any) => (
                    <div key={child.id} className="relative flex flex-col items-center">
                        <div className="absolute top-[-16px] w-px h-[16px] bg-slate-700" />
                        <ServiceRecursiveNode service={child} themeColor={themeColor} />
                    </div>
                ))}
            </OrgNode>
        </div>
    );
};

const AgentTree = ({ agents, themeColor }: { agents: Agent[], themeColor: string }) => {
    const rootAgents = useMemo(() => {
        const agentMap = new Map();
        agents.forEach(a => agentMap.set(a.id, { ...a, subordinates: [] }));
        const roots: any[] = [];
        agentMap.forEach(a => {
            if (a.managerId && agentMap.has(a.managerId)) {
                agentMap.get(a.managerId).subordinates.push(a);
            } else {
                roots.push(a);
            }
        });
        return roots;
    }, [agents]);

    return (
        <div className="flex justify-center p-8 overflow-auto min-h-[600px] custom-scrollbar">
            <div className="flex gap-8">
                {rootAgents.map(agent => (
                    <AgentRecursiveNode key={agent.id} agent={agent} themeColor={themeColor} />
                ))}
            </div>
        </div>
    );
};

const AgentRecursiveNode = ({ agent, themeColor }: { agent: any, themeColor: string }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = agent.subordinates && agent.subordinates.length > 0;

    return (
        <div className="relative">
            <OrgNode
                title={`${agent.firstName || ''} ${agent.lastName || agent.nom}`.trim()}
                subtitle={agent.jobTitle || 'Fonction NC'}
                icon={UserCircle}
                themeColor={themeColor}
                isLeaf={!hasChildren}
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
            >
                {hasChildren && agent.subordinates.map((child: any) => (
                    <div key={child.id} className="relative flex flex-col items-center">
                        <div className="absolute top-[-16px] w-px h-[16px] bg-slate-700" />
                        <AgentRecursiveNode agent={child} themeColor={themeColor} />
                    </div>
                ))}
            </OrgNode>
        </div>
    );
};

export const HierarchyPage = () => {
    const { themeColor } = useAppConfig();
    const [activeTab, setActiveTab] = useState<'SERVICES' | 'AGENTS'>('AGENTS');

    const { data: services = [], isLoading: isLoadingServices } = useQuery({
        queryKey: ['hospital-services-tree'],
        queryFn: fetchHospitalServicesTree,
    });

    const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
        queryKey: ['agents'],
        queryFn: fetchAgents,
    });

    const isLoading = isLoadingServices || isLoadingAgents;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        <Network />
                        Organigramme
                    </h1>
                    <p className="text-slate-400">Gérez visuellement la pyramide hiérarchique.</p>
                </div>
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('AGENTS')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                            activeTab === 'AGENTS' ? `bg-${themeColor} text-white` : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <Users size={16} /> Personnel (RH)
                    </button>
                    <button
                        onClick={() => setActiveTab('SERVICES')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                            activeTab === 'SERVICES' ? `bg-${themeColor} text-white` : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <LayoutTemplate size={16} /> Services (Structure)
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-3xl overflow-hidden relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col justify-center items-center">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-slate-400">Génération automatique des arbres en cours...</p>
                    </div>
                ) : (
                    activeTab === 'AGENTS' 
                        ? <AgentTree agents={agents} themeColor={themeColor} />
                        : <ServiceTree services={services} themeColor={themeColor} />
                )}
            </div>
        </div>
    );
};
