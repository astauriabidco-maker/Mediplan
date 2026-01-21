import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, Users, ClipboardCheck, TrendingUp, Shield, Smartphone, Globe, Save, Award, HeartPulse, Wifi, User, Settings as SettingsIcon, ShieldCheck, Clock } from 'lucide-react'
import { useAppConfig } from '../store/useAppConfig'
import { useAuth } from '../store/useAuth'
import { UsersManagement } from './UsersManagement'
import { ProfileSettings } from './ProfileSettings'
import { RolesManagement } from './RolesManagement'
import { StructureRulesTab } from './StructureRulesTab'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

import { useQuery } from '@tanstack/react-query'
import { fetchDashboardKPIs } from '../api/dashboard.api'

export const DashboardPage = () => {
    const { themeColor } = useAppConfig()
    const { data: kpis, isLoading } = useQuery({
        queryKey: ['dashboard-kpis'],
        queryFn: fetchDashboardKPIs,
        refetchInterval: 30000, // Refresh every 30s
    })

    const stats = [
        {
            label: 'Taux d\'Occupation',
            value: isLoading ? '...' : `${kpis?.occupancyRate}%`,
            icon: Activity,
            color: 'text-blue-500',
            trend: 'Hebdomadaire'
        },
        {
            label: 'Heures Sup. (Total)',
            value: isLoading ? '...' : `${kpis?.totalOvertimeHours}h`,
            icon: ClipboardCheck,
            color: 'text-emerald-500',
            trend: 'Cette semaine'
        },
        {
            label: 'Alertes RH',
            value: '0',
            icon: Shield,
            color: 'text-amber-500',
            trend: 'Aucun incident'
        },
        {
            label: 'Productivité',
            value: '+12%',
            icon: TrendingUp,
            color: 'text-purple-500',
            trend: 'vs mois dernier'
        },
    ]

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col xl:flex-row gap-8">
                {/* Main Content Area */}
                <div className="flex-1 space-y-8">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white">Tableau de Bord</h1>
                        <p className="text-slate-400 font-medium tracking-wide">Vue d'ensemble de l'activité hospitalière en temps réel.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all hover:translate-y-[-4px] group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1">
                                    <div className={cn("w-2 h-2 rounded-full animate-pulse", stat.color.replace('text', 'bg'))} />
                                </div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-slate-800 ${stat.color} group-hover:scale-110 transition-transform shadow-lg`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">Live</span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-bold text-white tracking-tight leading-none">{stat.value}</h3>
                                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-2">{stat.trend}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-inner">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white uppercase italic tracking-wider">
                                <Activity className="text-emerald-500" />
                                Soldes de Congés (Équipe)
                            </h3>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <th className="pb-4 px-2">Agent</th>
                                            <th className="pb-4 px-2 text-center">Consommé</th>
                                            <th className="pb-4 px-2 text-center">Restant</th>
                                            <th className="pb-4 px-2">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {isLoading ? (
                                            <tr><td colSpan={4} className="py-8 text-center text-slate-500 italic">Chargement...</td></tr>
                                        ) : kpis?.leaveBalances?.slice(0, 5).map((balance) => (
                                            <tr key={balance.agentId} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 px-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-blue-400">
                                                            {balance.agentName.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium text-white">{balance.agentName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-center text-sm font-bold text-rose-400">{balance.consumed} j</td>
                                                <td className="py-4 px-2 text-center text-sm font-bold text-emerald-400">{balance.remaining} j</td>
                                                <td className="py-4 px-2">
                                                    <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${(balance.remaining / 30) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white uppercase italic tracking-wider">
                                <Users className="text-blue-500" />
                                Équipe de Garde
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { name: 'Dr. Kamga', role: 'Médecin Chef', status: 'En poste' },
                                    { name: 'Inf. Abena', role: 'Urgences', status: 'En poste' },
                                    { name: 'Dr. Tamo', role: 'Cardiologie', status: 'De garde' },
                                ].map((staff, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/20 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-800/40">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                                            {staff.name.split(' ')[1].charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white leading-tight">{staff.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{staff.role}</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-tighter">
                                            {staff.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-full xl:w-80 space-y-8 animate-in slide-in-from-right-8 duration-700">
                    {/* Metrics Overview */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center justify-between">
                            Statut de l'Hôpital
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span className="text-slate-400">Occupation</span>
                                    <span className="text-white">{isLoading ? '...' : `${kpis?.occupancyRate}%`}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-1000"
                                        style={{ width: `${kpis?.occupancyRate || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center justify-between">
                            Alertes Récentes
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        </h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex flex-col gap-1 border-l-2 border-slate-800 pl-4 py-1 hover:border-blue-500 transition-colors cursor-pointer group">
                                    <p className="text-sm font-semibold text-white group-hover:text-blue-400">Conflit de planning évité</p>
                                    <p className="text-xs text-slate-500">Service Urgences • Il y a 5m</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Prochains Congés</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Mvondo Paul', date: 'Demain' },
                                { name: 'Essomba Jean', date: '02 Jan.' },
                            ].map((leave, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                        <HeartPulse size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{leave.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{leave.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-xl transition-all border border-white/5">
                            Voir tout le planning
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { AuditLogPage } from './AuditLogPage'

export const SettingsPage = () => {
    const { region, regions, setRegion, addRegion, mobileMoney, offlineMode, themeColor } = useAppConfig()
    const { user } = useAuth()

    // UI state for system configuration
    const [isAdding, setIsAdding] = React.useState(false)
    const [newRegionName, setNewRegionName] = React.useState('')

    const handleAddRegion = (e: React.FormEvent) => {
        e.preventDefault()
        if (newRegionName.trim()) {
            addRegion(newRegionName.trim())
            setRegion(newRegionName.trim())
            setNewRegionName('')
            setIsAdding(false)
        }
    }

    const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'
    // Use search params for deep linking to tabs
    const [searchParams, setSearchParams] = useSearchParams()
    const tabParam = searchParams.get('tab') as 'users' | 'profile' | 'system' | 'roles' | 'rules' | 'history'
    const [activeTab, setActiveTabState] = React.useState<'users' | 'profile' | 'system' | 'roles' | 'rules' | 'history'>(tabParam || (isAdminOrManager ? 'users' : 'profile'))

    const setActiveTab = (tab: 'users' | 'profile' | 'system' | 'roles' | 'rules' | 'history') => {
        setActiveTabState(tab)
        setSearchParams({ tab })
    }

    // Set default tab based on role if no param
    React.useEffect(() => {
        if (!tabParam) {
            setActiveTab(isAdminOrManager ? 'users' : 'profile')
        }
    }, [isAdminOrManager, tabParam])

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase italic">Paramètres</h1>
                <p className="text-slate-400 font-medium">Configurez votre environnement de travail et gérez vos accès.</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
                {isAdminOrManager && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={cn("px-6 py-3 font-bold text-xs tracking-widest uppercase transition-all rounded-xl flex items-center gap-2",
                            activeTab === 'users' ? `bg-${themeColor} text-white shadow-lg` : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}
                    >
                        <Users size={16} />
                        Utilisateurs
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('profile')}
                    className={cn("px-6 py-3 font-bold text-xs tracking-widest uppercase transition-all rounded-xl flex items-center gap-2",
                        activeTab === 'profile' ? `bg-${themeColor} text-white shadow-lg` : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}
                >
                    <User size={16} />
                    Mon Profil
                </button>
                {isAdminOrManager && (
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={cn("px-6 py-3 font-bold text-xs tracking-widest uppercase transition-all rounded-xl flex items-center gap-2",
                            activeTab === 'roles' ? `bg-${themeColor} text-white shadow-lg` : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}
                    >
                        <Shield size={16} />
                        Rôles & Permissions
                    </button>
                )}
                {isAdminOrManager && (
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={cn("px-6 py-3 font-bold text-xs tracking-widest uppercase transition-all rounded-xl flex items-center gap-2",
                            activeTab === 'rules' ? `bg-${themeColor} text-white shadow-lg` : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}
                    >
                        <ShieldCheck size={16} />
                        Structure & Règles
                    </button>
                )}
                {isAdminOrManager && (
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn("px-6 py-3 font-bold text-xs tracking-widest uppercase transition-all rounded-xl flex items-center gap-2",
                            activeTab === 'history' ? `bg-${themeColor} text-white shadow-lg` : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}
                    >
                        <Clock size={16} />
                        Historique
                    </button>
                )}
                {isAdminOrManager && (
                    <button
                        onClick={() => setActiveTab('system')}
                        className={cn("px-6 py-3 font-bold text-xs tracking-widest uppercase transition-all rounded-xl flex items-center gap-2",
                            activeTab === 'system' ? `bg-${themeColor} text-white shadow-lg` : "text-slate-500 hover:text-slate-300 hover:bg-white/5")}
                    >
                        <SettingsIcon size={16} />
                        Système
                    </button>
                )}
            </div>

            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                {activeTab === 'users' && <UsersManagement />}
                {activeTab === 'profile' && <ProfileSettings />}
                {activeTab === 'roles' && <RolesManagement />}
                {activeTab === 'rules' && <StructureRulesTab />}
                {activeTab === 'history' && <AuditLogPage />}
                {activeTab === 'system' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section Localisation */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                            <h3 className="text-xl font-bold flex items-center gap-3 uppercase tracking-tight text-white">
                                <Globe className="text-blue-500" />
                                Localisation
                            </h3>

                            <div className="space-y-4">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Région Active</p>
                                        {isAdding ? (
                                            <button onClick={() => setIsAdding(false)} className="text-xs text-red-400 hover:text-red-300 font-bold uppercase">Annuler</button>
                                        ) : (
                                            <button onClick={() => setIsAdding(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold uppercase">
                                                + Ajouter
                                            </button>
                                        )}
                                    </div>

                                    {isAdding ? (
                                        <form onSubmit={handleAddRegion} className="flex gap-2">
                                            <input
                                                autoFocus
                                                value={newRegionName}
                                                onChange={(e) => setNewRegionName(e.target.value)}
                                                placeholder="Nom de la région..."
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                                            />
                                            <button type="submit" className="px-4 py-2.5 bg-blue-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-600/20">Valider</button>
                                        </form>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {regions.map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => setRegion(r)}
                                                    className={cn(
                                                        "px-4 py-3 rounded-xl text-sm font-bold transition-all text-left flex items-center justify-between",
                                                        region === r
                                                            ? `bg-${themeColor}/20 text-${themeColor} border border-${themeColor}/50`
                                                            : "bg-slate-950 text-slate-500 hover:bg-slate-800 hover:text-slate-300 border border-transparent"
                                                    )}
                                                >
                                                    {r}
                                                    {region === r && <div className={cn("w-2 h-2 rounded-full", `bg-${themeColor}`)} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section Fonctionnalités */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 uppercase tracking-tight">
                            <h3 className="text-xl font-bold flex items-center gap-3 text-white">
                                <Smartphone className="text-emerald-500" />
                                Fonctionnalités
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white uppercase text-sm tracking-wide">Mobile Money</p>
                                            <p className="text-xs text-slate-500 normal-case">Disponible pour les règlements rapides (déclenchement via interface).</p>
                                        </div>
                                    </div>
                                    <div className={cn("w-14 h-7 rounded-full relative transition-all duration-300 cursor-pointer p-1 ring-1 ring-white/10", mobileMoney ? "bg-emerald-500" : "bg-slate-800")}>
                                        <div className={cn("w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300", mobileMoney ? "translate-x-7" : "translate-x-0")} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white uppercase text-sm tracking-wide">Mode Hors-ligne</p>
                                            <p className="text-xs text-slate-500 normal-case">Synchronisation locale-first pour les zones à faible débit.</p>
                                        </div>
                                    </div>
                                    <div className={cn("w-14 h-7 rounded-full relative transition-all duration-300 cursor-pointer p-1 ring-1 ring-white/10", offlineMode ? "bg-emerald-500" : "bg-slate-800")}>
                                        <div className={cn("w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300", offlineMode ? "translate-x-7" : "translate-x-0")} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

}

export const PaymentPage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Paiements & Primes</h1>
            <p className="text-slate-400">Gestion des primes de garde et intégration Mobile Money.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Smartphone className="text-emerald-500" />
                    Mobile Money
                </h3>
                <p className="text-slate-400 mb-6">
                    Déclenchez les paiements instantanés pour les gardes validées via Orange Money ou MTN Mobile Money.
                </p>
                <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors">
                    Nouveau Virement
                </button>
            </div>
        </div>
    </div>
)

export const QvtPage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Santé & QVT</h1>
            <p className="text-slate-400">Qualité de Vie au Travail et suivi de la fatigue.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                    <HeartPulse size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Indice de Fatigue Global</h3>
                    <p className="text-slate-400">Analyse en temps réel basée sur les cycles de garde.</p>
                </div>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 w-[35%]" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Optimal</span>
                <span>Critique</span>
            </div>
        </div>
    </div>
)

export const SyncPage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Synchronisation</h1>
            <p className="text-slate-400">État de la synchronisation des données (Offline-First).</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                    <Wifi size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Statut : En ligne</h3>
                    <p className="text-slate-400">Dernière synchro : Il y a 2 minutes</p>
                </div>
            </div>
            <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors">
                Forcer la synchro
            </button>
        </div>
    </div>
);

export const HospitalServicesPage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Services Hospitaliers</h1>
            <p className="text-slate-400">Gérez les départements et unités de soins.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="text-emerald-500" size={32} />
            </div>
            <p className="text-slate-400 text-lg font-medium mb-2">Interface de gestion des services</p>
            <p className="text-slate-500 max-w-sm mx-auto">Configurez les services cliniques, les quotas de personnel et les workflows de validation par service.</p>
        </div>
    </div>
)

export const HierarchyPage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Organigramme & Hiérarchie</h1>
            <p className="text-slate-400">Visualisez les relations N+1 / N+2 et flux de validation.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="text-blue-500" size={32} />
            </div>
            <p className="text-slate-400 text-lg font-medium mb-2">Visualisation de la hiérarchie</p>
            <p className="text-slate-500 max-w-sm mx-auto">Gérez les structures de rapport direct (N+1, N+2) pour automatiser les validations de congés et de planning.</p>
        </div>
    </div>
)
