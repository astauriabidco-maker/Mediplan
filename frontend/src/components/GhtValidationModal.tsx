import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  XCircle,
  ShieldAlert,
  Loader2,
  Building,
} from 'lucide-react';
import {
  fetchShiftApplications,
  approveGhtApplication,
  rejectGhtApplication,
} from '../api/planning.api';
import { format } from 'date-fns/format';
import { fr } from 'date-fns/locale/fr';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GhtValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GhtValidationModal = ({
  isOpen,
  onClose,
  onSuccess,
}: GhtValidationModalProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | number | null>(
    null,
  );

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await fetchShiftApplications();
      // Filter strictly those pending GHT approval
      const pendingGht = data.filter(
        (app) => app.status === 'PENDING_GHT_APPROVAL',
      );
      setApplications(pendingGht);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadApplications();
    }
  }, [isOpen]);

  const handleAction = async (
    id: string | number,
    action: 'approve' | 'reject',
  ) => {
    setProcessingId(id);
    try {
      if (action === 'approve') {
        await approveGhtApplication(id);
      } else {
        await rejectGhtApplication(id);
      }
      await loadApplications();
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la validation');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 text-purple-400">
            <ShieldAlert size={28} />
            <h2 className="text-xl font-bold">Validations RH (GHT)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center p-12 text-slate-400 p-12 flex flex-col items-center">
              <Building size={48} className="text-slate-700 mb-4" />
              <p className="text-lg">
                Aucune demande de déplacement inter-sites en attente.
              </p>
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <h3 className="font-bold text-white text-lg">
                    Agent : {app.agent?.nom} {app.agent?.firstName}
                  </h3>
                  <div className="text-sm text-slate-400 flex flex-wrap gap-2">
                    <span className="bg-slate-700/50 px-2 py-1 rounded">
                      {format(
                        new Date(app.shift?.start),
                        "EEEE dd MMM yyyy 'à' HH:mm",
                        { locale: fr },
                      )}
                    </span>
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded flex items-center gap-1">
                      <ShieldAlert size={14} /> Déplacement Extérieur (Score{' '}
                      {app.score})
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    Du Poste :{' '}
                    <span className="text-white">
                      Site {app.agent?.facilityId}
                    </span>{' '}
                    → Vers :{' '}
                    <span className="text-white">
                      Site {app.shift?.facilityId} (
                      {app.shift?.facility?.name || 'Inconnu'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleAction(app.id, 'reject')}
                    disabled={processingId === app.id}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-600 rounded-lg transition-colors"
                  >
                    <XCircle size={18} />
                    Refuser
                  </button>
                  <button
                    onClick={() => handleAction(app.id, 'approve')}
                    disabled={processingId === app.id}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg shadow-purple-900/50 transition-all',
                      processingId === app.id && 'opacity-75 cursor-wait',
                    )}
                  >
                    {processingId === app.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    Autoriser
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
