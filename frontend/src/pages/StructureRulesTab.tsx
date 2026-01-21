import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Building2, User, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi, Grade } from '../api/grades.api';
import { workPoliciesApi, WorkPolicy } from '../api/work-policies.api';
import { hospitalServicesApi } from '../api/hospital-services.api';
import { useAppConfig } from '../store/useAppConfig';

// Helper for classes 
// (If not available globally, defining here for self-containment)
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const StructureRulesTab = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState<'grades' | 'rules'>('grades');

    // --- State for Grades ---
    const [isAddingGrade, setIsAddingGrade] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

    // --- State for Rules ---
    const [isAddingRule, setIsAddingRule] = useState(false);
    const [editingRule, setEditingRule] = useState<WorkPolicy | null>(null);

    // --- Query Data ---
    const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: gradesApi.getAll });
    const { data: policies = [] } = useQuery({ queryKey: ['work-policies'], queryFn: workPoliciesApi.getAll });
    const { data: services = [] } = useQuery({ queryKey: ['hospital-services'], queryFn: hospitalServicesApi.getAll });

    // --- Mutations Grades ---
    const createGrade = useMutation({
        mutationFn: gradesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grades'] });
            setIsAddingGrade(false);
        }
    });

    const updateGrade = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Grade> }) => gradesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grades'] });
            setEditingGrade(null);
        }
    });

    const deleteGrade = useMutation({
        mutationFn: gradesApi.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grades'] })
    });

    // --- Mutations Rules ---
    const createPolicy = useMutation({
        mutationFn: workPoliciesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-policies'] });
            setIsAddingRule(false);
        }
    });

    const updatePolicy = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<WorkPolicy> }) => workPoliciesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-policies'] });
            setEditingRule(null);
        }
    });

    const deletePolicy = useMutation({
        mutationFn: workPoliciesApi.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-policies'] })
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <ShieldCheck className={cn(`text-${themeColor}`)} />
                    Structure & Règles de Travail
                </h2>
                <p className="text-slate-400">Définissez les grades et les contraintes de planning associées (Héritage Dynamique).</p>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
                <button
                    onClick={() => setActiveSection('grades')}
                    className={cn(
                        "px-4 py-2 font-medium text-sm rounded-lg transition-all",
                        activeSection === 'grades' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    Gestion des Grades
                </button>
                <button
                    onClick={() => setActiveSection('rules')}
                    className={cn(
                        "px-4 py-2 font-medium text-sm rounded-lg transition-all",
                        activeSection === 'rules' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                    )}
                >
                    Matrice de Règles
                </button>
            </div>

            {/* GRADES SECTION */}
            {activeSection === 'grades' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Liste des Grades</h3>
                            <button
                                onClick={() => setIsAddingGrade(true)}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-2", `bg-${themeColor}`)}
                            >
                                <Plus size={14} /> Ajouter
                            </button>
                        </div>

                        {isAddingGrade && (
                            <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    createGrade.mutate({
                                        name: formData.get('name') as string,
                                        code: formData.get('code') as string,
                                        level: Number(formData.get('level')),
                                    });
                                }} className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Nom</label>
                                        <input name="name" placeholder="ex: Interne" required className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Code</label>
                                        <input name="code" placeholder="INT" required className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Niveau</label>
                                        <input name="level" type="number" defaultValue="1" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                    </div>
                                    <button type="submit" className="px-3 py-2 bg-emerald-600 rounded-lg text-white"><Save size={16} /></button>
                                    <button type="button" onClick={() => setIsAddingGrade(false)} className="px-3 py-2 bg-slate-700 rounded-lg text-slate-300"><X size={16} /></button>
                                </form>
                            </div>
                        )}

                        <div className="space-y-2">
                            {Array.isArray(grades) ? grades.map(grade => (
                                <div key={grade.id} className="flex items-center justify-between p-3 bg-slate-800/20 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                                            {grade.code}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{grade.name}</p>
                                            <p className="text-[10px] text-slate-500">Niveau {grade.level}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteGrade.mutate(grade.id)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )) : <div className="text-red-500">Erreur de chargement des grades</div>}
                            {Array.isArray(grades) && grades.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Aucun grade défini</p>}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
                        <ShieldCheck size={48} className="text-slate-700 mb-4" />
                        <h4 className="text-white font-bold mb-2">Structure Hiérarchique</h4>
                        <p className="text-slate-500 text-sm max-w-sm">
                            Les grades servent de base pour l'application des règles de travail. Le "Niveau" peut être utilisé pour trier ou prioriser les agents.
                        </p>
                    </div>
                </div>
            )}

            {/* RULES SECTION */}
            {activeSection === 'rules' && (
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white">Exceptions & Politiques</h3>
                                <p className="text-slate-400 text-xs">Ordre d'application : Service+Grade &gt; Grade &gt; Service &gt; Défaut</p>
                            </div>
                            <button
                                onClick={() => setIsAddingRule(true)}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-2", `bg-${themeColor}`)}
                            >
                                <Plus size={14} /> Nouvelle Règle
                            </button>
                        </div>

                        {isAddingRule && (
                            <div className="mb-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Créer une exception</h4>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const gradeId = formData.get('gradeId') ? Number(formData.get('gradeId')) : null;
                                    const serviceId = formData.get('serviceId') ? Number(formData.get('serviceId')) : null;

                                    createPolicy.mutate({
                                        gradeId,
                                        hospitalServiceId: serviceId,
                                        restHoursAfterGuard: Number(formData.get('restHours')),
                                        maxGuardDuration: Number(formData.get('maxGuard')),
                                    });
                                }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Service (Optionnel)</label>
                                        <select name="serviceId" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                            <option value="">-- Tous les services --</option>
                                            {Array.isArray(services) && services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Grade (Optionnel)</label>
                                        <select name="gradeId" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                            <option value="">-- Tous les grades --</option>
                                            {Array.isArray(grades) && grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Repos post-garde (h)</label>
                                        <input name="restHours" type="number" defaultValue="24" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Max Garde (h)</label>
                                        <input name="maxGuard" type="number" defaultValue="24" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                                    </div>

                                    <div className="col-span-full flex justify-end gap-2 mt-2">
                                        <button type="button" onClick={() => setIsAddingRule(false)} className="px-4 py-2 bg-slate-700 rounded-lg text-slate-300 font-bold text-xs">Annuler</button>
                                        <button type="submit" className="px-4 py-2 bg-emerald-600 rounded-lg text-white font-bold text-xs">Enregistrer la règle</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4">Priorité / Contexte</th>
                                        <th className="p-4">Repos </th>
                                        <th className="p-4">Max Garde</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {/* Default Rule Row display */}
                                    <tr className="border-b border-white/5 bg-slate-800/30">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-300 font-bold">Règle par Défaut</span>
                                                <span className="text-[10px] text-slate-500">Code du Travail / Global</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-400">24h</td>
                                        <td className="p-4 text-slate-400">24h</td>
                                        <td className="p-4 text-right"><span className="text-[10px] text-slate-600 italic">Non modifiable</span></td>
                                    </tr>

                                    {/* Dynamic Policies */}
                                    {Array.isArray(policies) ? policies.map(policy => {
                                        let label = "Défini";
                                        let subLabel = "";
                                        let icon = <AlertTriangle size={14} className="text-amber-500" />;

                                        if (policy.hospitalServiceId && policy.gradeId) {
                                            label = `${policy.grade?.name} @ ${policy.hospitalService?.name}`;
                                            subLabel = "Priorité 1 (Spécifique)";
                                            icon = <ShieldCheck size={14} className="text-emerald-500" />;
                                        } else if (policy.gradeId) {
                                            label = `Tous les ${policy.grade?.name}s`;
                                            subLabel = "Priorité 2 (Grade)";
                                            icon = <User size={14} className="text-blue-500" />;
                                        } else if (policy.hospitalServiceId) {
                                            label = `Service ${policy.hospitalService?.name}`;
                                            subLabel = "Priorité 3 (Service)";
                                            icon = <Building2 size={14} className="text-purple-500" />;
                                        }

                                        return (
                                            <tr key={policy.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold">{label}</span>
                                                            <span className="text-[10px] text-slate-500">{subLabel}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-slate-300">{policy.restHoursAfterGuard}h</td>
                                                <td className="p-4 font-mono text-slate-300">{policy.maxGuardDuration}h</td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => deletePolicy.mutate(policy.id)}
                                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }) : <tr><td colSpan={4} className="text-red-500 text-center p-4">Erreur: Les règles n'ont pas pu être chargées</td></tr>}
                                </tbody>
                            </table>
                            {Array.isArray(policies) && policies.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Aucune règle d'exception définie (Le défaut s'applique)</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
