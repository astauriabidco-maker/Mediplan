import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, ShieldCheck, Clock, FileBadge, CheckCircle, FileSignature, Sparkles, Wand2, X } from 'lucide-react';
import { fetchDocuments, requestSignature, signDocument, uploadDocument, generateEmploymentContract } from '../api/documents.api';
import api from '../api/axios';
import { fetchSettings } from '../api/settings.api';
import { fetchAgents, Agent } from '../api/agents.api';
import { useAuth } from '../store/useAuth';
import { cn } from '../utils/cn';

export const GedPage = () => {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState('Contrat de Travail');
    const [signingDoc, setSigningDoc] = useState<any>(null);
    const [otp, setOtp] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const isAgent = user?.role === 'AGENT';
    const [filterAgent, setFilterAgent] = useState<string>('ALL');
    const [uploadTargetAgent, setUploadTargetAgent] = useState<string>(user?.id?.toString() || '');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [generating, setGenerating] = useState(false);

    const { data: documents = [], refetch } = useQuery({
        queryKey: ['documents', isAgent ? user?.id : filterAgent],
        queryFn: () => fetchDocuments(filterAgent === 'ALL' || isAgent ? undefined : parseInt(filterAgent))
    });

    const { data: agents = [] } = useQuery({
        queryKey: ['agents'],
        queryFn: fetchAgents,
        enabled: !isAgent
    });

    const { data: templates = [] } = useQuery({
        queryKey: ['contract-templates'],
        queryFn: async () => (await api.get('/api/documents/templates')).data,
        enabled: !isAgent
    });

    const { data: categories = ['Contrat de Travail', 'Avenant de Garde', 'Fiche de Paie', 'Attestation de Formation', 'Autre'] } = useQuery({
        queryKey: ['documentCategories'],
        queryFn: async () => {
            const settings = await fetchSettings();
            const catSetting = settings.find((s: any) => s.key === 'documents.categories');
            if (catSetting && catSetting.value) {
                return catSetting.value.split(',').map((s: string) => s.trim());
            }
            return ['Contrat de Travail', 'Avenant de Garde', 'Fiche de Paie', 'Arrêt Maladie', 'Attestation de Formation', 'Autre'];
        }
    });

    React.useEffect(() => {
        if (categories.length > 0 && !categories.includes(docType)) {
            setDocType(categories[0]);
        }
    }, [categories, docType]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !title) return;
        setUploading(true);
        try {
            const targetId = isAgent ? user?.id : parseInt(uploadTargetAgent);
            if (targetId) {
                await uploadDocument(selectedFile, title, docType, targetId);
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

    const handleGenerate = async () => {
        if (!uploadTargetAgent || !selectedTemplate) return;
        setGenerating(true);
        try {
            await generateEmploymentContract(parseInt(uploadTargetAgent), parseInt(selectedTemplate));
            await refetch();
            alert("Contrat généré avec succès en tant que Brouillon !");
        } catch (error) {
            console.error('Generation error', error);
            alert("Erreur lors de la génération");
        } finally {
            setGenerating(false);
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

            {/* Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Form */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Upload size={20} className="text-emerald-500" /> Ajouter un Document Existant
                    </h2>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                        {!isAgent && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Agent Destinataire</label>
                                <select 
                                    value={uploadTargetAgent} onChange={(e) => setUploadTargetAgent(e.target.value)} required
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white"
                                >
                                    <option value="">-- Sélectionner un Agent --</option>
                                    {agents.map((a: any) => (
                                        <option key={a.id} value={a.id}>{a.nom} ({a.matricule})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Fichier</label>
                            <input 
                                type="file" 
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} required
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white" 
                            />
                        </div>
                        <button 
                            type="submit" disabled={uploading || !selectedFile}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors mt-4"
                        >
                            {uploading ? 'Envoi...' : 'Ajouter au Coffre-fort'}
                        </button>
                    </form>
                </div>

                {/* Contract Generation Form - NEW */}
                {!isAgent && (
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles size={80} className="text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Wand2 size={20} className="text-blue-500" /> Assistant de Génération RH
                        </h2>
                        
                        <div className="space-y-6">
                            <p className="text-sm text-slate-400">
                                Générez un contrat de travail complet en utilisant vos gabarits prédéfinis.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">1. Choisir l'Agent</label>
                                    <select 
                                        value={uploadTargetAgent} onChange={(e) => setUploadTargetAgent(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white focus:border-blue-500 transition-colors"
                                    >
                                        <option value="">Sélectionner un agent...</option>
                                        {agents.map((a: any) => <option key={a.id} value={a.id}>{a.nom} ({a.matricule})</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">2. Choisir le Gabarit</label>
                                    <select 
                                        value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 mt-1 text-sm text-white focus:border-blue-500 transition-colors"
                                    >
                                        <option value="">Sélectionner un modèle...</option>
                                        {templates.map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t.type})</option>)}
                                    </select>
                                </div>

                                <button 
                                    onClick={handleGenerate}
                                    disabled={generating || !selectedTemplate || !uploadTargetAgent}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                >
                                    {generating ? <Clock className="animate-spin" /> : <Sparkles size={20} />}
                                    Générer le Contrat de Travail
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Documents List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col max-h-[80vh]">
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileBadge className="text-emerald-500" />
                        {isAgent ? `Mon Coffre-fort Personnel` : 'Archives & Dossiers (Vue Administrative)'}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        {!isAgent && (
                            <select 
                                value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
                                className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-4 py-2 text-sm"
                            >
                                <option value="ALL">Tous les agents...</option>
                                {agents.map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.nom}</option>
                                ))}
                            </select>
                        )}
                        <select 
                            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-4 py-2 text-sm"
                        >
                            <option value="ALL">Tous les statuts</option>
                            <option value="DRAFT">Brouillons (Pré-signature)</option>
                            <option value="PENDING_SIGNATURE">En attente de signature</option>
                            <option value="SIGNED">Signés & Validés</option>
                        </select>
                    </div>
                </div>
                
                <div className="space-y-4 overflow-y-auto pr-2">
                    {documents.filter((d: any) => filterStatus === 'ALL' || d.status === filterStatus).map((doc: any) => (
                        <div key={doc.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-xl", doc.status === 'DRAFT' ? "bg-blue-500/10 text-blue-400" : "bg-slate-800 text-slate-400")}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{doc.title}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest">{doc.type}</p>
                                    {!isAgent && filterAgent === 'ALL' && doc.agent && (
                                        <p className="text-xs text-blue-400 mt-1">👤 Agent: {doc.agent.nom}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {doc.status === 'SIGNED' ? (
                                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                        <CheckCircle size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Scellé & Signé</span>
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
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Déclencher Signature
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {documents.length === 0 && <p className="text-slate-500 italic text-center py-12">Aucun document ne correspond à vos critères.</p>}
                </div>
            </div>

            {/* Signature Modal */}
            {signingDoc && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Signature eIDAS</h2>
                            <button onClick={() => setSigningDoc(null)} className="p-2 text-slate-500 hover:text-white"><X /></button>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 flex-1 overflow-auto">
                            <iframe 
                                src={signingDoc.fileUrl.startsWith('data:') ? signingDoc.fileUrl : (signingDoc.fileUrl.startsWith('http') ? signingDoc.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${signingDoc.fileUrl}`)} 
                                className="w-full h-full min-h-[400px] bg-white rounded-lg"
                                title="Aperçu Document"
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase text-center block mb-2">Code OTP (WhatsApp)</label>
                                <input 
                                    value={otp} onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl tracking-[1em] text-white outline-none focus:border-blue-500 placeholder:tracking-normal placeholder:text-sm" 
                                    maxLength={4}
                                    placeholder="XXXX"
                                />
                            </div>
                            <button 
                                onClick={handleSign}
                                disabled={otp.length !== 4}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl transition shadow-xl shadow-emerald-500/20 uppercase tracking-widest"
                            >
                                Sceller le Document
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
