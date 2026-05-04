import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2, RefreshCw, ShieldCheck, UserRoundPlus, X } from 'lucide-react';
import { fetchAgents } from '../api/agents.api';
import {
  CorrectionAction,
  CorrectionActionCode,
  fetchAlertCorrectionGuidance,
  fetchShiftCorrectionGuidance,
  runManagerCorrectionAction,
} from '../api/planning.api';
import {
  agentsQueryKeys,
  invalidatePlanningResolutionQueries,
  managerQueryKeys,
  queryCacheProfiles,
} from '../api/queryKeys';
import { logUiError } from '../lib/observability';
import { useAuth } from '../store/useAuth';
import { ApiErrorState, SkeletonBlock } from './UIStates';

type Target =
  | { type: 'SHIFT'; id: string | number }
  | { type: 'ALERT'; id: string | number };

interface ManagerGuidedActionsProps {
  target: Target | null;
  compact?: boolean;
  onCompleted?: (message: string) => void;
}

const actionIcon: Record<CorrectionActionCode, React.ElementType> = {
  REASSIGN_SHIFT: UserRoundPlus,
  REQUEST_REPLACEMENT: RefreshCw,
  APPROVE_EXCEPTION: ShieldCheck,
  REVALIDATE_SHIFT: CheckCircle,
  RESOLVE_ALERT: CheckCircle,
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const requiresReason = (action: CorrectionAction): boolean => {
  return (
    Boolean(action.body?.reason?.required) ||
    action.code === 'APPROVE_EXCEPTION'
  );
};

const needsReasonInput = (action: CorrectionAction): boolean => {
  return (
    Boolean(action.body?.reason) ||
    action.code === 'APPROVE_EXCEPTION' ||
    action.code === 'RESOLVE_ALERT'
  );
};

const extractApiMessage = (error: unknown): string => {
  const err = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || err.message || "L'action n'a pas pu aboutir.";
};

export const ManagerGuidedActions = ({
  target,
  compact = false,
  onCompleted,
}: ManagerGuidedActionsProps) => {
  const [selectedAction, setSelectedAction] = useState<CorrectionAction | null>(
    null,
  );
  const [agentId, setAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const queryClient = useQueryClient();
  const user = useAuth((state) => state.user);
  const userPermissions = user?.permissions || [];
  const hasPermission = (permission: string): boolean =>
    user?.role === 'SUPER_ADMIN' || userPermissions.includes(permission);
  const canReadGuidance = hasPermission('planning:read');

  const guidanceQuery = useQuery({
    queryKey: managerQueryKeys.correctionGuidance.target(
      target?.type,
      target?.id,
    ),
    queryFn: () => {
      const currentTarget = target;
      if (!currentTarget) throw new Error('Target missing');
      return currentTarget.type === 'SHIFT'
        ? fetchShiftCorrectionGuidance(currentTarget.id)
        : fetchAlertCorrectionGuidance(currentTarget.id);
    },
    enabled: Boolean(target) && canReadGuidance,
    ...queryCacheProfiles.live,
  });

  const actions = guidanceQuery.data?.availableActions || [];
  const hasReassignAction = actions.some(
    (action) => action.code === 'REASSIGN_SHIFT',
  );

  const agentsQuery = useQuery({
    queryKey: agentsQueryKeys.list('manager-actions'),
    queryFn: fetchAgents,
    enabled: hasReassignAction,
    ...queryCacheProfiles.reference,
  });

  const canRun = (action: CorrectionAction): boolean => {
    return action.permissions.every(hasPermission);
  };

  const visibleActions = useMemo(() => {
    return actions.filter(
      (action) =>
        action.code !== 'REASSIGN_SHIFT' || agentsQuery.data?.length !== 0,
    );
  }, [actions, agentsQuery.data?.length]);

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAction) throw new Error('Action missing');
      if (selectedAction.code === 'REASSIGN_SHIFT' && !agentId) {
        throw new Error('Sélectionnez un agent.');
      }
      if (requiresReason(selectedAction) && !reason.trim()) {
        throw new Error('La justification est obligatoire.');
      }

      return runManagerCorrectionAction(selectedAction, {
        agentId: agentId ? Number(agentId) : undefined,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await invalidatePlanningResolutionQueries(queryClient);
      const label = selectedAction?.label || 'Action';
      setSelectedAction(null);
      setAgentId('');
      setReason('');
      setErrorMessage('');
      setSuccessMessage(`${label} effectuée.`);
      onCompleted?.(`${label} effectuée.`);
    },
    onError: (error) => {
      logUiError(error, {
        message: 'Manager guided action failed',
        actionCode: selectedAction?.code,
        targetType: target?.type,
        targetId: target?.id,
      });
      setSuccessMessage('');
      setErrorMessage(extractApiMessage(error));
    },
  });

  useEffect(() => {
    if (!selectedAction || actionMutation.isPending) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedAction(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actionMutation.isPending, selectedAction]);

  if (!target || !canReadGuidance) return null;

  return (
    <div
      className={
        compact
          ? 'space-y-3'
          : 'rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-4'
      }
    >
      {!compact && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Actions guidées
          </p>
          <p className="text-sm text-slate-400">
            {guidanceQuery.data?.problem.title || 'Chargement de la guidance'}
          </p>
        </div>
      )}

      {guidanceQuery.isLoading && (
        <div className="space-y-2" role="status" aria-label="Guidance en cours de chargement">
          <SkeletonBlock className="h-10" />
          <SkeletonBlock className="h-10" />
        </div>
      )}

      {guidanceQuery.isError && (
        <ApiErrorState
          title="Actions indisponibles"
          message={extractApiMessage(guidanceQuery.error)}
          onRetry={() => guidanceQuery.refetch()}
          isRetrying={guidanceQuery.isFetching}
          compact
        />
      )}

      {successMessage && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-300" />
          {successMessage}
        </div>
      )}

      {guidanceQuery.data && (
        <>
          {guidanceQuery.data.reasons.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {guidanceQuery.data.reasons.map((reasonCode) => (
                <span
                  key={reasonCode}
                  className="rounded-full border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300"
                >
                  {reasonCode}
                </span>
              ))}
            </div>
          )}

          {visibleActions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune action disponible pour cet élément.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {visibleActions.map((action) => {
                const Icon = actionIcon[action.code] || CheckCircle;
                const allowed = canRun(action);
                return (
                  <button
                    key={action.code}
                    type="button"
                    disabled={!allowed}
                    onClick={() => {
                      setSelectedAction(action);
                      setErrorMessage('');
                      setSuccessMessage('');
                      setAgentId('');
                      setReason('');
                    }}
                    aria-label={`${action.label}${!allowed ? `, permission requise: ${action.permissions.join(', ')}` : ''}`}
                    className={`flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-3 text-left transition-colors hover:border-blue-500/60 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}
                    title={
                      !allowed
                        ? `Permission requise: ${action.permissions.join(', ')}`
                        : action.description
                    }
                  >
                    <Icon size={18} className="shrink-0 text-blue-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-bold text-slate-100">
                        {action.label}
                      </span>
                      {!compact && (
                        <span className="block break-words text-xs text-slate-500">
                          {action.description}
                        </span>
                      )}
                      {!allowed && (
                        <span className="mt-1 block text-[11px] font-semibold text-amber-300">
                          Permission requise: {action.permissions.join(', ')}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => !actionMutation.isPending && setSelectedAction(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-guided-action-title"
            aria-describedby="manager-guided-action-description"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-800 p-5">
              <div>
                <h3 id="manager-guided-action-title" className="text-lg font-bold text-white">
                  {selectedAction.label}
                </h3>
                <p id="manager-guided-action-description" className="mt-1 text-sm text-slate-400">
                  {selectedAction.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                disabled={actionMutation.isPending}
                aria-label="Fermer l’action guidée"
                className={`rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white ${focusRing}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {selectedAction.code === 'REASSIGN_SHIFT' && (
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Nouvel agent
                  </span>
                  <select
                    value={agentId}
                    onChange={(event) => setAgentId(event.target.value)}
                    disabled={
                      agentsQuery.isFetching || actionMutation.isPending
                    }
                    aria-invalid={selectedAction.code === 'REASSIGN_SHIFT' && !agentId}
                    className={`w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-blue-500 ${focusRing}`}
                  >
                    <option value="">
                      {agentsQuery.isFetching
                        ? 'Chargement des agents...'
                        : 'Sélectionner un agent'}
                    </option>
                    {(agentsQuery.data || []).map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.nom ||
                          `${agent.firstName || ''} ${agent.lastName || ''}`.trim() ||
                          agent.email}
                      </option>
                    ))}
                  </select>
                  {agentsQuery.isError && (
                    <ApiErrorState
                      message={extractApiMessage(agentsQuery.error)}
                      onRetry={() => agentsQuery.refetch()}
                      retryLabel="Recharger les agents"
                      isRetrying={agentsQuery.isFetching}
                      compact
                    />
                  )}
                </label>
              )}

              {needsReasonInput(selectedAction) && (
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Justification
                    {requiresReason(selectedAction) ? ' obligatoire' : ''}
                  </span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={actionMutation.isPending}
                    rows={4}
                    aria-invalid={requiresReason(selectedAction) && !reason.trim()}
                    aria-required={requiresReason(selectedAction)}
                    className={`w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-blue-500 ${focusRing}`}
                    placeholder="Documenter la décision manager"
                  />
                </label>
              )}

              {errorMessage && (
                <ApiErrorState
                  title="Action non effectuée"
                  message={errorMessage}
                  onRetry={() => actionMutation.mutate()}
                  retryLabel="Réessayer l'action"
                  isRetrying={actionMutation.isPending}
                  compact
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                disabled={actionMutation.isPending}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  actionMutation.isPending ||
                  (selectedAction.code === 'REASSIGN_SHIFT' && !agentId) ||
                  (requiresReason(selectedAction) && !reason.trim())
                }
                onClick={() => actionMutation.mutate()}
                className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
              >
                {actionMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {actionMutation.isPending ? 'Traitement' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
