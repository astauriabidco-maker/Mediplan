import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CheckCircle2,
    Loader2,
    Mail,
    Send,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { submitDemoRequest } from '../api/demo-request.api';

const PERSONAL_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'hotmail.com',
    'icloud.com',
    'laposte.net',
    'outlook.com',
    'proton.me',
    'yahoo.com',
]);

const initialForm = {
    name: '',
    professionalEmail: '',
    facility: '',
    role: '',
    message: '',
    consent: false,
    website: '',
    antiSpamAnswer: '',
};

type DemoRequestForm = typeof initialForm;

const roleLabels: Record<string, string> = {
    direction: 'Direction',
    rh: 'Ressources humaines',
    cadre: 'Cadre de sante',
    it: 'SI / DSI',
    other: 'Autre',
};

const getErrorMessage = (error: unknown): string => {
    if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: unknown } } }).response?.data
            ?.message
    ) {
        const message = (error as { response: { data: { message: unknown } } })
            .response.data.message;
        return typeof message === 'string'
            ? message
            : "Impossible d'envoyer la demande pour le moment.";
    }
    return "Impossible d'envoyer la demande pour le moment.";
};

export const DemoRequestPage: React.FC = () => {
    const [form, setForm] = useState<DemoRequestForm>(initialForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const emailDomain = useMemo(() => {
        const [, domain] = form.professionalEmail.trim().toLowerCase().split('@');
        return domain || '';
    }, [form.professionalEmail]);

    const updateField = (
        field: keyof DemoRequestForm,
        value: string | boolean,
    ) => {
        setForm((current) => ({ ...current, [field]: value }));
        setError('');
    };

    const validateForm = (): string | null => {
        if (form.website.trim()) {
            return null;
        }

        if (PERSONAL_EMAIL_DOMAINS.has(emailDomain)) {
            return 'Utilisez une adresse email professionnelle.';
        }

        if (form.antiSpamAnswer.trim() !== '7') {
            return 'La vérification anti-spam est incorrecte.';
        }

        if (!form.consent) {
            return 'Le consentement est requis pour traiter la demande.';
        }

        return null;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        if (form.website.trim()) {
            setSuccess(true);
            return;
        }

        setLoading(true);
        try {
            const [firstName, ...lastNameParts] = form.name.trim().split(/\s+/);
            await submitDemoRequest({
                organizationName: form.facility.trim(),
                organizationType: 'HOSPITAL',
                staffRange: '200_499',
                country: 'FR',
                contactFirstName: firstName,
                contactLastName: lastNameParts.join(' ') || firstName,
                jobTitle: roleLabels[form.role] ?? form.role,
                workEmail: form.professionalEmail.trim(),
                message: form.message.trim(),
                consentToBeContacted: true,
            });
            setSuccess(true);
            setForm(initialForm);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Connexion
                    </Link>
                    <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        Démo commerciale contrôlée
                    </div>
                </div>

                <section className="grid flex-1 items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-6">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                                Demander une démo Mediplan
                            </h1>
                            <p className="max-w-xl text-base leading-7 text-slate-300">
                                Un échange court pour qualifier votre contexte, présenter un
                                environnement de démonstration non hospitalier réel et cadrer les
                                prochaines étapes.
                            </p>
                        </div>
                        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                                Données fictives ou anonymisées uniquement.
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                                Aucun accès utilisateur externe sans validation dédiée.
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
                        {success ? (
                            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
                                    <CheckCircle2 className="h-9 w-9 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">
                                    Demande envoyée
                                </h2>
                                <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
                                    Merci, l'équipe Mediplan revient vers vous pour organiser la
                                    démo commerciale.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setSuccess(false)}
                                    className="mt-8 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                                >
                                    Envoyer une autre demande
                                </button>
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Coordonnées
                                    </h2>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block text-sm font-semibold text-slate-200">
                                        Nom
                                        <span className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-950/60 px-3 focus-within:border-emerald-400">
                                            <UserRound className="mr-2 h-4 w-4 text-slate-500" />
                                            <input
                                                required
                                                value={form.name}
                                                onChange={(event) =>
                                                    updateField('name', event.target.value)
                                                }
                                                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
                                                placeholder="Nom et prénom"
                                            />
                                        </span>
                                    </label>

                                    <label className="block text-sm font-semibold text-slate-200">
                                        Email pro
                                        <span className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-950/60 px-3 focus-within:border-emerald-400">
                                            <Mail className="mr-2 h-4 w-4 text-slate-500" />
                                            <input
                                                required
                                                type="email"
                                                value={form.professionalEmail}
                                                onChange={(event) =>
                                                    updateField(
                                                        'professionalEmail',
                                                        event.target.value,
                                                    )
                                                }
                                                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
                                                placeholder="vous@etablissement.fr"
                                            />
                                        </span>
                                    </label>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block text-sm font-semibold text-slate-200">
                                        Établissement
                                        <span className="mt-2 flex items-center rounded-xl border border-white/10 bg-slate-950/60 px-3 focus-within:border-emerald-400">
                                            <Building2 className="mr-2 h-4 w-4 text-slate-500" />
                                            <input
                                                required
                                                value={form.facility}
                                                onChange={(event) =>
                                                    updateField('facility', event.target.value)
                                                }
                                                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500"
                                                placeholder="Nom de la structure"
                                            />
                                        </span>
                                    </label>

                                    <label className="block text-sm font-semibold text-slate-200">
                                        Rôle
                                        <select
                                            required
                                            value={form.role}
                                            onChange={(event) =>
                                                updateField('role', event.target.value)
                                            }
                                            className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-400"
                                        >
                                            <option value="">Sélectionner</option>
                                            <option value="direction">Direction</option>
                                            <option value="rh">Ressources humaines</option>
                                            <option value="cadre">Cadre de santé</option>
                                            <option value="it">SI / DSI</option>
                                            <option value="other">Autre</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="block text-sm font-semibold text-slate-200">
                                    Message
                                    <textarea
                                        required
                                        rows={5}
                                        value={form.message}
                                        onChange={(event) =>
                                            updateField('message', event.target.value)
                                        }
                                        className="mt-2 block w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition-colors focus:border-emerald-400"
                                        placeholder="Contexte, calendrier souhaité, périmètre de la démo"
                                    />
                                </label>

                                <label className="sr-only">
                                    Site web
                                    <input
                                        tabIndex={-1}
                                        autoComplete="off"
                                        value={form.website}
                                        onChange={(event) =>
                                            updateField('website', event.target.value)
                                        }
                                    />
                                </label>

                                <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
                                    <label className="block text-sm font-semibold text-slate-200">
                                        Anti-spam: 4 + 3
                                        <input
                                            required
                                            inputMode="numeric"
                                            value={form.antiSpamAnswer}
                                            onChange={(event) =>
                                                updateField(
                                                    'antiSpamAnswer',
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition-colors focus:border-emerald-400"
                                            placeholder="Réponse"
                                        />
                                    </label>

                                    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-300">
                                        <input
                                            required
                                            type="checkbox"
                                            checked={form.consent}
                                            onChange={(event) =>
                                                updateField('consent', event.target.checked)
                                            }
                                            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                                        />
                                        J'accepte d'être recontacté au sujet de cette demande de
                                        démo.
                                    </label>
                                </div>

                                {error && (
                                    <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-200">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    Envoyer la demande
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
};
