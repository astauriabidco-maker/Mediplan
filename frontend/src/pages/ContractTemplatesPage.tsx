import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Save, Trash2, Edit3, X, Eye, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { useAppConfig } from '../store/useAppConfig';
import { clsx } from 'clsx';

export const ContractTemplatesPage = () => {
    const { themeColor } = useAppConfig();
    const queryClient = useQueryClient();
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const { data: templates, isLoading } = useQuery({
        queryKey: ['contract-templates'],
        queryFn: async () => (await api.get('/api/documents/templates')).data
    });

    const saveMutation = useMutation({
        mutationFn: async (template: any) => {
            if (template.id) {
                return api.put(`/api/documents/templates/${template.id}`, template);
            }
            return api.post('/api/documents/templates', template);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
            setEditingTemplate(null);
        }
    });

    if (isLoading) return <div className="p-8 text-white">Chargement des modèles...</div>;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
                        <FileText className="text-blue-500" size={32} /> Gabarits de Contrats
                    </h1>
                    <p className="text-slate-400 mt-2">Gérez vos modèles de contrats de travail (OHADA/Cameroun).</p>
                </div>
                {!editingTemplate && (
                    <button
                        onClick={() => setEditingTemplate({ title: '', type: 'CDI', content: '<h2>Contrat de Travail</h2><p>Variables disponibles: {{nom}}, {{prenom}}, {{matricule}}, {{service}}, {{poste}}, {{salaire_base}}</p>' })}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={20} /> Nouveau Modèle
                    </button>
                )}
            </div>

            {editingTemplate ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                        <div className="flex gap-4 items-center">
                            <input
                                value={editingTemplate.title}
                                onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                                placeholder="Nom du gabarit (ex: CDI Infirmier)"
                                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500 w-64"
                            />
                            <select
                                value={editingTemplate.type}
                                onChange={e => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none"
                            >
                                <option value="CDI">CDI</option>
                                <option value="CDD">CDD</option>
                                <option value="Stage">Stage</option>
                                <option value="Vacation">Vacation</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsPreviewing(!isPreviewing)}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl"
                            >
                                {isPreviewing ? <Edit3 size={18} /> : <Eye size={18} />}
                                {isPreviewing ? 'Éditer' : 'Prévisualiser'}
                            </button>
                            <button
                                onClick={() => saveMutation.mutate(editingTemplate)}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold"
                            >
                                <Save size={18} /> Enregistrer
                            </button>
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="p-2 text-slate-500 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 h-[600px]">
                        <div className={clsx("lg:col-span-3 p-0 bg-white text-black", isPreviewing ? "overflow-auto" : "")}>
                            {isPreviewing ? (
                                <div className="p-12 prose max-w-none" dangerouslySetInnerHTML={{ __html: editingTemplate.content }} />
                            ) : (
                                <textarea
                                    value={editingTemplate.content}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                                    className="w-full h-full p-8 font-mono text-sm outline-none bg-slate-950 text-emerald-500"
                                    placeholder="Écrivez votre contrat en HTML ici..."
                                />
                            )}
                        </div>
                        <div className="bg-slate-900 border-l border-slate-800 p-6 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={14} className="text-blue-500" /> Variables d'Aide
                            </h3>
                            <div className="space-y-2">
                                {['nom', 'prenom', 'matricule', 'service', 'poste', 'salaire_base', 'date_embauche'].map(v => (
                                    <div 
                                        key={v} 
                                        className="p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 cursor-pointer hover:bg-slate-700 transition-all"
                                        onClick={() => setEditingTemplate({ ...editingTemplate, content: editingTemplate.content + ` {{${v}}}` })}
                                    >
                                        {'{{' + v + '}}'}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-12 italic">
                                Le moteur de MediPlan injectera automatiquement les valeurs réelles de l'agent lors de la génération.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates?.map((t: any) => (
                        <div 
                            key={t.id} 
                            className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500 transition-all group cursor-pointer"
                            onClick={() => setEditingTemplate(t)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                    <FileText size={24} />
                                </div>
                                <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                                    {t.type}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{t.title}</h3>
                            <p className="text-slate-500 text-sm line-clamp-2 italic">
                                Modèle utilisé pour les contrats de type {t.type}.
                            </p>
                            <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-slate-600">Dernière modif: {new Date(t.updatedAt).toLocaleDateString()}</span>
                                <div className="flex gap-2">
                                    <button className="p-2 text-slate-500 hover:text-white"><Edit3 size={18} /></button>
                                    <button className="p-2 text-slate-500 hover:text-rose-500"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {templates?.length === 0 && (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500 italic">Aucun modèle de contrat défini pour le moment.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
