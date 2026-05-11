import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { CheckCircle, XCircle, Clock, User, CalendarIcon, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const MarketplacePendingApplications = () => {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['manager-pending-applications'],
    queryFn: async () => {
      const res = await api.get('/marketplace/applications/pending');
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number, action: 'APPROVE' | 'REJECT' }) => {
      const res = await api.patch(`/marketplace/applications/${id}/approve`, { action });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-pending-applications'] });
      // On invalide aussi le cockpit s'il dépend du planning
      queryClient.invalidateQueries({ queryKey: ['manager', 'cockpit'] });
    }
  });

  if (isLoading) {
    return <div className="p-5 animate-pulse text-slate-500">Chargement des candidatures...</div>;
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex items-center justify-center text-slate-500">
        Aucune candidature en attente.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" />
            Candidatures Marketplace à valider
          </h2>
          <p className="text-xs text-slate-500">
            Ces soignants ont postulé à des gardes urgentes. La conformité a été pré-validée par le système.
          </p>
        </div>
        <span className="rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-bold">
          {applications.length} en attente
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {applications.map((app: any) => (
          <div key={app.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <User size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{app.agent.firstName} {app.agent.lastName}</div>
                  <div className="text-xs text-slate-500">Score de matching : <span className="text-emerald-400 font-bold">{app.score}</span></div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CalendarIcon size={14} className="text-slate-500" />
                {format(new Date(app.shift.start), 'dd MMMM yyyy', { locale: fr })}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Clock size={14} className="text-slate-500" />
                {format(new Date(app.shift.start), 'HH:mm')} - {format(new Date(app.shift.end), 'HH:mm')}
              </div>
              <div className="text-xs font-semibold text-blue-300 mt-2">
                Garde : {app.shift.postId} ({app.shift.facility?.name || 'Site principal'})
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button
                onClick={() => approveMutation.mutate({ id: app.id, action: 'REJECT' })}
                disabled={approveMutation.isPending}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-lg text-xs font-bold transition-colors"
              >
                <XCircle size={14} /> Refuser
              </button>
              <button
                onClick={() => approveMutation.mutate({ id: app.id, action: 'APPROVE' })}
                disabled={approveMutation.isPending}
                className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors"
              >
                <CheckCircle size={14} /> Approuver
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
