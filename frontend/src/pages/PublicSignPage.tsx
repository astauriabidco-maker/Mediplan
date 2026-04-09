import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FileText, ShieldCheck, CheckCircle, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { cn } from '../utils/cn';

export const PublicSignPage = () => {
    const { token } = useParams<{ token: string }>();
    const [doc, setDoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [otp, setOtp] = useState('');
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await axios.get(`/api/documents/public/${token}`);
                setDoc(res.data);
            } catch (err: any) {
                setError(err.response?.data?.message || "Lien invalide ou expiré");
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [token]);

    const handleSign = async () => {
        if (otp.length !== 4) return;
        setSigning(true);
        try {
            await axios.post(`/api/documents/public/${token}/sign`, { otp });
            setSigned(true);
        } catch (err: any) {
            alert(err.response?.data?.message || "Erreur lors de la signature");
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Oups !</h1>
                    <p className="text-slate-400">{error || "Document introuvable"}</p>
                    <p className="text-xs text-slate-500">Veuillez contacter votre service RH pour obtenir un nouveau lien.</p>
                </div>
            </div>
        );
    }

    if (signed || doc.status === 'SIGNED') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white">Document Signé !</h1>
                    <p className="text-slate-400">Félicitations, votre contrat <strong>{doc.title}</strong> a été scellé électroniquement avec succès.</p>
                    <div className="pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-500">Une version PDF scellée a été archivée dans votre dossier personnel MediPlan.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
            {/* Mobile Header */}
            <header className="p-6 bg-slate-900/50 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white leading-tight">Signature Sécurisée</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Certifié MediPlan HGD</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 space-y-8 max-w-2xl mx-auto w-full">
                {/* Intro */}
                <section className="space-y-2">
                    <h1 className="text-2xl font-black text-white leading-tight">Bonjour {doc.agentName},</h1>
                    <p className="text-slate-400 text-sm">Veuillez relire et signer votre document : <span className="text-blue-400 font-bold">{doc.title}</span>.</p>
                </section>

                {/* Doc Preview */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/5 min-h-[400px] flex flex-col border-4 border-slate-800">
                    <div className="bg-slate-100 p-3 border-b flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <FileText size={12} /> Format Document ({doc.type})
                        </span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-auto">
                        {doc.fileUrl.startsWith('data:text/html;base64,') ? (
                           <div 
                                dangerouslySetInnerHTML={{ __html: decodeURIComponent(escape(window.atob(doc.fileUrl.replace('data:text/html;base64,', '')))) }}
                                className="prose prose-sm max-w-none text-slate-900"
                           />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                <AlertCircle className="text-slate-300 w-12 h-12" />
                                <p className="text-slate-500 text-sm">Le contenu interactif n'est pas disponible pour ce type de fichier. Veuillez vous référer à la version PDF scellée après signature.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* OTP Section */}
                <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl sticky bottom-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
                            <Smartphone size={16} /> 2FA : Validation WhatsApp
                        </div>
                        <p className="text-xs text-slate-500">Saisissez le code à 4 chiffres envoyé sur votre téléphone pour sceller définitivement le contrat.</p>
                    </div>

                    <div className="flex justify-center">
                        <input 
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="XXXX"
                            className="bg-slate-950 border-2 border-slate-700 rounded-2xl px-6 py-4 text-center text-4xl tracking-[0.5em] text-white outline-none focus:border-blue-600 transition-all w-full max-w-[200px] placeholder:tracking-normal placeholder:text-slate-800"
                        />
                    </div>

                    <button 
                        onClick={handleSign}
                        disabled={signing || otp.length !== 4}
                        className={cn(
                            "w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-white transition-all shadow-lg",
                            otp.length === 4 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/25 active:scale-95" 
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {signing ? <Loader2 className="animate-spin mx-auto" /> : "Signer mon Contrat"}
                    </button>
                    
                    <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                        En cliquant sur "Signer mon Contrat", vous acceptez les conditions générales de MediPlan et consentez à utiliser la signature électronique eIDAS pour sceller ce document.
                    </p>
                </section>
            </main>

            <footer className="p-8 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">
                MediPlan Hospital Group &copy; 2026 - Tous droits réservés
            </footer>
        </div>
    );
};
