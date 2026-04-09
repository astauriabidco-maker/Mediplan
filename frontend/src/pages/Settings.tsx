import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Network, Zap, MessagesSquare, CheckCircle, Clock } from 'lucide-react';
import { fetchSettings, updateSetting, Setting } from '../api/settings.api';
import { facilityApi, Facility as FacilityEntity } from '../api/facility.api';
import { getRules, createRule, deleteRule } from '../api/payroll.api';
import { cn } from '../utils/cn';

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [facilities, setFacilities] = useState<FacilityEntity[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [newRule, setNewRule] = useState({ code: '', name: '', type: 'CALCULATION', formula: '', executionOrder: 1, condition: '' });
    const [selectedFacility, setSelectedFacility] = useState<string>('GLOBAL');
    const [activeTab, setActiveTab] = useState<'PLANNING' | 'COMMS' | 'GHT' | 'GED' | 'FINANCE' | 'RULES'>('PLANNING');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedFacility]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const facs = await facilityApi.getAll();
            setFacilities(facs);

            const facId = selectedFacility === 'GLOBAL' ? undefined : parseInt(selectedFacility);
            const sets = await fetchSettings(facId);
            setSettings(sets);

            const rls = await getRules();
            setRules(rls);
        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSettingChange = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const saveSetting = async (setting: Setting) => {
        setIsSaving(true);
        try {
            const facId = selectedFacility === 'GLOBAL' ? undefined : parseInt(selectedFacility);
            await updateSetting({
                key: setting.key,
                value: setting.value,
                type: setting.type,
                description: setting.description,
                facilityId: facId
            });
            setToastMessage("Paramètre sauvegardé avec succès.");
            setTimeout(() => setToastMessage(null), 3000);
            await loadData();
        } catch (error) {
            console.error("Failed to save setting:", error);
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const TABS = [
        { id: 'PLANNING', label: 'Règles Planning & IA', icon: Zap },
        { id: 'FINANCE', label: 'Primes & Indemnités', icon: SettingsIcon },
        { id: 'RULES', label: 'Moteur de Paie (AST)', icon: Zap },
        { id: 'COMMS', label: 'Notifications WhatsApp', icon: MessagesSquare },
        { id: 'GED', label: 'Coffre-Fort GED', icon: Zap },
        { id: 'GHT', label: 'Infrastructures GHT', icon: Network },
    ] as const;

    const handleCreateRule = async () => {
        try {
            await createRule(newRule);
            setIsRuleModalOpen(false);
            setNewRule({ code: '', name: '', type: 'CALCULATION', formula: '', executionOrder: 1, condition: '' });
            await loadData();
            setToastMessage("Règle ajoutée avec succès");
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la création de la règle");
        }
    };

    const handleDeleteRule = async (id: number) => {
        if (!confirm('Voulez-vous vraiment supprimer cette règle ?')) return;
        try {
            await deleteRule(id);
            await loadData();
        } catch (error) {
            console.error(error);
            alert("Impossible de supprimer la règle");
        }
    };

    const renderSettingInput = (setting: Setting) => {
        if (setting.type === 'boolean') {
            const isChecked = setting.value === 'true';
            return (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleSettingChange(setting.key, isChecked ? 'false' : 'true')}
                        className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            isChecked ? "bg-purple-500" : "bg-slate-700"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                            isChecked ? "left-[26px]" : "left-1"
                        )} />
                    </button>
                    <span className="text-sm font-medium text-slate-300">
                        {isChecked ? 'Activé' : 'Désactivé'}
                    </span>
                </div>
            );
        }

        if (setting.type === 'number') {
            return (
                <div className="relative w-32">
                    <input
                        type="number"
                        value={setting.value}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold uppercase">
                        {setting.key.includes('hours') || setting.key.includes('duration') ? 'HRS' : 'VAL'}
                    </div>
                </div>
            );
        }

        return (
            <input
                type="text"
                value={setting.value}
                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-2xl">
                                <SettingsIcon className="text-purple-400" size={32} />
                            </div>
                            Centre de Contrôle Administratif
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Gérez la configuration globale ou locale de votre Groupement Hospitalier</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-2">
                        <select
                            value={selectedFacility}
                            onChange={(e) => setSelectedFacility(e.target.value)}
                            className="bg-transparent text-white font-medium text-sm outline-none px-4 py-2 cursor-pointer"
                        >
                            <option value="GLOBAL">Règles Globales (GHT)</option>
                            {facilities.map(f => (
                                <option key={f.id} value={f.id}>🏥 {f.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex gap-8">
                    {/* Sidebar Tabs */}
                    <div className="w-72 shrink-0 space-y-2">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all text-left",
                                        isActive 
                                            ? "bg-purple-600 text-white shadow-xl shadow-purple-500/20" 
                                            : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <Icon size={20} className={isActive ? "opacity-100" : "opacity-50"} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 relative min-h-[500px]">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <RefreshCw className="animate-spin text-purple-500" size={32} />
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                {activeTab === 'PLANNING' && (
                                    <div className="space-y-6">
                                        <div className="pb-6 border-b border-slate-800">
                                            <h2 className="text-xl font-bold text-white">Règles de Planification & Alertes IA</h2>
                                            <p className="text-sm text-slate-500 mt-1">Ces limites sont utilisées par la Vigie IA pour détecter les conflits et sous-effectifs.</p>
                                        </div>

                                        <div className="space-y-4">
                                            {settings.filter(s => s.key.startsWith('planning.')).map(setting => (
                                                <div key={setting.key} className="flex items-center justify-between p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">{setting.description || setting.key}</h3>
                                                        <p className="text-xs text-slate-500 font-mono mt-1">{setting.key}</p>
                                                        {setting.isDefault && (
                                                            <span className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                                                Valeur par défaut
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {renderSettingInput(setting)}
                                                        <button
                                                            onClick={() => saveSetting(setting)}
                                                            disabled={isSaving}
                                                            className="p-3 bg-white/5 hover:bg-purple-500 text-slate-400 hover:text-white rounded-xl transition-all"
                                                            title="Sauvegarder ce paramètre"
                                                        >
                                                            <Save size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {settings.filter(s => s.key.startsWith('planning.')).length === 0 && (
                                                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                                    Aucun paramètre trouvé pour cette catégorie.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'COMMS' && (
                                    <div className="space-y-6">
                                        <div className="pb-6 border-b border-slate-800">
                                            <h2 className="text-xl font-bold text-white">Communications & Alertes</h2>
                                            <p className="text-sm text-slate-500 mt-1">Activez les modules de communication pour vos agents.</p>
                                        </div>
                                        {/* Render communication settings here */}
                                        <div className="space-y-4">
                                            {settings.filter(s => s.key.startsWith('whatsapp.')).map(setting => (
                                                <div key={setting.key} className="flex items-center justify-between p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">{setting.description || setting.key}</h3>
                                                        <p className="text-xs text-slate-500 font-mono mt-1">{setting.key}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {renderSettingInput(setting)}
                                                        <button
                                                            onClick={() => saveSetting(setting)}
                                                            disabled={isSaving}
                                                            className="p-3 bg-white/5 hover:bg-purple-500 text-slate-400 hover:text-white rounded-xl transition-all"
                                                        >
                                                            <Save size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {activeTab === 'FINANCE' && (
                                    <div className="space-y-6">
                                        <div className="pb-6 border-b border-slate-800">
                                            <h2 className="text-xl font-bold text-white">Créateur de Primes Dynamiques</h2>
                                            <p className="text-sm text-slate-500 mt-1">Créez les types de primes. Elles pourront ensuite être attribuées aux agents depuis le moteur de paie.</p>
                                        </div>
                                        <div className="p-8 text-center bg-slate-950 border border-dashed border-slate-800 rounded-2xl">
                                            <CheckCircle className="mx-auto mb-4 text-emerald-500 opacity-50" size={32} />
                                            <h3 className="text-xl font-bold text-white mb-2">Module en construction</h3>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'RULES' && (
                                    <div className="space-y-6">
                                        <div className="pb-6 border-b border-slate-800">
                                            <h2 className="text-xl font-bold text-white">Moteur de Paie Dynamique AST</h2>
                                            <p className="text-sm text-slate-500 mt-1">Règles évaluées par l'Intelligence Artificielle et le parseur mathématique. L'ordre dicte les dépendances.</p>
                                        </div>
                                        <div className="space-y-4">
                                            {rules.length === 0 && (
                                                <div className="p-8 text-center bg-slate-950 border border-dashed border-slate-800 rounded-2xl">
                                                    <p className="text-slate-500 mb-4">Le moteur de règles est actuellement vide. Lancez le Seed HGD ou ajoutez-en manuellement.</p>
                                                </div>
                                            )}
                                            {rules.map(rule => (
                                                <div key={rule.id} className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50 relative group">
                                                    <button onClick={() => handleDeleteRule(rule.id)} className="absolute top-4 right-4 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        X
                                                    </button>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-bold px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg">Ordre: {rule.executionOrder}</span>
                                                                <h3 className="font-bold text-white text-lg">{rule.name}</h3>
                                                            </div>
                                                            <p className="text-sm font-mono text-slate-400 mt-2">Code: <span className="text-emerald-400">{rule.code}</span></p>
                                                        </div>
                                                        <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-full">{rule.type}</span>
                                                    </div>
                                                    <div className="bg-slate-900 mt-4 p-4 rounded-xl border border-slate-800 font-mono text-sm text-sky-400">
                                                        <span className="text-slate-500 mr-2">Formule:</span> {rule.formula}
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => setIsRuleModalOpen(true)}
                                                className="w-full py-4 border-2 border-dashed border-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold hover:border-slate-500 hover:bg-slate-800/50 transition-all">
                                                + Ajouter une Règle de Calcul
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'GED' && (
                                    <div className="space-y-6">
                                        <div className="pb-6 border-b border-slate-800">
                                            <h2 className="text-xl font-bold text-white">Coffre-Fort Électronique (GED)</h2>
                                            <p className="text-sm text-slate-500 mt-1">Configurez les types de documents acceptés sur la plateforme.</p>
                                        </div>
                                        <div className="space-y-4">
                                            {settings.filter(s => s.key.startsWith('documents.')).map(setting => (
                                                <div key={setting.key} className="flex items-center justify-between p-6 bg-slate-950/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">{setting.description || setting.key}</h3>
                                                        <p className="text-xs text-slate-500 font-mono mt-1">{setting.key}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {renderSettingInput(setting)}
                                                        <button
                                                            onClick={() => saveSetting(setting)}
                                                            disabled={isSaving}
                                                            className="p-3 bg-white/5 hover:bg-purple-500 text-slate-400 hover:text-white rounded-xl transition-all"
                                                        >
                                                            <Save size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'GHT' && (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-4">
                                        <Network size={48} className="opacity-50" />
                                        <p className="text-center font-medium">L'interface de gestion avancée des Services (Seuils minimums) et Infrastructures viendra s'intégrer ici.</p>
                                        <button className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-bold text-white transition-colors">
                                            Voir la liste des sites
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for Rule */}
            {isRuleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 relative">
                        <h2 className="text-white text-xl font-bold mb-4">Ajouter une Règle AST</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm mb-1 block">Nom usuel</label>
                                <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none" value={newRule.name} onChange={e => setNewRule({...newRule, name: e.target.value})} placeholder="ex: Cotisation CNPS" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-slate-400 text-sm mb-1 block">Code Unique</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none font-mono" value={newRule.code} onChange={e => setNewRule({...newRule, code: e.target.value})} placeholder="ex: CNPS_TAX" />
                                </div>
                                <div className="w-32">
                                    <label className="text-slate-400 text-sm mb-1 block">Ordre</label>
                                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none" value={newRule.executionOrder} onChange={e => setNewRule({...newRule, executionOrder: +e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm mb-1 block">Type</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none" value={newRule.type} onChange={e => setNewRule({...newRule, type: e.target.value})}>
                                    <option value="CALCULATION">Variable Intermédiaire (CALCULATION)</option>
                                    <option value="TAX">Taxe / Impôt (TAX)</option>
                                    <option value="DEDUCTION">Retenue Diverse (DEDUCTION)</option>
                                    <option value="ALLOWANCE">Prime (ALLOWANCE)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm mb-1 block">Formule Mathématique (AST)</label>
                                <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-emerald-400 font-mono outline-none" rows={3} value={newRule.formula} onChange={e => setNewRule({...newRule, formula: e.target.value})} placeholder="min(GROSS_TAXABLE, 750000) * 0.042" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl">Annuler</button>
                            <button onClick={handleCreateRule} className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-full shadow-2xl flex items-center gap-2 animate-[slideUp_0.3s_ease-out]">
                    <CheckCircle size={20} />
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
