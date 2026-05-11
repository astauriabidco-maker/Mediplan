import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../store/useAuth';
import { Bell, MapPin, Clock, Calendar as CalendarIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export const MarketplaceFeedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['marketplace-shifts'],
    queryFn: async () => {
      const res = await api.get('/marketplace/shifts');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Recherche de gardes disponibles...</p>
      </div>
    );
  }

  if (!shifts || shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-2">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-lg font-medium text-white">Aucune garde urgente</h3>
        <p className="text-slate-400 max-w-xs">
          Tous les services sont couverts. Nous vous préviendrons si un besoin se présente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Gardes disponibles</h1>
        <p className="text-slate-400">
          Postulez aux remplacements qui correspondent à vos compétences.
        </p>
      </div>

      <div className="space-y-4">
        {shifts.map((shift: any) => (
          <div key={shift.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            {shift.status === 'BROADCASTED_GHT' && (
              <div className="absolute top-0 right-0 bg-rose-500/10 text-rose-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                URGENT — HORS SITE
              </div>
            )}
            {shift.status === 'BROADCASTED_LOCAL' && (
              <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                URGENT
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-white mb-1">{shift.postId}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin size={14} className="text-emerald-500" />
                  <span>{shift.facility?.name || 'Site principal'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-3">
                <CalendarIcon size={16} className="text-blue-400" />
                <div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">Date</div>
                  <div className="text-sm font-medium text-slate-300">
                    {format(new Date(shift.start), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-3">
                <Clock size={16} className="text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase">Horaire</div>
                  <div className="text-sm font-medium text-slate-300">
                    {format(new Date(shift.start), 'HH:mm')} - {format(new Date(shift.end), 'HH:mm')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <AlertTriangle size={14} className="text-emerald-500" />
              </div>
              <div className="text-sm text-slate-300 flex-1">
                Score de compatibilité estimé : <span className="font-bold text-emerald-400">Élevé</span>
              </div>
            </div>

            <button 
              onClick={() => navigate(`/marketplace/shifts/${shift.id}`)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Voir les détails & Candidater
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
