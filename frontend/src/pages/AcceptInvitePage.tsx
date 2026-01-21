import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios'; // Use our axios instance
import { Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export const AcceptInvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Jeton d\'invitation manquant ou invalide.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/auth/accept-invite', {
                token,
                password,
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Une erreur est survenue lors de l\'activation du compte.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 px-4">
                <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 shadow-2xl text-center">
                    <div className="mx-auto h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                        <CheckCircle className="text-white h-10 w-10" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-white">Compte Activé !</h2>
                    <p className="mt-2 text-emerald-100">
                        Votre mot de passe a été défini avec succès. Vous allez être redirigé vers la page de connexion.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-6 text-emerald-300 hover:text-white transition-colors"
                    >
                        Cliquer ici si vous n'êtes pas redirigé
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4">
            <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <Lock className="text-white h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-white">Bienvenue sur Mediplan</h2>
                    <p className="mt-2 text-sm text-blue-200">
                        Veuillez définir votre mot de passe pour activer votre compte.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-xs font-semibold text-blue-300 mb-1 ml-1 block">Nouveau mot de passe</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-3 border border-white/10 placeholder-blue-300 text-white bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="relative">
                            <label className="text-xs font-semibold text-blue-300 mb-1 ml-1 block">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-3 border border-white/10 placeholder-blue-300 text-white bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 py-3 px-4 rounded-lg border border-red-400/20">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !token}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Activer mon compte'}
                    </button>
                </form>
            </div>
        </div>
    );
};
