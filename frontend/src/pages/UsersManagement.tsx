import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgents, inviteUser, updateAgent, Agent } from '../api/agents.api';
import { fetchRoles, Role } from '../api/roles.api';
import { Plus, Search, Shield, UserPlus, Mail, Loader2, MoreVertical, Ban, ShieldCheck, X } from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { fetchHospitalServices, HospitalService } from '../api/hospital-services.api';
import { Pencil } from 'lucide-react';

export const UsersManagement = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Agent | null>(null);
    const [activeMenu, setActiveMenu] = useState<number | null>(null);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['agents'],
        queryFn: fetchAgents,
    });

    const { data: services = [] } = useQuery({
        queryKey: ['hospital-services'],
        queryFn: fetchHospitalServices,
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Agent> }) => updateAgent(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            setActiveMenu(null);
            setEditingUser(null);
        }
    });

    const filteredUsers = users.filter(u =>
        u.nom.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un utilisateur..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 outline-none focus:border-slate-700 transition-colors"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95",
                        `bg-${themeColor}`
                    )}
                >
                    <UserPlus size={18} />
                    Inviter un collaborateur
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[400px]">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/50">
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Utilisateur</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Service / Titre</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rôle</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-slate-600" /></td></tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                            user.status === 'INVITED' ? "bg-slate-800 text-slate-400" :
                                                user.status === 'DISABLED' ? "bg-red-500/20 text-red-500" : `bg-${themeColor} text-white`)}>
                                            {user.nom.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-200">{user.nom}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-300">
                                            {user.hospitalService?.name || 'Non assigné'}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {user.jobTitle || 'Sans titre'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                        <Shield size={14} className={(user.dbRole?.name || user.role) === 'ADMIN' ? 'text-amber-500' : 'text-blue-500'} />
                                        {user.dbRole?.name || user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                        user.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                            user.status === 'INVITED' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    )}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right relative">
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                                        className="p-2 text-slate-600 hover:text-white transition-colors"
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {activeMenu === user.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                                            <div className="absolute right-4 top-12 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100 overflow-hidden text-left">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setActiveMenu(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                                                >
                                                    <Pencil size={14} className="text-blue-500" />
                                                    Modifier les informations
                                                </button>

                                                <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-900 mt-2 pt-2 mb-1">
                                                    Modifier le rôle
                                                </p>
                                                {Array.isArray(roles) && roles.map((r) => (
                                                    <button
                                                        key={r.id}
                                                        disabled={user.roleId === r.id}
                                                        onClick={() => updateMutation.mutate({ id: user.id, data: { roleId: r.id } })}
                                                        className={cn(
                                                            "w-full px-4 py-2 text-left text-xs font-bold transition-colors",
                                                            user.roleId === r.id ? "text-blue-400 bg-blue-500/5" : "text-slate-300 hover:bg-white/5 hover:text-white"
                                                        )}
                                                    >
                                                        {r.name}
                                                    </button>
                                                ))}
                                                <div className="border-t border-slate-900 mt-2 pt-2">
                                                    <button
                                                        onClick={() => updateMutation.mutate({ id: user.id, data: { status: user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED' } })}
                                                        className={cn(
                                                            "w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2",
                                                            user.status === 'DISABLED' ? "text-emerald-500 hover:bg-emerald-500/5" : "text-rose-500 hover:bg-rose-500/5"
                                                        )}
                                                    >
                                                        {user.status === 'DISABLED' ? <ShieldCheck size={14} /> : <Ban size={14} />}
                                                        {user.status === 'DISABLED' ? 'Réactiver' : 'Désactiver'}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <InviteModal
                    roles={roles}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['agents'] });
                        setIsModalOpen(false);
                    }}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    services={services}
                    onClose={() => setEditingUser(null)}
                    onSubmit={(data) => updateMutation.mutate({ id: editingUser.id!, data })}
                    isLoading={updateMutation.isPending}
                />
            )}
        </div>
    );
};

const InviteModal = ({ roles, onClose, onSuccess }: { roles: Role[], onClose: () => void, onSuccess: () => void }) => {
    const { themeColor } = useAppConfig();
    const [email, setEmail] = useState('');
    const [roleId, setRoleId] = useState<number | string>(roles[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleId) return setError('Veuillez choisir un rôle');

        setLoading(true);
        setError('');
        try {
            await inviteUser({ email, roleId: Number(roleId) });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erreur lors de l\'invitation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Mail className="text-blue-500" size={20} />
                        Inviter un collaborateur
                    </h2>
                </div>
                <form onSubmit={handleInvite} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Adresse Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                            placeholder="collaborateur@hopital.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Rôle assigné</label>
                        <select
                            required
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-sm"
                        >
                            <option value="">-- Choisir un rôle --</option>
                            {Array.isArray(roles) && roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name} {r.isSystem ? '(Système)' : ''}</option>
                            ))}
                        </select>
                        {roles.length === 0 && (
                            <p className="text-[10px] text-amber-500 italic mt-1">
                                Attention: Aucun rôle n'est défini. Allez dans "Rôles & Permissions" pour les créer.
                            </p>
                        )}
                    </div>

                    {error && <p className="text-rose-500 text-xs px-1">{error}</p>}

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || roles.length === 0}
                            className={cn("flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all text-sm flex items-center justify-center gap-2", `bg-${themeColor}`)}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Envoyer l\'invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
const EditUserModal = ({ user, services, onClose, onSubmit, isLoading }: { user: Agent, services: HospitalService[], onClose: () => void, onSubmit: (data: Partial<Agent>) => void, isLoading: boolean }) => {
    const { themeColor } = useAppConfig();
    const [activeTab, setActiveTab] = useState<'general' | 'identity' | 'address' | 'contract' | 'financial'>('general');
    const [formData, setFormData] = useState({
        // Général
        nom: user.nom,
        email: user.email,
        telephone: user.telephone || '',
        jobTitle: user.jobTitle || '',
        hospitalServiceId: user.hospitalServiceId || '',
        matricule: user.matricule || '',

        // État Civil
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        birthName: user.birthName || '',
        gender: user.gender || '',
        dateOfBirth: user.dateOfBirth || '',
        placeOfBirth: user.placeOfBirth || '',
        nationality: user.nationality || '',
        nir: user.nir || '',
        maritalStatus: user.maritalStatus || '',
        childrenCount: user.childrenCount || 0,

        // Coordonnées
        street: user.street || '',
        zipCode: user.zipCode || '',
        city: user.city || '',
        personalEmail: user.personalEmail || '',

        // Contrat
        contractType: user.contractType || '',
        hiringDate: user.hiringDate || '',
        contractEndDate: user.contractEndDate || '',
        workTimePercentage: user.workTimePercentage || 100,
        grade: user.grade || '',
        step: user.step || '',
        index: user.index || '',

        // Banque / Divers
        iban: user.iban || '',
        bic: user.bic || '',
        mainDiploma: user.mainDiploma || '',
        diplomaYear: user.diplomaYear || '',
        emergencyContactName: user.emergencyContactName || '',
        emergencyContactPhone: user.emergencyContactPhone || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            hospitalServiceId: formData.hospitalServiceId ? Number(formData.hospitalServiceId) : undefined,
            childrenCount: Number(formData.childrenCount),
            workTimePercentage: Number(formData.workTimePercentage)
        });
    };

    const tabs = [
        { id: 'general', label: 'Général', icon: UserPlus },
        { id: 'identity', label: 'État Civil', icon: Shield },
        { id: 'address', label: 'Coordonnées', icon: Search },
        { id: 'contract', label: 'Contrat', icon: ShieldCheck },
        { id: 'financial', label: 'Banque & Formation', icon: MoreVertical },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Pencil className="text-blue-500" size={20} />
                            Fiche Identification Agent
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">{user.nom} — {user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2",
                                activeTab === tab.id
                                    ? `text-${themeColor} border-${themeColor} bg-${themeColor}/5`
                                    : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nom d'affichage</label>
                                <input value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matricule RH</label>
                                <input value={formData.matricule} onChange={(e) => setFormData({ ...formData, matricule: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Poste / Titre</label>
                                <input value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service Affecté</label>
                                <select value={formData.hospitalServiceId} onChange={(e) => setFormData({ ...formData, hospitalServiceId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors">
                                    <option value="">-- Non assigné --</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Téléphone Pro</label>
                                <input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Pro</label>
                                <input disabled value={formData.email} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed outline-none" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'identity' && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prénom</label>
                                <input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nom de famille</label>
                                <input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nom de naissance</label>
                                <input value={formData.birthName} onChange={(e) => setFormData({ ...formData, birthName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Genre</label>
                                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors">
                                    <option value="">Non renseigné</option>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                    <option value="O">Autre</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date de naissance</label>
                                <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lieu de naissance</label>
                                <input value={formData.placeOfBirth} onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">N° Sécurité Sociale (NIR)</label>
                                <input placeholder="1 00 00 00 000 000" value={formData.nir} onChange={(e) => setFormData({ ...formData, nir: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sit. Familiale</label>
                                    <select value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors">
                                        <option value="">-- Choisir --</option>
                                        <option value="Célibataire">Célibataire</option>
                                        <option value="Marié">Marié</option>
                                        <option value="PACS">PACS</option>
                                        <option value="Divorcé">Divorcé</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enfants</label>
                                    <input type="number" value={formData.childrenCount} onChange={(e) => setFormData({ ...formData, childrenCount: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'address' && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rue / Adresse complète</label>
                                <input value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Code Postal</label>
                                <input value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ville</label>
                                <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Personnel</label>
                                <input type="email" value={formData.personalEmail} onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'contract' && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type de contrat</label>
                                <select value={formData.contractType} onChange={(e) => setFormData({ ...formData, contractType: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors">
                                    <option value="">-- Choisir --</option>
                                    <option value="CDI">CDI</option>
                                    <option value="CDD">CDD</option>
                                    <option value="Vacation">Vacation</option>
                                    <option value="Titulaire">Titulaire (FP)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quotité (temps de travail %)</label>
                                <input type="number" value={formData.workTimePercentage} onChange={(e) => setFormData({ ...formData, workTimePercentage: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date d'entrée</label>
                                <input type="date" value={formData.hiringDate} onChange={(e) => setFormData({ ...formData, hiringDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date de fin (CDD/Vacation)</label>
                                <input type="date" value={formData.contractEndDate} onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grade / Catégorie</label>
                                <input value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Échelon</label>
                                    <input value={formData.step} onChange={(e) => setFormData({ ...formData, step: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Indice</label>
                                    <input value={formData.index} onChange={(e) => setFormData({ ...formData, index: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IBAN</label>
                                <input placeholder="FR76 0000 0000 0000..." value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BIC / SWIFT</label>
                                <input value={formData.bic} onChange={(e) => setFormData({ ...formData, bic: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="border-t border-slate-800 col-span-2 mt-4 pt-4" />
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diplôme Principal</label>
                                <input value={formData.mainDiploma} onChange={(e) => setFormData({ ...formData, mainDiploma: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Année Obtention</label>
                                <input maxLength={4} value={formData.diplomaYear} onChange={(e) => setFormData({ ...formData, diplomaYear: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact Urgence (Nom)</label>
                                <input value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tél. Urgence</label>
                                <input value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                        </div>
                    )}
                </form>

                <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex gap-3">
                    <button type="button" onClick={onClose} className="px-8 py-3 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm">
                        Fermer
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn("flex-1 px-8 py-3 rounded-xl font-bold text-white transition-all text-sm flex items-center justify-center gap-2 shadow-lg", `bg-${themeColor}`)}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Enregistrer toutes les modifications'}
                    </button>
                </div>
            </div>
        </div>
    );
};
