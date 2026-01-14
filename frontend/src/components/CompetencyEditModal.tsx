import React, { useState } from 'react';
import { X, Save, Loader2, Calendar, Star, AlertTriangle } from 'lucide-react';
import { updateAgentCompetency } from '../api/competencies.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CompetencyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: { id: number; nom: string };
    competency: { id: number; name: string };
    currentLevel?: number;
    currentExpiration?: string;
}

export const CompetencyEditModal: React.FC<CompetencyEditModalProps> = ({
    isOpen,
    onClose,
    agent,
    competency,
    currentLevel = 0,
    currentExpiration
}) => {
    const [level, setLevel] = useState(currentLevel);
    const [expiration, setExpiration] = useState(currentExpiration ? new Date(currentExpiration).toISOString().split('T')[0] : '');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => updateAgentCompetency(agent.id, competency.id, level, expiration),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['competencies-matrix'] });
            onClose();
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-white">{competency.name}</h2>
                        <p className="text-slate-400 text-sm mt-1">{agent.nom}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Star size={16} />
                            Niveau de compétence
                        </label>
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                            {[1, 2, 3, 4, 5].map((idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setLevel(idx)}
                                    className={`w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center font-bold ${level >= idx
                                            ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'border-slate-800 text-slate-600 hover:border-slate-700'
                                        }`}
                                >
                                    {idx}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <Calendar size={16} />
                            Date d'expiration
                        </label>
                        <input
                            type="date"
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                        />
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Laissez vide pour une compétence permanente.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending}
                            className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${mutation.isPending
                                    ? 'bg-slate-700 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                                }`}
                        >
                            {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
