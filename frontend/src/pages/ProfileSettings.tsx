import React, { useState } from 'react';
import { useAuth } from '../store/useAuth';
import axios from '../api/axios';
import { User, Shield, Lock, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppConfig } from '../store/useAppConfig';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const ProfileSettings = () => {
    const { user } = useAuth();
    const { themeColor } = useAppConfig();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass !== confirmPass) {
            setStatus({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
            return;
        }

        setLoading(true);
        setStatus(null);
        try {
            await axios.post('/api/auth/change-password', { oldPass, newPass });
            setStatus({ type: 'success', message: 'Mot de passe modifié avec succès.' });
            setOldPass('');
            setNewPass('');
            setConfirmPass('');
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Erreur lors du changement de mot de passe.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 self-start">
                <div className="flex items-center gap-4">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-blue-500/10", `bg-${themeColor}`)}>
                        {user?.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Mon Profil</h3>
                        <p className="text-slate-500 text-sm font-medium">{user?.role}</p>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email</label>
                        <p className="font-bold text-slate-200">{user?.email}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <Lock className="text-amber-500" />
                    Sécurité
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ancien mot de passe</label>
                        <input
                            type="password"
                            required
                            value={oldPass}
                            onChange={(e) => setOldPass(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nouveau mot de passe</label>
                        <input
                            type="password"
                            required
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Confirmer le nouveau mot de passe</label>
                        <input
                            type="password"
                            required
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>

                    {status && (
                        <div className={cn("p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-300",
                            status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            <p className="text-sm font-medium">{status.message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn("w-full py-4 rounded-xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-2 mt-4", `bg-${themeColor}`)}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Mettre à jour la sécurité
                    </button>
                </form>
            </div>
        </div>
    );
};
