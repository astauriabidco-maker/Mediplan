import React from 'react';
import { X, UserPlus, Check, Clock, Award, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReplacements, assignReplacement } from '../api/planning.api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ReplacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift: any;
    onSelectAgent?: (agent: any) => void;
    onSuccess?: () => void;
}

export const ReplacementModal: React.FC<ReplacementModalProps> = ({ isOpen, onClose, shift, onSelectAgent, onSuccess }) => {
    const queryClient = useQueryClient();
    const { data: agents = [], isLoading } = useQuery({
        queryKey: ['replacements', shift?.id, shift?.start, shift?.end],
        queryFn: () => fetchReplacements(shift.start.toISOString(), shift.end.toISOString()),
        enabled: !!shift && isOpen,
    });

    const mutation = useMutation({
        mutationFn: (agentId: number) => assignReplacement({
            agentId,
            start: shift.start.toISOString(),
            end: shift.end.toISOString(),
            postId: shift.postId || 'REPLACEMENT'
        }),
        onSuccess: () => {
            if (onSuccess) onSuccess();
            onClose();
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <UserPlus className="text-blue-500" /> Trouver un Remplaçant
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Disponibles pour le {new Date(shift.start).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="py-20 text-center text-slate-500">Recherche d'agents disponibles...</div>
                    ) : agents.length === 0 ? (
                        <div className="py-20 text-center text-slate-500 italic">Aucun remplaçant disponible trouvé.</div>
                    ) : (
                        agents.map((agent: any) => (
                            <div
                                key={agent.id}
                                className={cn(
                                    "group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between",
                                    mutation.isPending && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => !mutation.isPending && mutation.mutate(agent.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white border-2 border-slate-600">
                                        {agent.nom.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{agent.nom}</h3>
                                        <div className="flex gap-3 mt-1">
                                            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Award size={10} /> {agent.jobTitle || 'Personnel'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                                    {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl">
                    <p className="text-[10px] text-slate-500 text-center">
                        Seuls les agents qualifiés et respectant les temps de repos sont affichés.
                    </p>
                </div>
            </div>
        </div>
    );
};
