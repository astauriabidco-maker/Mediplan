import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, ShieldCheck, Clock, FileBadge, CheckCircle, FileSignature } from 'lucide-react';
import { fetchDocuments, requestSignature, signDocument, uploadDocument } from '../api/documents.api';
import { fetchSettings } from '../api/settings.api';
import { useAuth } from '../store/useAuth';

export const GedPage = () => {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState('Contrat de Travail');
    const [signingDoc, setSigningDoc] = useState<any>(null);
    const [otp, setOtp] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const { data: documents = [], refetch } = useQuery({
        queryKey: ['documents'],
        queryFn: () => fetchDocuments()
    });

    const { data: categories = ['Contrat de Travail', 'Avenant de Garde', 'Fiche de Paie', 'Attestation de Formation', 'Autre'] } = useQuery({
        queryKey: ['documentCategories'],
        queryFn: async () => {
            const settings = await fetchSettings();
            const catSetting = settings.find(s => s.key === 'documents.categories');
            if (catSetting && catSetting.value) {
                return catSetting.value.split(',').map(s => s.trim());
            }
            return ['Contrat de Travail', 'Avenant de Garde', 'Fiche de Paie', 'Attestation de Formation', 'Autre'];
        }
    });

    React.useEffect(() => {
        if (categories.length > 0 && !categories.includes(docType)) {
            setDocType(categories[0]);
        }
    }, [categories]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !title) return;
        setUploading(true);
        try {
            if (user) {
                await uploadDocument(selectedFile, title, docType, user.id);
                setTitle('');
                setSelectedFile(null);
                await refetch();
            }
        } catch (error) {
            console.error('Upload error', error);
        } finally {
            setUploading(false);
        }
    };

    const handleRequestSignature = async (doc: any) => {
        try {
            await requestSignature(doc.id, doc.agent.id);
            await refetch();
            setSigningDoc(doc);
        } catch (error) {
            alert("Erreur lors de la demande de signature");
        }
    };

    const handleSign = async () => {
        try {
            await signDocument(signingDoc.id, signingDoc.agent.id, otp);
            setSigningDoc(null);
            setOtp('');
            await refetch();
            alert("Document signé avec succès !");
        } catch (error) {
            alert("Code incorrect ou erreur système");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl">
                        <FileSignature size={28} className="text-white" />
                    </div>
                    Gestion Documentaire & Signature (GED)
                </h1>
                <p className="text-slate-400">Coffre-fort RH, contrats et fiches de paie. Signatures eIDAS sécurisées.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 h-fit">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Upload className="text-blue-500" />
                        Nouveau Document
                    </h3>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Titre</label>
                            <input 
                                value={title} onChange={(e) => setTitle(e.target.value)} required
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                            <select 
                                value={docType} onChange={(e) => setDocType(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white"
                            >
                                {categories.map((cat: string) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Fichier PDF</label>
                            <input 
                                type="file" accept="application/pdf"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white" 
                            />
                        </div>
                        <button 
                            type="submit" disabled={uploading || !selectedFile}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors mt-4"
                        >
                            {uploading ? 'Envoi...' : 'Ajouter au Coffre-fort'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col max-h-[80vh]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileBadge className="text-emerald-500" />
                            Dossier Personnel ({user?.email || 'N/A'})
                        </h3>
                        <select 
                            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-4 py-2 text-sm"
                        >
                            <option value="ALL">Tous les documents</option>
                            <option value="PENDING_SIGNATURE">À Signer (URGENT)</option>
                            <option value="SIGNED">Validés & Signés</option>
                        </select>
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto pr-2">
                        {documents.filter((d: any) => filterStatus === 'ALL' || d.status === filterStatus).map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-800 text-blue-400 rounded-xl">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{doc.title}</p>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">{doc.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {doc.status === 'SIGNED' ? (
                                        <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                                            <CheckCircle size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Signé (Sécurisé)</span>
                                        </div>
                                    ) : doc.status === 'PENDING_SIGNATURE' ? (
                                        <button 
                                            onClick={() => setSigningDoc(doc)}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <ShieldCheck size={14} /> Continuer Signature
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleRequestSignature(doc)}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Signer Électroniquement
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {documents.length === 0 && <p className="text-slate-500 italic text-center py-4">Aucun document dans le coffre-fort.</p>}
                    </div>
                </div>
            </div>

            {/* Signature Modal */}
            {signingDoc && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center">
                                <ShieldCheck size={32} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white text-center mb-2">Signature 2FA requise</h2>
                        <p className="text-slate-400 text-sm text-center mb-6">
                            Veuillez lire le document avant de sceller votre engagement : 
                            <strong className="text-white block mt-1">{signingDoc.title}</strong>
                        </p>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 flex-1 overflow-auto min-h-[200px]">
                            {/* Render the document inside an iframe. Uses the backend static files path */}
                            <iframe 
                                src={signingDoc.fileUrl.startsWith('http') ? signingDoc.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${signingDoc.fileUrl}`} 
                                className="w-full h-full min-h-[300px] bg-white rounded-lg"
                                title="Aperçu Document"
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase text-center block mb-2">Code WhatsApp (4 chiffres)</label>
                                <input 
                                    value={otp} onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[1em] text-white outline-none focus:border-blue-500" 
                                    maxLength={4}
                                />
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setSigningDoc(null)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleSign}
                                    disabled={otp.length !== 4}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                >
                                    Signer (eIDAS)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
