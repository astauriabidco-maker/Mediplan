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
  ProductionSignoff,
  ProductionSignoffKey,
  ProductionSignoffStatus,
  UpsertProductionSignoffPayload,
} from '../api/production-readiness.api';
import {
  ApiErrorState,
  EmptyState,
  PageSkeleton,
} from '../components/UIStates';
import { cn } from '../utils/cn';

const readinessQueryKey = ['production-readiness', 'decision'] as const;

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

const toneByStatus = {
  PROD_READY: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  PROD_NO_GO: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
} satisfies Record<ProductionDecision['status'], string>;

const cleanPayload = (payload: UpsertProductionSignoffPayload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => String(value ?? '').trim()),
  ) as UpsertProductionSignoffPayload;

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (status === 'GO' && !proofUrl.trim()) {
      setValidationError('Une preuve URL est obligatoire pour un GO.');
      return;
    }

    if (status === 'GO' && !isValidHttpUrl(proofUrl.trim())) {
      setValidationError('La preuve GO doit être une URL http(s) valide.');
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
        <span className="rounded-md border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300">
          {signoffKey}
        </span>
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
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
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

  const signoffMutation = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: ProductionSignoffKey;
      payload: UpsertProductionSignoffPayload;
    }) => productionReadinessApi.upsertSignoff(key, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: readinessQueryKey }),
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
            <div
              key={`${gate.key}-${gate.source}`}
              className="rounded-md border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-white">{gate.key}</span>
                <span className="text-xs font-black text-slate-300">
                  {gate.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <ExternalLink size={12} />
                {gate.source}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
