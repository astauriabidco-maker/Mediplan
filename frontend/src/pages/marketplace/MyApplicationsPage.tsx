import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Clock, CalendarIcon, MapPin, CheckCircle, XCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const MyApplicationsPage = () => {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const res = await api.get('/marketplace/applications');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Chargement de vos candidatures...</p>
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-2">
          <Clock size={32} />
        </div>
        <h3 className="text-lg font-medium text-white">Aucune candidature</h3>
        <p className="text-slate-400 max-w-xs">
          Vous n'avez pas encore postulé à des remplacements.
        </p>
      </div>
    );
  }

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'PENDING':
        return <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-xs font-bold"><Loader size={12} className="animate-spin" /> En attente</div>;
      case 'ACCEPTED':
        return <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle size={12} /> Acceptée</div>;
      case 'REJECTED':
        return <div className="flex items-center gap-1 text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-xs font-bold"><XCircle size={12} /> Refusée</div>;
      case 'PENDING_GHT':
        return <div className="flex items-center gap-1 text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full text-xs font-bold"><Loader size={12} className="animate-spin" /> Validation GHT</div>;
      default:
        return <div className="text-slate-500 text-xs">{status}</div>;
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Mes Candidatures</h1>
        <p className="text-slate-400">
          Suivez l'état de vos demandes de remplacement.
        </p>
      </div>

      <div className="space-y-4">
        {applications.map((app: any) => (
          <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-white mb-1">{app.shift.postId}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin size={14} className="text-emerald-500" />
                  <span>{app.shift.facility?.name || 'Site principal'}</span>
                </div>
              </div>
              {getStatusDisplay(app.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-500" />
                <span className="text-sm text-slate-300">
                  {format(new Date(app.shift.start), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-500" />
                <span className="text-sm text-slate-300">
                  {format(new Date(app.shift.start), 'HH:mm')} - {format(new Date(app.shift.end), 'HH:mm')}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Postulé le {format(new Date(app.appliedAt), 'dd MMM à HH:mm', { locale: fr })}
              </span>
              {app.score > 0 && (
                <span className="text-emerald-500 font-medium">Score estimé : {app.score}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
