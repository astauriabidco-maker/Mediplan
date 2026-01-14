import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { fetchAgents } from '../api/agents.api';
import { createLeave } from '../api/planning.api';

interface LeaveCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const LeaveCreationModal: React.FC<LeaveCreationModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [agents, setAgents] = useState<any[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        agentId: '',
        start: '',
        end: '',
        type: 'CONGE_ANNUEL',
        reason: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadAgents();
            // Reset form
            setFormData({
                agentId: '',
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
                type: 'CONGE_ANNUEL',
                reason: ''
            });
            setError(null);
        }
    }, [isOpen]);

    const loadAgents = async () => {
        setIsLoadingAgents(true);
        try {
            const data = await fetchAgents();
            setAgents(data);
        } catch (err) {
            console.error("Failed to fetch agents", err);
            setError("Impossible de charger la liste des agents.");
        } finally {
            setIsLoadingAgents(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (!formData.agentId) throw new Error("Veuillez sélectionner un agent.");

            // Basic validation
            if (new Date(formData.end) < new Date(formData.start)) {
                throw new Error("La date de fin doit être après la date de début.");
            }

            await createLeave({
                agentId: parseInt(formData.agentId),
                start: new Date(formData.start).toISOString(),
                end: new Date(formData.end).toISOString(), // Should ideally be set to end of day? Backend handles strict timestamp.
                // Let's ensure we cover full days for UI simplicity
                type: formData.type,
                reason: formData.reason
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Une erreur est survenue lors de la création.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-white">Signaler une Absence</h2>
                        <p className="text-slate-400 text-sm mt-1">Déclarez un congé ou une absence imprévue</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Agent Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <User size={16} />
                                Agent concerné
                            </label>
                            {isLoadingAgents ? (
                                <div className="animate-pulse h-12 bg-slate-800 rounded-xl" />
                            ) : (
                                <select
                                    required
                                    value={formData.agentId}
                                    onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                                >
                                    <option value="">Sélectionner un agent...</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.nom} {agent.firstName ? `(${agent.firstName})` : ''} - {agent.jobTitle || 'Sans poste'}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Calendar size={16} />
                                    Début
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.start}
                                    onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Calendar size={16} />
                                    Fin
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.end}
                                    onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Type & Reason */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <FileText size={16} />
                                Type d'absence
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="CONGE_ANNUEL">Congé Annuel</option>
                                <option value="MALADIE">Maladie</option>
                                <option value="RECUPERATION">Récupération</option>
                                <option value="ABSENCE_INJUSTIFIEE">Absence Injustifiée</option>
                                <option value="AUTRE">Autre</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Motif (Optionnel)</label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                                placeholder="Détails supplémentaires..."
                            />
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                Signaler l'absence
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
