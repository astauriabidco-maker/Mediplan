import React from 'react'
import { Activity, Users, ClipboardCheck, TrendingUp, Shield, Smartphone, Globe, Save, Award, HeartPulse, Wifi } from 'lucide-react'
import { useAppConfig } from '../store/useAppConfig'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const DashboardPage = () => {
    const { themeColor } = useAppConfig()

    const stats = [
        { label: 'Agents Actifs', value: '24', icon: Users, color: 'text-blue-500' },
        { label: 'Gardes Validées', value: '128', icon: ClipboardCheck, color: 'text-emerald-500' },
        { label: 'Incidents Récents', value: '0', icon: Shield, color: 'text-amber-500' },
        { label: 'Productivité', value: '+12%', icon: TrendingUp, color: 'text-purple-500' },
    ]

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col xl:flex-row gap-8">
                {/* Main Content Area */}
                <div className="flex-1 space-y-8">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white">Tableau de Bord</h1>
                        <p className="text-slate-400 font-medium">Vue d'ensemble de l'activité hospitalière en temps réel.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all hover:translate-y-[-4px] group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-slate-800 ${stat.color} group-hover:scale-110 transition-transform`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">Live</span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <Activity className="text-emerald-500" />
                                Activité Globale
                            </h3>
                            <div className="h-64 flex items-end justify-between gap-2">
                                {[40, 70, 45, 90, 65, 80, 50, 85, 95, 60, 75, 55].map((h, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div
                                            className={cn("w-full bg-slate-700 group-hover:bg-emerald-500 transition-all duration-300 rounded-t-lg")}
                                            style={{ height: `${h}%` }}
                                        />
                                        <span className="text-[10px] text-slate-600">S{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <Users className="text-blue-500" />
                                Équipe de Garde
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { name: 'Dr. Kamga', role: 'Médecin Chef', status: 'En poste' },
                                    { name: 'Inf. Abena', role: 'Urgences', status: 'En poste' },
                                    { name: 'Dr. Tamo', role: 'Cardiologie', status: 'De garde' },
                                ].map((staff, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/20 border border-slate-800 hover:border-slate-700 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs">
                                            {staff.name.split(' ')[1].charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">{staff.name}</p>
                                            <p className="text-xs text-slate-500">{staff.role}</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            {staff.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Exploratory use of space */}
                <div className="w-full xl:w-80 space-y-8 animate-in slide-in-from-right-8 duration-700">
                    {/* Alerts Panel */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center justify-between">
                            Alertes Récentes
                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        </h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex flex-col gap-1 border-l-2 border-slate-800 pl-4 py-1 hover:border-blue-500 transition-colors cursor-pointer">
                                    <p className="text-sm font-semibold text-white">Conflit de planning évité</p>
                                    <p className="text-xs text-slate-500">Service Urgences • Il y a 5m</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Panel */}
                    <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/50 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Prochains Congés</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Mvondo Paul', date: 'Demain' },
                                { name: 'Essomba Jean', date: '02 Jan.' },
                            ].map((leave, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
                                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                        <HeartPulse size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{leave.name}</p>
                                        <p className="text-[10px] text-slate-500">{leave.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all">
                            Voir tout le planning
                        </button>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Statut Service</p>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[85%]" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">Capacité occupée : 85%</p>
                            </div>
                            <span className="text-xl font-bold text-white">28/32</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const SettingsPage = () => {
    const { region, regions, setRegion, addRegion, mobileMoney, offlineMode, themeColor } = useAppConfig()
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white">Paramètres</h1>
                <p className="text-slate-400">Gérez la configuration de votre instance Mediplan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <Globe className="text-blue-500" />
                        Localisation
                    </h3>

                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-white">Région Active</p>
                                {isAdding ? (
                                    <button onClick={() => setIsAdding(false)} className="text-xs text-red-400 hover:text-red-300">Annuler</button>
                                ) : (
                                    <button onClick={() => setIsAdding(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
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
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    />
                                    <button type="submit" className="px-3 py-2 bg-blue-600 rounded-lg text-white text-sm font-bold">OK</button>
                                </form>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {regions.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRegion(r)}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between",
                                                region === r
                                                    ? `bg-${themeColor}/20 text-${themeColor} border border-${themeColor}/50`
                                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                                            )}
                                        >
                                            {r}
                                            {region === r && <div className={`w-2 h-2 rounded-full bg-${themeColor}`} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 opacity-75">
                            <div>
                                <p className="font-medium text-white">Devise</p>
                                <p className="text-sm text-slate-500">{(region.includes('Cameroun') || region.includes('Afrique')) ? 'XAF (F CFA)' : 'EUR (€)'}</p>
                            </div>
                            <span className="text-xs text-slate-600">Auto-detect</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <Smartphone className="text-emerald-500" />
                        Fonctionnalités
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Smartphone size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-white">Mobile Money</p>
                                    <p className="text-xs text-slate-500">Disponible pour les règlements rapides.</p>
                                </div>
                            </div>
                            <div className={cn("w-12 h-6 rounded-full relative transition-colors p-1 flex", mobileMoney ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start")}>
                                <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-white">Mode Hors-ligne</p>
                                    <p className="text-xs text-slate-500">Accès aux données sans connexion.</p>
                                </div>
                            </div>
                            <div className={cn("w-12 h-6 rounded-full relative transition-colors p-1 flex", offlineMode ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start")}>
                                <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button className={cn("flex items-center gap-2 px-8 py-4 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95", `bg-${themeColor} text-white`)}>
                    <Save size={20} />
                    Enregistrer les modifications
                </button>
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
