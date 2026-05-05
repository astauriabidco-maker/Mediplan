import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import React, { FormEvent, useMemo, useState } from 'react';
import {
  productionReadinessApi,
  ProductionDecision,
  ProductionGateKey,
  ProductionGateStatus,
  ProductionGateStatusValue,
  ProductionSignoffHistory,
  ProductionSignoff,
  ProductionSignoffKey,
  ProductionSignoffStatus,
  UpsertProductionGatePayload,
  UpsertProductionSignoffPayload,
} from '../api/production-readiness.api';
import {
  ApiErrorState,
  EmptyState,
  PageSkeleton,
} from '../components/UIStates';
import { cn } from '../utils/cn';

const readinessQueryKey = ['production-readiness', 'decision'] as const;
const signoffHistoryQueryKey = [
  'production-readiness',
  'signoffs',
  'history',
] as const;

const signoffLabels: Record<ProductionSignoffKey, string> = {
  HR: 'RH',
  SECURITY: 'Sécurité',
  OPERATIONS: 'Opérations',
  TECHNICAL: 'Technique',
  DIRECTION: 'Direction',
};

const statusLabels: Record<ProductionSignoffStatus, string> = {
  PENDING: 'En attente',
  GO: 'GO',
  NO_GO: 'NO_GO',
};

const gateStatusLabels: Record<ProductionGateStatusValue, string> = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN',
};

const toneByStatus = {
  PROD_READY: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  PROD_NO_GO: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
} satisfies Record<ProductionDecision['status'], string>;

const cleanPayload = (payload: UpsertProductionSignoffPayload) =>
  Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, String(value ?? '').trim()])
      .filter(([, value]) => value),
  ) as UpsertProductionSignoffPayload;

const cleanGatePayload = (payload: UpsertProductionGatePayload) =>
  Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, String(value ?? '').trim()])
      .filter(([, value]) => value),
  ) as UpsertProductionGatePayload;

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Non daté';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

type ProofAssessment = {
  proofUrl: string;
  proofLabel: string;
  comment: string;
  isProofMissing: boolean;
  isProofUnavailable: boolean;
  isComplete: boolean;
  completionLabel: string;
  completionReason: string;
};

const GateCard = ({
  gate,
  isSaving,
  onSubmit,
}: {
  gate: ProductionGateStatus;
  isSaving: boolean;
  onSubmit: (
    key: ProductionGateKey,
    payload: UpsertProductionGatePayload,
  ) => Promise<void>;
}) => {
  const [status, setStatus] = useState<ProductionGateStatusValue>(gate.status);
  const [source, setSource] = useState(gate.source ?? '');
  const [evidenceUrl, setEvidenceUrl] = useState(gate.evidenceUrl ?? '');
  const [comment, setComment] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (evidenceUrl.trim() && !isValidHttpUrl(evidenceUrl.trim())) {
      setValidationError('La preuve gate doit être une URL http(s).');
      return;
    }

    await onSubmit(
      gate.key,
      cleanGatePayload({
        status,
        source,
        evidenceUrl,
        comment,
      }),
    );
  };

  return (
    <form
      aria-label={`Gate ${gate.key}`}
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-slate-800 bg-slate-900 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-white">{gate.key}</span>
        <span
          className={cn(
            'rounded-md border px-2 py-1 text-xs font-black',
            status === 'PASSED'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : status === 'FAILED'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-100',
          )}
        >
          {status}
        </span>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Statut
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ProductionGateStatusValue)
          }
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {Object.entries(gateStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Source
        <input
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>

      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Preuve URL
        <input
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>

      {gate.evidenceUrl && isValidHttpUrl(gate.evidenceUrl) && (
        <a
          href={gate.evidenceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 break-all text-xs font-bold text-emerald-200 underline underline-offset-4"
        >
          <ExternalLink size={12} className="shrink-0" />
          Preuve gate
        </a>
      )}

      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Commentaire
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>

      <p className="text-xs text-slate-500">
        Dernier contrôle: {formatDateTime(gate.checkedAt)}
      </p>

      {validationError && (
        <p
          role="alert"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
        >
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-white disabled:cursor-wait disabled:opacity-70"
      >
        <ShieldCheck size={16} />
        Enregistrer le gate
      </button>
    </form>
  );
};

const AuditHistoryPanel = ({
  history,
}: {
  history?: ProductionSignoffHistory;
}) => {
  const entries = history?.entries ?? [];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Historique audit</h2>
          <p className="text-sm text-slate-500">
            Signoffs production issus de la chaîne d'audit.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {entries.length} événement{entries.length > 1 ? 's' : ''}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aucun événement de signoff production.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {entries.slice(0, 8).map((entry) => (
            <li
              key={`${entry.auditLogId}-${entry.eventHash ?? entry.decidedAt}`}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
            >
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-bold text-white">
                  {signoffLabels[entry.key]}: {entry.status ?? 'N/A'}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(entry.decidedAt)}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Acteur: {entry.actorName ?? `#${entry.actorId}`} · Chaîne:{' '}
                {entry.chainSequence ?? 'N/A'}
              </p>
              {entry.proofUrl && (
                <a
                  href={entry.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-xs font-bold text-emerald-200 underline underline-offset-4"
                >
                  <ExternalLink size={12} className="shrink-0" />
                  {entry.proofLabel || entry.proofUrl}
                </a>
              )}
              {entry.comment && (
                <p className="mt-2 text-xs text-slate-300">
                  Commentaire: {entry.comment}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

const assessSignoffProof = ({
  status,
  signerName,
  proofUrl,
  proofLabel,
  comment,
}: {
  status: ProductionSignoffStatus;
  signerName?: string | null;
  proofUrl?: string | null;
  proofLabel?: string | null;
  comment?: string | null;
}): ProofAssessment => {
  const trimmedSignerName = String(signerName ?? '').trim();
  const trimmedProofUrl = String(proofUrl ?? '').trim();
  const trimmedProofLabel = String(proofLabel ?? '').trim();
  const trimmedComment = String(comment ?? '').trim();
  const isProofMissing = status === 'GO' && !trimmedProofUrl;
  const isProofUnavailable =
    Boolean(trimmedProofUrl) && !isValidHttpUrl(trimmedProofUrl);

  if (status === 'PENDING') {
    return {
      proofUrl: trimmedProofUrl,
      proofLabel: trimmedProofLabel,
      comment: trimmedComment,
      isProofMissing,
      isProofUnavailable,
      isComplete: false,
      completionLabel: 'Incomplet',
      completionReason: 'Décision en attente',
    };
  }

  if (!trimmedSignerName) {
    return {
      proofUrl: trimmedProofUrl,
      proofLabel: trimmedProofLabel,
      comment: trimmedComment,
      isProofMissing,
      isProofUnavailable,
      isComplete: false,
      completionLabel: 'Incomplet',
      completionReason: 'Signataire manquant',
    };
  }

  if (isProofMissing) {
    return {
      proofUrl: trimmedProofUrl,
      proofLabel: trimmedProofLabel,
      comment: trimmedComment,
      isProofMissing,
      isProofUnavailable,
      isComplete: false,
      completionLabel: 'Incomplet',
      completionReason: 'Preuve manquante',
    };
  }

  if (isProofUnavailable) {
    return {
      proofUrl: trimmedProofUrl,
      proofLabel: trimmedProofLabel,
      comment: trimmedComment,
      isProofMissing,
      isProofUnavailable,
      isComplete: false,
      completionLabel: 'Incomplet',
      completionReason: 'Preuve non consultable',
    };
  }

  return {
    proofUrl: trimmedProofUrl,
    proofLabel: trimmedProofLabel,
    comment: trimmedComment,
    isProofMissing,
    isProofUnavailable,
    isComplete: true,
    completionLabel: 'Complet',
    completionReason:
      status === 'GO' ? 'GO signé avec preuve consultable' : 'NO_GO documenté',
  };
};

const SignoffCard = ({
  signoffKey,
  signoff,
  isSaving,
  onSubmit,
}: {
  signoffKey: ProductionSignoffKey;
  signoff?: ProductionSignoff;
  isSaving: boolean;
  onSubmit: (
    key: ProductionSignoffKey,
    payload: UpsertProductionSignoffPayload,
  ) => Promise<void>;
}) => {
  const [status, setStatus] = useState<ProductionSignoffStatus>(
    signoff?.status ?? 'PENDING',
  );
  const [signerName, setSignerName] = useState(signoff?.signerName ?? '');
  const [signerRole, setSignerRole] = useState(signoff?.signerRole ?? '');
  const [proofUrl, setProofUrl] = useState(signoff?.proofUrl ?? '');
  const [proofLabel, setProofLabel] = useState(signoff?.proofLabel ?? '');
  const [comment, setComment] = useState(signoff?.comment ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const proofAssessment = assessSignoffProof({
    status,
    signerName,
    proofUrl,
    proofLabel,
    comment,
  });
  const proofDisplayLabel =
    proofAssessment.proofLabel || proofAssessment.proofUrl || 'Preuve';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (status === 'GO' && !proofUrl.trim()) {
      setValidationError('Une preuve URL est obligatoire pour un GO.');
      return;
    }

    if (proofUrl.trim() && !isValidHttpUrl(proofUrl.trim())) {
      setValidationError('La preuve doit être une URL http(s) consultable.');
      return;
    }

    if (status !== 'PENDING' && !signerName.trim()) {
      setValidationError('Le signataire est obligatoire pour GO/NO_GO.');
      return;
    }

    await onSubmit(
      signoffKey,
      cleanPayload({
        status,
        signerName,
        signerRole,
        proofUrl,
        proofLabel,
        comment,
      }),
    );
  };

  return (
    <form
      aria-label={`Signoff ${signoffKey}`}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {signoffLabels[signoffKey]}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Statut courant: {statusLabels[signoff?.status ?? 'PENDING']}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-md border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
            {signoffKey}
          </span>
          <span
            className={cn(
              'rounded-md border px-2 py-1 text-xs font-black',
              proofAssessment.isComplete
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-100',
            )}
          >
            {proofAssessment.completionLabel}
          </span>
        </div>
      </div>

      <div
        aria-label={`Complétude ${signoffKey}`}
        className={cn(
          'space-y-2 rounded-md border px-3 py-2 text-sm',
          proofAssessment.isComplete
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-50'
            : 'border-amber-500/20 bg-amber-500/5 text-amber-50',
        )}
      >
        <div className="flex items-start gap-2">
          {proofAssessment.isComplete ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          )}
          <div>
            <p className="font-bold">{proofAssessment.completionReason}</p>
            {proofAssessment.isProofMissing && (
              <p className="mt-1 text-xs text-amber-100/80">
                Une preuve URL est requise pour valider un GO.
              </p>
            )}
            {proofAssessment.isProofUnavailable && (
              <p className="mt-1 text-xs text-amber-100/80">
                La preuve renseignée n'est pas consultable en HTTP(S).
              </p>
            )}
          </div>
        </div>

        {proofAssessment.proofUrl ? (
          proofAssessment.isProofUnavailable ? (
            <p className="break-all text-xs text-amber-100/80">
              {proofAssessment.proofUrl}
            </p>
          ) : (
            <a
              href={proofAssessment.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 break-all text-xs font-bold text-emerald-200 underline underline-offset-4"
            >
              <ExternalLink size={12} className="shrink-0" />
              {proofDisplayLabel}
            </a>
          )
        ) : (
          <p className="text-xs text-slate-400">Aucune preuve URL.</p>
        )}

        {proofAssessment.comment ? (
          <p className="text-xs text-slate-300">
            Commentaire: {proofAssessment.comment}
          </p>
        ) : (
          <p className="text-xs text-slate-500">Aucun commentaire.</p>
        )}
      </div>

      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Décision
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ProductionSignoffStatus)
          }
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="PENDING">En attente</option>
          <option value="GO">GO</option>
          <option value="NO_GO">NO_GO</option>
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
          Signataire
          <input
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
          Rôle
          <input
            value={signerRole}
            onChange={(event) => setSignerRole(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Preuve URL
        <input
          value={proofUrl}
          onChange={(event) => setProofUrl(event.target.value)}
          aria-invalid={Boolean(validationError && status === 'GO')}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
          Libellé preuve
          <input
            value={proofLabel}
            onChange={(event) => setProofLabel(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
          Commentaire
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      {validationError && (
        <p
          role="alert"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
        >
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-70"
      >
        <ShieldCheck size={16} />
        Enregistrer le signoff
      </button>
    </form>
  );
};

export const ReleaseReadinessPage = () => {
  const queryClient = useQueryClient();
  const decisionQuery = useQuery({
    queryKey: readinessQueryKey,
    queryFn: () => productionReadinessApi.getDecision(),
    staleTime: 15_000,
  });
  const historyQuery = useQuery({
    queryKey: signoffHistoryQueryKey,
    queryFn: () => productionReadinessApi.getSignoffHistory(),
    staleTime: 15_000,
  });

  const signoffMutation = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: ProductionSignoffKey;
      payload: UpsertProductionSignoffPayload;
    }) => productionReadinessApi.upsertSignoff(key, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: readinessQueryKey }),
        queryClient.invalidateQueries({ queryKey: signoffHistoryQueryKey }),
      ]),
  });

  const gateMutation = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: ProductionGateKey;
      payload: UpsertProductionGatePayload;
    }) => productionReadinessApi.upsertGate(key, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: readinessQueryKey }),
        queryClient.invalidateQueries({ queryKey: signoffHistoryQueryKey }),
      ]),
  });

  const signoffsByKey = useMemo(() => {
    return new Map(
      (decisionQuery.data?.signoffs ?? []).map((signoff) => [
        signoff.key,
        signoff,
      ]),
    );
  }, [decisionQuery.data?.signoffs]);

  if (decisionQuery.isLoading) {
    return <PageSkeleton title="Chargement release readiness" rows={4} />;
  }

  if (decisionQuery.isError) {
    return (
      <ApiErrorState
        title="Release readiness indisponible"
        message="Impossible de charger la décision de production."
        onRetry={() => decisionQuery.refetch()}
        isRetrying={decisionQuery.isFetching}
      />
    );
  }

  const decision = decisionQuery.data;
  const requiredSignoffs = decision?.signoffSummary.required ?? [];
  const gates = decision
    ? [decision.gates.freeze, ...decision.gates.checks]
    : [];

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 pb-16">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Release readiness
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Décision production
          </h1>
        </div>
        {decision && (
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-black',
              toneByStatus[decision.status],
            )}
          >
            {decision.status === 'PROD_READY' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            {decision.status}
          </div>
        )}
      </header>

      {decision?.status === 'PROD_NO_GO' && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="text-lg font-bold text-amber-100">Blockers</h2>
          {decision.blockers.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-amber-50">
              {decision.blockers.map((blocker) => (
                <li key={blocker} className="flex gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-100/80">
              La décision est bloquée par un prérequis non détaillé.
            </p>
          )}
        </section>
      )}

      {decision?.status === 'PROD_READY' && (
        <EmptyState
          title="PROD_READY"
          message="Tous les signoffs et gates obligatoires sont validés."
          icon={CheckCircle2}
          tone="emerald"
          compact
        />
      )}

      <div>
        <h2 className="text-lg font-bold text-white">Matrice signoffs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chaque domaine obligatoire doit être signé GO avec une preuve
          exploitable.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {requiredSignoffs.map((key) => (
          <SignoffCard
            key={`${key}-${signoffsByKey.get(key)?.status ?? 'PENDING'}`}
            signoffKey={key}
            signoff={signoffsByKey.get(key)}
            isSaving={signoffMutation.isPending}
            onSubmit={(signoffKey, payload) =>
              signoffMutation
                .mutateAsync({ key: signoffKey, payload })
                .then(() => undefined)
            }
          />
        ))}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h2 className="text-lg font-bold text-white">Gates production</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gates.map((gate) => (
            <GateCard
              key={`${gate.key}-${gate.source}`}
              gate={gate}
              isSaving={gateMutation.isPending}
              onSubmit={(gateKey, payload) =>
                gateMutation
                  .mutateAsync({ key: gateKey, payload })
                  .then(() => undefined)
              }
            />
          ))}
        </div>
      </section>

      <AuditHistoryPanel history={historyQuery.data} />
    </main>
  );
};
