import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoles, createRole, updateRole, deleteRole, seedRoles, Role } from '../api/roles.api';
import { useAppConfig } from '../store/useAppConfig';
import { Shield, Plus, Pencil, Trash2, CheckCircle2, XCircle, Info, Save, X, Loader2, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const AVAILABLE_PERMISSIONS = [
    { id: 'agents:read', label: 'Voir les dossiers agents', category: 'Personnel' },
    { id: 'agents:write', label: 'Modifier les dossiers agents', category: 'Personnel' },
    { id: 'services:manage_staff', label: 'Gérer le personnel du service', category: 'Personnel' },
    { id: 'services:read', label: 'Voir les services hospitaliers', category: 'Services' },
    { id: 'services:write', label: 'Gérer la structure des services', category: 'Services' },
    { id: 'planning:read', label: 'Voir les plannings', category: 'Planning' },
    { id: 'planning:manage', label: 'Gérer les gardes et rotations', category: 'Planning' },
    { id: 'competencies:read', label: 'Voir les compétences agents', category: 'Compétences' },
    { id: 'competencies:write', label: 'Gérer le catalogue de compétences', category: 'Compétences' },
    { id: 'leaves:request', label: 'Faire des demandes de congés', category: 'Absences' },
    { id: 'leaves:validate', label: 'Valider les congés du service', category: 'Absences' },
    { id: 'settings:all', label: 'Configuration complète du système', category: 'Administration' },
    { id: '*', label: 'Accès Total (Super Admin)', category: 'Administration' },
];

export const RolesManagement = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    });

    const createMutation = useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsModalOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Role> }) => updateRole(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setEditingRole(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] })
    });

    const seedMutation = useMutation({
        mutationFn: seedRoles,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] })
    });

    if (isLoading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-slate-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10", `text-${themeColor}`)}>
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-tight italic">Rôles & Permissions</h2>
                        <p className="text-slate-500 text-sm">Définissez les accès personnalisés pour vos collaborateurs.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {roles.length === 0 && (
                        <button
                            onClick={() => seedMutation.mutate()}
                            className="px-6 py-2.5 rounded-xl font-bold text-slate-400 border border-slate-800 hover:bg-white/5 transition-all text-sm flex items-center gap-2"
                        >
                            <Sparkles size={18} />
                            Initialiser les rôles par défaut
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingRole(null);
                            setIsModalOpen(true);
                        }}
                        className={cn("px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 text-sm flex items-center gap-2", `bg-${themeColor}`)}
                    >
                        <Plus size={18} />
                        Nouveau Rôle
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(roles) && roles.map((role) => (
                    <div key={role.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group relative overflow-hidden">
                        {role.isSystem && (
                            <div className="absolute top-0 right-0 p-2 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-bl-xl uppercase tracking-widest border-l border-b border-blue-500/20">
                                Système
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">{role.name}</h3>
                                <p className="text-xs text-slate-500">{role.description || 'Aucune description'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {role.permissions?.map((p) => {
                                    const perm = AVAILABLE_PERMISSIONS.find(ap => ap.id === p);
                                    return (
                                        <span key={p} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                                            {perm?.label || p}
                                        </span>
                                    );
                                })}
                                {role.permissions?.length === 0 && <span className="text-xs italic text-slate-600">Aucune permission définie</span>}
                            </div>

                            <div className="pt-4 border-t border-white/5 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setEditingRole(role)}
                                    className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                                >
                                    <Pencil size={18} />
                                </button>
                                {!role.isSystem && (
                                    <button
                                        onClick={() => { if (confirm('Supprimer ce rôle ?')) deleteMutation.mutate(role.id) }}
                                        className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {(isModalOpen || editingRole) && (
                <RoleModal
                    role={editingRole}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingRole(null);
                    }}
                    onSubmit={(data) => {
                        if (editingRole) {
                            updateMutation.mutate({ id: editingRole.id, data });
                        } else {
                            createMutation.mutate(data);
                        }
                    }}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            )}
        </div>
    );
};

const RoleModal = ({ role, onClose, onSubmit, isLoading }: { role: Role | null, onClose: () => void, onSubmit: (data: any) => void, isLoading: boolean }) => {
    const { themeColor } = useAppConfig();
    const [name, setName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions || []);

    const togglePermission = (id: string) => {
        if (selectedPermissions.includes(id)) {
            setSelectedPermissions(selectedPermissions.filter(p => p !== id));
        } else {
            setSelectedPermissions([...selectedPermissions, id]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ name, description, permissions: selectedPermissions });
    };

    const categories = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Shield className={`text-${themeColor}`} size={20} />
                            {role ? 'Modifier le rôle' : 'Nouveau Rôle'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Configurez les droits d'accès pour ce groupe.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nom du rôle</label>
                            <input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                placeholder="ex: Superviseur de nuit"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                placeholder="À quoi sert ce rôle ?"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} className="text-blue-500" />
                            Permissions Granulaires
                        </h3>

                        <div className="space-y-8">
                            {categories.map(cat => (
                                <div key={cat} className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] border-l-2 border-slate-800 pl-4">{cat}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {AVAILABLE_PERMISSIONS.filter(ap => ap.category === cat).map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => togglePermission(p.id)}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                                    selectedPermissions.includes(p.id)
                                                        ? `border-${themeColor}/30 bg-${themeColor}/5 text-white`
                                                        : "border-slate-800 bg-white/2 hover:border-slate-700 text-slate-400"
                                                )}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold">{p.label}</span>
                                                    <span className="text-[9px] opacity-50 font-mono italic">{p.id}</span>
                                                </div>
                                                {selectedPermissions.includes(p.id) ? (
                                                    <CheckCircle2 className={`text-${themeColor}`} size={20} />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-slate-800 group-hover:border-slate-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex gap-4">
                    <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-mono text-xs tracking-widest uppercase">
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !name}
                        className={cn("flex-[2] px-6 py-4 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 font-mono text-xs tracking-widest uppercase",
                            `bg-${themeColor} hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`)}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Enregistrer le rôle</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
