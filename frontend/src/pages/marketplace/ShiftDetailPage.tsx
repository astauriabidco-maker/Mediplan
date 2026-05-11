import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { MapPin, Clock, CalendarIcon, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ShiftDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-shift', id],
    queryFn: async () => {
      const res = await api.get(`/marketplace/shifts/${id}`);
      return res.data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/marketplace/apply/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-shift', id] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-shifts'] });
    },
    onError: (error: any) => {
      setErrorMsg(error.response?.data?.message || 'Erreur lors de la candidature');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20 gap-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Analyse de la garde...</p>
      </div>
    );
  }

  if (!data) return null;

  const { shift, applicantCount, compliance, score, hasApplied, applicationStatus } = data;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/marketplace')}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Détails du remplacement</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{shift.postId}</h2>
        <div className="flex items-center gap-2 text-slate-400 mb-6">
          <MapPin size={16} className="text-emerald-500" />
          <span>{shift.facility?.name || 'Site principal'}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-4">
            <CalendarIcon size={20} className="text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase">Date</div>
              <div className="text-sm font-bold text-slate-200">
                {format(new Date(shift.start), 'dd MMM yyyy', { locale: fr })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-4">
            <Clock size={20} className="text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase">Horaire</div>
              <div className="text-sm font-bold text-slate-200">
                {format(new Date(shift.start), 'HH:mm')} - {format(new Date(shift.end), 'HH:mm')}
              </div>
            </div>
          </div>
        </div>

        {/* Candidats info */}
        <div className="flex items-center gap-2 mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <Users size={18} className="text-indigo-400" />
          <span className="text-sm text-slate-300">
            <strong className="text-white">{applicantCount}</strong> candidature(s) en cours
          </span>
        </div>

        {/* Compliance checks */}
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Vérification de conformité</h3>
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            {compliance.isValid ? (
              <CheckCircle size={18} className="text-emerald-500" />
            ) : (
              <XCircle size={18} className="text-rose-500" />
            )}
            <span className={compliance.isValid ? "text-slate-300" : "text-rose-400"}>
              {compliance.isValid ? "Règles légales respectées (Repos, Heures hebdo)" : "Non-conformité détectée"}
            </span>
          </div>
          {!compliance.isValid && compliance.blockingReasons.map((reason: string) => (
             <div key={reason} className="pl-7 text-xs text-rose-500">- {reason}</div>
          ))}
          {score > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <CheckCircle size={18} className="text-emerald-500" />
              <span className="text-slate-300">Score IA estimé : <strong className="text-emerald-400">{score}/100</strong></span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {hasApplied ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <h4 className="font-bold text-emerald-400 mb-1">Candidature envoyée !</h4>
            <p className="text-xs text-slate-400">Statut: {applicationStatus}</p>
          </div>
        ) : (
          <div>
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-400 text-sm">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            <button 
              onClick={() => applyMutation.mutate()}
              disabled={!compliance.isValid || applyMutation.isPending}
              className={`w-full font-bold py-4 rounded-xl transition-all ${
                !compliance.isValid 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              }`}
            >
              {applyMutation.isPending ? 'Envoi en cours...' : 'CANDIDATER MAINTENANT'}
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-3">
              Réponse de l'algorithme sous 30 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
