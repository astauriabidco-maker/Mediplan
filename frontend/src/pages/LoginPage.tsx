import React, { useState } from 'react';
import { useAuth } from '../store/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const setAuth = useAuth((state) => state.setAuth);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/auth/login', {
                email,
                password,
            });

            const { access_token, user } = response.data;
            setAuth(access_token, user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Identifiants invalides');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4">
            <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 shadow-2xl">
                <div>
                    <div className="mx-auto h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <Lock className="text-white h-6 w-6" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Mediplan
                    </h2>
                    <p className="mt-2 text-center text-sm text-blue-200">
                        Connectez-vous à votre espace gestionnaire
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative">
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-blue-300" />
                            </div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-3 pl-10 border border-white/10 placeholder-blue-300 text-white bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                                placeholder="Email"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">Mot de passe</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-blue-300" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none relative block w-full px-3 py-3 pl-10 border border-white/10 placeholder-blue-300 text-white bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                                placeholder="Mot de passe"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Se connecter'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <Link
                        to="/demo"
                        className="text-sm font-semibold text-blue-200 transition-colors hover:text-white"
                    >
                        Demander une démo commerciale
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-center text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4">
                        Accès Rapides (Développement)
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { label: 'Administrateur', email: 'directeur@hgd-douala.cm' },
                            { label: 'Chef de Service', email: 'p.mbarga@hgd-douala.cm' },
                            { label: 'Médecin', email: 's.ondoa@hgd-douala.cm' },
                        ].map((profile) => (
                            <button
                                key={profile.email}
                                onClick={() => {
                                    setEmail(profile.email);
                                    setPassword('password123');
                                    // Trigger auto-submit in next tick to let state update
                                    setTimeout(() => {
                                        const form = document.querySelector('form');
                                        form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                    }, 100);
                                }}
                                className="w-full py-2 px-3 text-xs font-medium text-blue-200 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-all text-left flex justify-between items-center group"
                            >
                                <span>{profile.label}</span>
                                <span className="opacity-50 text-[10px] group-hover:opacity-100">{profile.email}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
