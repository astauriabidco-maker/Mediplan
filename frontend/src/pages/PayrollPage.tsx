import React, { useState, useEffect } from 'react';
import { fetchPayslips, generateAllPayslips } from '../api/payroll.api';
import { Loader2, Calendar, Euro, Calculator, FileText, X } from 'lucide-react';
import { useAuth } from '../store/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const getCurrentMonthParams =() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export const PayrollPage = () => {
    const { token } = useAuth();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    const [filterPeriod, setFilterPeriod] = useState(getCurrentMonthParams());
    const [selectedDetail, setSelectedDetail] = useState<any>(null);

    const loadPayslips = async () => {
        setLoading(true);
        try {
            const data = await fetchPayslips(filterPeriod.month, filterPeriod.year);
            setPayslips(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            loadPayslips();
        }
    }, [filterPeriod, token]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await generateAllPayslips(filterPeriod.month, filterPeriod.year);
            alert(`Lancement moteur terminé : ${res.generated} fiches de paie générées/mises à jour.`);
            await loadPayslips();
        } catch (error) {
            alert("Erreur lors de la facturation.");
        } finally {
            setGenerating(false);
        }
    };

    const totalSalaireBase = payslips.reduce((acc, p) => acc + (Number(p.baseSalary) || 0), 0);
    const totalPrimes = payslips.reduce((acc, p) => acc + (Number(p.allowances) || 0), 0);
    const totalGeneral = totalSalaireBase + totalPrimes;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-white">Facturation & Paies</h1>
                    <p className="text-slate-400 mt-2">Suivi des majorations (Nuits, Dimanches) et calcul des salaires</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-xl text-white">
                    <Calendar size={18} className="text-slate-400 ml-2" />
                    <select 
                        value={filterPeriod.month}
                        onChange={(e)=> setFilterPeriod({...filterPeriod, month: parseInt(e.target.value)})}
                        className="bg-transparent outline-none pl-2 pr-4 font-medium"
                    >
                        {Array.from({length: 12}).map((_, i) => (
                            <option key={i+1} value={i+1} className="bg-slate-900">{new Date(2025, i, 1).toLocaleString('fr', {month: 'long'})}</option>
                        ))}
                    </select>
                    <select 
                        value={filterPeriod.year}
                        onChange={(e)=> setFilterPeriod({...filterPeriod, year: parseInt(e.target.value)})}
                        className="bg-transparent outline-none pl-2 pr-4 font-medium text-purple-400 border-l border-slate-800"
                    >
                        {[2025, 2026, 2027].map(y => (
                            <option key={y} value={y} className="bg-slate-900">{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Bases Indexées</span>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                            <Euro size={24} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white mt-4">{totalSalaireBase.toFixed(2)} €</div>
                    <div className="text-sm text-slate-500 mt-2">Total des salaires hors primes</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Majorations & Gardes</span>
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                            <Euro size={24} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white mt-4">+{totalPrimes.toFixed(2)} €</div>
                    <div className="text-sm text-amber-500/80 mt-2">Nuits, Dimanches et Forfaits fixes</div>
                </div>

                <div className="bg-purple-600 border border-purple-500 p-6 rounded-2xl flex flex-col justify-center shadow-lg shadow-purple-900/50">
                    <button 
                        onClick={handleGenerate}
                        disabled={generating}
                        className={cn(
                            "w-full h-full min-h-[100px] rounded-xl flex flex-col items-center justify-center gap-3 transition-colors",
                            generating ? "opacity-75 cursor-wait" : "hover:bg-purple-500"
                        )}
                    >
                        {generating ? <Loader2 size={32} className="animate-spin text-white" /> : <Calculator size={32} className="text-white" />}
                        <span className="font-bold text-white text-lg">{generating ? 'Calcul en cours...' : 'Lancer Moteur de Paie'}</span>
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">Détail des Facturations Praticiens</h2>
                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm">{payslips.length} Fiches</span>
                </div>
                
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
                    ) : payslips.length === 0 ? (
                        <div className="text-center p-12 text-slate-400">Aucune fiche de paie générée pour cette période.</div>
                    ) : (
                        payslips.map(payslip => (
                            <div key={payslip.id} className="group bg-slate-800/30 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer" onClick={() => setSelectedDetail(payslip)}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {payslip.agent?.nom?.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{payslip.agent?.nom} {payslip.agent?.firstName}</h3>
                                        <div className="text-sm text-slate-400">Idx {payslip.details?.index} × {payslip.details?.valPoint}€</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden md:block">
                                        <div className="text-sm text-slate-400">Salaire Base</div>
                                        <div className="font-semibold text-slate-200">{Number(payslip.baseSalary).toFixed(2)} €</div>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-sm text-amber-500">Primes Variables</div>
                                        <div className="font-semibold text-amber-400">+{Number(payslip.allowances).toFixed(2)} €</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400">Total Net</div>
                                        <div className="font-bold text-white text-xl">{(Number(payslip.baseSalary) + Number(payslip.allowances)).toFixed(2)} €</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Document Preview Modal */}
            {selectedDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-800 font-bold">
                                <FileText size={20} className="text-purple-600" />
                                Détail de Facturation
                            </div>
                            <button onClick={() => setSelectedDetail(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-6 text-slate-800">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900">{selectedDetail.agent?.nom} {selectedDetail.agent?.firstName}</h1>
                                    <p className="text-slate-500 mt-1">Période: {selectedDetail.month}/{selectedDetail.year}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mediplan GHT</div>
                                    <div className="font-bold text-purple-600 mt-1">Document Interne PROVISOIRE</div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-1">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100">
                                            <th className="p-3 rounded-tl-lg">Désignation</th>
                                            <th className="p-3">Quantité</th>
                                            <th className="p-3">Taux U.</th>
                                            <th className="p-3 rounded-tr-lg text-right">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        <tr>
                                            <td className="p-3 font-medium">Traitement de Base (Index)</td>
                                            <td className="p-3">{selectedDetail.details?.index} pts</td>
                                            <td className="p-3">{selectedDetail.details?.valPoint} €</td>
                                            <td className="p-3 text-right">{Number(selectedDetail.baseSalary).toFixed(2)} €</td>
                                        </tr>
                                        {selectedDetail.details?.gardesCount > 0 && (
                                            <tr>
                                                <td className="p-3 font-medium text-amber-600">Forfaits Garde</td>
                                                <td className="p-3">{selectedDetail.details?.gardesCount}</td>
                                                <td className="p-3">{selectedDetail.details?.primeGarde} €</td>
                                                <td className="p-3 text-right text-amber-600">{(selectedDetail.details?.gardesCount * selectedDetail.details?.primeGarde).toFixed(2)} €</td>
                                            </tr>
                                        )}
                                        {selectedDetail.details?.nightHours > 0 && (
                                            <tr>
                                                <td className="p-3 font-medium text-indigo-600">Majoration de Nuit (21h-06h)</td>
                                                <td className="p-3">{selectedDetail.details?.nightHours} h</td>
                                                <td className="p-3">{selectedDetail.details?.primeNuitHour} €/h</td>
                                                <td className="p-3 text-right text-indigo-600">{(selectedDetail.details?.nightHours * selectedDetail.details?.primeNuitHour).toFixed(2)} €</td>
                                            </tr>
                                        )}
                                        {selectedDetail.details?.sundayHours > 0 && (
                                            <tr>
                                                <td className="p-3 font-medium text-rose-600">Majoration Dimanche & Fériés</td>
                                                <td className="p-3">{selectedDetail.details?.sundayHours} h</td>
                                                <td className="p-3">{selectedDetail.details?.primeDimancheHour} €/h</td>
                                                <td className="p-3 text-right text-rose-600">{(selectedDetail.details?.sundayHours * selectedDetail.details?.primeDimancheHour).toFixed(2)} €</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-slate-200">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Net à payer estimé</div>
                                    <div className="text-4xl font-black text-slate-900">{(Number(selectedDetail.baseSalary) + Number(selectedDetail.allowances)).toFixed(2)} €</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
