import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs, AuditLog } from '../api/audit.api'
import {
    Clock,
    User,
    ChevronRight,
    Search,
    ArrowDownToLine,
    CheckCircle2,
    XCircle,
    RotateCw,
    PlusCircle,
    ExternalLink
} from 'lucide-react'

const ActionBadge = ({ action }: { action: AuditLog['action'] }) => {
    switch (action) {
        case 'CREATE':
            return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1"><PlusCircle size={10} /> Création</span>
        case 'VALIDATE':
            return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1"><CheckCircle2 size={10} /> Validation</span>
        case 'REJECT':
            return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1"><XCircle size={10} /> Rejet</span>
        case 'AUTO_GENERATE':
            return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1"><RotateCw size={10} /> Auto-Génération</span>
        default:
            return <span className="bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter">{action}</span>
    }
}

const stringifyDetails = (details: AuditLog['details']) => {
    try {
        return JSON.stringify(details ?? {})
    } catch {
        return String(details ?? '')
    }
}

const csvValue = (value: string | number | undefined) => {
    const text = String(value ?? '')
    return `"${text.replaceAll('"', '""')}"`
}

const exportLogsCsv = (logs: AuditLog[]) => {
    const rows = [
        ['timestamp', 'acteur', 'fonction', 'action', 'cible', 'details'],
        ...logs.map((log) => [
            log.timestamp,
            `${log.actor?.nom ?? ''} ${log.actor?.prenom ?? ''}`.trim() || 'Systeme',
            log.actor?.jobTitle || 'Systeme',
            log.action,
            `${log.entityType} #${log.entityId}`,
            stringifyDetails(log.details),
        ]),
    ]
    const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-mediplan-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
}

export const AuditLogPage = () => {
    const { data: logs, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: fetchAuditLogs,
        refetchInterval: 60000,
    })

    const [searchTerm, setSearchTerm] = React.useState('')

    const filteredLogs = logs?.filter(log => {
        const searchStr = `${log.actor?.nom} ${log.actor?.prenom} ${log.actor?.jobTitle} ${log.action} ${log.entityType} ${log.entityId} ${stringifyDetails(log.details)}`.toLowerCase()
        return searchStr.includes(searchTerm.toLowerCase())
    }) || []

    const hasLogs = Boolean(logs?.length)

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Clock className="text-blue-500" />
                        Journal audit
                    </h2>
                    <p className="text-sm text-slate-400 font-medium">Preuves métier manager, RH et planning sans accès SQL.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Link to="/manager/cockpit" className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white">
                            <ExternalLink size={12} /> Cockpit manager
                        </Link>
                        <Link to="/planning/prepublication" className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-white">
                            <ExternalLink size={12} /> Rapports publication
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher un acteur, une action..."
                            aria-label="Rechercher dans le journal audit"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/20">
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Date & Heure</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Acteur</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Action</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cible</th>
                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="py-8 px-6">
                                            <div className="h-4 bg-slate-800 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500 italic font-medium">
                                        {hasLogs
                                            ? 'Aucune preuve audit ne correspond à cette recherche.'
                                            : 'Aucune preuve audit disponible pour le moment.'}
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => (
                                <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 px-6 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white uppercase tracking-tight">
                                                {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500 tracking-wider">
                                                {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                                                <User size={14} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-white leading-none mb-1">
                                                    {log.actor?.nom} {log.actor?.prenom}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-1.5 py-0.5 rounded w-fit italic">
                                                    {log.actor?.jobTitle || 'Système'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <ActionBadge action={log.action} />
                                    </td>
                                    <td className="py-4 px-6 uppercase tracking-wider">
                                        <span className="text-[11px] font-black text-slate-300">
                                            {log.entityType} #{log.entityId}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2 group/details">
                                            <pre className="text-[10px] text-slate-400 truncate max-w-[200px] font-mono bg-black/20 p-2 rounded border border-white/5 opacity-60 group-hover/details:opacity-100 transition-opacity">
                                                {stringifyDetails(log.details)}
                                            </pre>
                                            <button className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center justify-between py-2 text-slate-500 font-medium">
                <p className="text-[11px] font-bold uppercase tracking-widest">Affichage de {filteredLogs.length} preuve(s) audit</p>
                <div className="flex gap-2">
                    <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-700 transition-all disabled:cursor-wait disabled:opacity-60">
                        <RotateCw size={12} className={isFetching ? 'animate-spin' : undefined} /> Actualiser
                    </button>
                    <button
                        onClick={() => exportLogsCsv(filteredLogs)}
                        disabled={filteredLogs.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-slate-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ArrowDownToLine size={12} /> Exporter CSV
                    </button>
                </div>
            </div>
        </div>
    )
}
