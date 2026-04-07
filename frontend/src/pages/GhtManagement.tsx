import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGhts, createGht, toggleGhtStatus, Ght } from '../api/ght.api';
import { Plus, Building2, Globe, Mail, CheckCircle, XCircle } from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { useAuth } from '../store/useAuth';
import { useNavigate } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';

export const GhtManagement = () => {
    const { themeColor, regions } = useAppConfig();
    const { setImpersonatedTenantId, impersonatedTenantId } = useAuth();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [region, setRegion] = useState(regions[0] || 'Île-de-France');
    const [contactEmail, setContactEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const { data: ghts = [], refetch } = useQuery({
        queryKey: ['ghts'],
        queryFn: fetchGhts
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createGht({ name, region, contactEmail });
            setIsCreating(false);
            setName('');
            setContactEmail('');
            refetch();
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la création de l'établissement");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleGhtStatus(id);
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Annuaire des GHT</h2>
                        <p className="text-sm text-slate-400">Gouvernance multi-entités (Multi-Tenant).</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition"
                >
                    <Plus size={18} />
                    Nouvel Établissement
                </button>
            </div>

            {isCreating && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 animate-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-widest">Configuration du GHT</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom de l'Hôpital / GHT</label>
                                <input
                                    value={name} onChange={e => setName(e.target.value)} required
                                    placeholder="ex: CHU de Nantes"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-white text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Région Ségur (Pool)</label>
                                <select
                                    value={region} onChange={e => setRegion(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-white text-sm outline-none focus:border-blue-500"
                                >
                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email de Facturation / Notification</label>
                                <input
                                    type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-white text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 justify-end mt-4">
                            <button
                                type="button" onClick={() => setIsCreating(false)}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit" disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50"
                            >
                                {loading ? 'Création...' : 'Créer et Isoler (Tenant)'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ghts.map((ght: Ght) => (
                    <div key={ght.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative hover:border-slate-700 transition">
                        <div className="absolute top-4 right-4 cursor-pointer" onClick={() => handleToggle(ght.id)}>
                            {ght.isActive ? <div title="Actif"><CheckCircle className="text-emerald-500" size={20} /></div> : <div title="Suspendu"><XCircle className="text-rose-500" size={20} /></div>}
                        </div>
                        <h4 className="text-lg font-bold text-white uppercase mt-2">{ght.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mb-4 tracking-widest bg-slate-950 px-2 py-1 rounded w-fit mt-1">
                            Tenant: {ght.id}
                        </p>
                        
                        <div className="space-y-2 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <Globe size={14} className="text-blue-500" />
                                {ght.region}
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-blue-500" />
                                {ght.contactEmail || 'Non spécifié'}
                            </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={() => {
                                    setImpersonatedTenantId(ght.id);
                                    navigate('/planning'); // Navigate to dashboard as this tenant
                                }}
                                className={`w-full py-2 ${impersonatedTenantId === ght.id ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-700'} text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition`}
                            >
                                <PlayCircle size={14} />
                                {impersonatedTenantId === ght.id ? 'Session Active' : 'Gérer l\'Hôpital'}
                            </button>
                            {impersonatedTenantId === ght.id && (
                                <button
                                    onClick={() => setImpersonatedTenantId(null)}
                                    className="px-3 py-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition"
                                    title="Quitter la session"
                                >
                                    Fermer
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {ghts.length === 0 && (
                <div className="text-center p-8 border border-dashed border-slate-800 rounded-3xl text-slate-500">
                    <p>Aucun GHT enregistré. Créez un nouvel établissement pour isoler les données.</p>
                </div>
            )}
        </div>
    );
};
