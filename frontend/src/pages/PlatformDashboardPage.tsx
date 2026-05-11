import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  Globe2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  KeyRound,
  Settings,
} from 'lucide-react';
import { platformApi } from '../api/platform.api';
import type {
  CreatePlatformTenantPayload,
  CreateTenantAdminPayload,
  PlatformSettings,
  PlatformTenant,
} from '../api/platform.api';
import { useAuth } from '../store/useAuth';

const platformQueryKeys = {
  tenants: ['platform', 'tenants'] as const,
  summary: ['platform', 'summary'] as const,
  audit: ['platform', 'audit'] as const,
  tenantUsers: (tenantId: string) => ['platform', 'tenant-users', tenantId] as const,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Non disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Non disponible';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const PlatformDashboardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, impersonatedTenantId, setImpersonatedTenantId } = useAuth();
  const section = location.pathname.split('/')[2] ?? 'overview';
  const showOverview = section === 'overview';
  const showTenants = section === 'overview' || section === 'tenants';
  const showAudit = section === 'overview' || section === 'audit';
  const showSecurity = section === 'overview' || section === 'security';
  const showSettings = section === 'overview' || section === 'settings';
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState<CreatePlatformTenantPayload>({
    id: '',
    name: '',
    region: 'CM',
    contactEmail: '',
    isActive: true,
  });
  const [adminForm, setAdminForm] = useState<CreateTenantAdminPayload>({
    email: '',
    fullName: '',
    password: '',
    role: 'ADMIN',
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [platformUserForm, setPlatformUserForm] = useState({
    email: '',
    fullName: '',
    password: '',
  });
  const [settingsDraft, setSettingsDraft] = useState<PlatformSettings | null>(
    null,
  );

  const tenantsQuery = useQuery({
    queryKey: platformQueryKeys.tenants,
    queryFn: platformApi.tenants,
  });
  const summaryQuery = useQuery({
    queryKey: platformQueryKeys.summary,
    queryFn: platformApi.summary,
  });

  const tenants = tenantsQuery.data ?? [];
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0],
    [selectedTenantId, tenants],
  );
  const summary = summaryQuery.data;
  const auditQuery = useQuery({
    queryKey: platformQueryKeys.audit,
    queryFn: platformApi.auditEntries,
    enabled: showAudit,
  });
  const platformUsersQuery = useQuery({
    queryKey: ['platform', 'users'],
    queryFn: platformApi.platformUsers,
    enabled: showSecurity,
  });
  const settingsQuery = useQuery({
    queryKey: ['platform', 'settings'],
    queryFn: platformApi.settings,
    enabled: showSettings,
  });
  const monitoringQuery = useQuery({
    queryKey: ['platform', 'monitoring'],
    queryFn: platformApi.monitoring,
    enabled: showOverview || showTenants,
  });
  const tenantUsersQuery = useQuery({
    queryKey: platformQueryKeys.tenantUsers(selectedTenant?.id ?? 'none'),
    queryFn: () => platformApi.tenantUsers(selectedTenant!.id),
    enabled: Boolean(showTenants && selectedTenant?.id),
  });
  const activeTenantCount = useMemo(
    () => tenants.filter((tenant) => tenant.isActive).length,
    [tenants],
  );

  const refreshPlatform = () => {
    void queryClient.invalidateQueries({ queryKey: platformQueryKeys.tenants });
    void queryClient.invalidateQueries({ queryKey: platformQueryKeys.audit });
    void queryClient.invalidateQueries({ queryKey: ['platform', 'users'] });
    void queryClient.invalidateQueries({ queryKey: ['platform', 'settings'] });
    void queryClient.invalidateQueries({ queryKey: ['platform', 'monitoring'] });
    if (selectedTenant?.id) {
      void queryClient.invalidateQueries({
        queryKey: platformQueryKeys.tenantUsers(selectedTenant.id),
      });
    }
  };

  const createTenantMutation = useMutation({
    mutationFn: platformApi.createTenant,
    onSuccess: (tenant) => {
      setFeedback(`Tenant ${tenant.id} créé.`);
      setSelectedTenantId(tenant.id);
      setTenantForm({
        id: '',
        name: '',
        region: 'CM',
        contactEmail: '',
        isActive: true,
      });
      refreshPlatform();
    },
  });
  const suspendTenantMutation = useMutation({
    mutationFn: platformApi.suspendTenant,
    onSuccess: (tenant) => {
      setFeedback(`Tenant ${tenant.id} suspendu.`);
      refreshPlatform();
    },
  });
  const activateTenantMutation = useMutation({
    mutationFn: platformApi.activateTenant,
    onSuccess: (tenant) => {
      setFeedback(`Tenant ${tenant.id} réactivé.`);
      refreshPlatform();
    },
  });
  const createAdminMutation = useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: CreateTenantAdminPayload;
    }) => platformApi.createTenantAdmin(tenantId, payload),
    onSuccess: (admin) => {
      setFeedback(`Invitation envoyée à ${admin.email}.`);
      setAdminForm({
        email: '',
        fullName: '',
        password: '',
        role: 'ADMIN',
      });
      refreshPlatform();
    },
  });
  const createPlatformUserMutation = useMutation({
    mutationFn: platformApi.createPlatformUser,
    onSuccess: (platformUser) => {
      setFeedback(
        platformUser.initialPassword
          ? `Utilisateur plateforme ${platformUser.email} créé. Mot de passe temporaire: ${platformUser.initialPassword}`
          : `Utilisateur plateforme ${platformUser.email} créé.`,
      );
      setPlatformUserForm({ email: '', fullName: '', password: '' });
      refreshPlatform();
    },
  });
  const disablePlatformUserMutation = useMutation({
    mutationFn: platformApi.disablePlatformUser,
    onSuccess: (platformUser) => {
      setFeedback(`${platformUser.email} désactivé.`);
      refreshPlatform();
    },
  });
  const reactivatePlatformUserMutation = useMutation({
    mutationFn: platformApi.reactivatePlatformUser,
    onSuccess: (platformUser) => {
      setFeedback(`${platformUser.email} réactivé.`);
      refreshPlatform();
    },
  });
  const updateSettingsMutation = useMutation({
    mutationFn: platformApi.updateSettings,
    onSuccess: (settings) => {
      setFeedback('Paramètres plateforme mis à jour.');
      setSettingsDraft(settings);
      refreshPlatform();
    },
  });

  const enterTenant = (tenantId: string) => {
    setImpersonatedTenantId(tenantId);
    navigate('/dashboard');
  };

  const returnToTenant = () => {
    navigate('/dashboard');
  };

  const submitTenant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    createTenantMutation.mutate({
      ...tenantForm,
      id: tenantForm.id || undefined,
      contactEmail: tenantForm.contactEmail || undefined,
    });
  };

  const submitAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTenant) return;
    setFeedback(null);
    createAdminMutation.mutate({
      tenantId: selectedTenant.id,
      payload: {
        ...adminForm,
        password: undefined,
      },
    });
  };

  const mutationError =
    createTenantMutation.error ||
    suspendTenantMutation.error ||
    activateTenantMutation.error ||
    createAdminMutation.error ||
    createPlatformUserMutation.error ||
    disablePlatformUserMutation.error ||
    reactivatePlatformUserMutation.error ||
    updateSettingsMutation.error;
  const effectiveSettings = settingsDraft ?? settingsQuery.data ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Console plateforme
              </p>
              <h1 className="mt-2 text-3xl font-black text-white">
                {section === 'overview'
                  ? 'Administration plateforme Mediplan'
                  : platformSectionTitle(section)}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Connecté en supervision globale. Les vues de cette console sont
                réservées au rôle PLATFORM_SUPER_ADMIN et isolées des admins
                tenant.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            <Metric label="Rôle" value={user?.role ?? '-'} />
            <Metric label="Tenant racine" value={user?.tenantId ?? '-'} />
            <Metric label="Tenants actifs" value={activeTenantCount} />
            <Metric label="Tenants total" value={tenants.length} />
          </div>
        </div>
      </section>

      {impersonatedTenantId && (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-400/15 p-2 text-amber-200">
              <ExternalLink size={20} />
            </div>
            <div>
              <h2 className="font-bold text-amber-100">
                Session tenant active: {impersonatedTenantId}
              </h2>
              <p className="text-sm text-amber-100/70">
                Vous pouvez revenir au tenant courant ou quitter l'impersonation
                depuis l'en-tête.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={returnToTenant}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-amber-200"
          >
            Retour tenant
            <ArrowRight size={16} />
          </button>
        </section>
      )}

      {(feedback || mutationError) && (
        <section
          className={
            mutationError
              ? 'rounded-xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm font-bold text-rose-200'
              : 'rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-200'
          }
        >
          {mutationError
            ? readableError(mutationError)
            : feedback}
        </section>
      )}

      {showOverview && (
        <section className="grid gap-4 md:grid-cols-3">
          <PlatformModuleCard
            icon={Building2}
            title="Tenants"
            description="Créer, superviser et ouvrir les établissements."
            cta="Gérer les tenants"
            onClick={() => navigate('/platform/tenants')}
          />
          <PlatformModuleCard
            icon={FileText}
            title="Audit & impersonation"
            description="Suivre les entrées tenant et les actions sensibles."
            cta="Voir les audits"
            onClick={() => navigate('/platform/audit')}
          />
          <PlatformModuleCard
            icon={KeyRound}
            title="Sécurité"
            description="Contrôler les accès plateforme et les permissions."
            cta="Ouvrir sécurité"
            onClick={() => navigate('/platform/security')}
          />
        </section>
      )}

      {(showTenants || showOverview) && (
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Tenants disponibles
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Entrée rapide vers un établissement sans passer par les
                paramètres tenant.
              </p>
            </div>
            {tenantsQuery.isFetching && (
              <Loader2 className="animate-spin text-slate-500" size={20} />
            )}
          </div>

          {tenantsQuery.isError ? (
            <StatePanel
              icon={AlertTriangle}
              title="Tenants indisponibles"
              message="Impossible de charger l'annuaire plateforme."
            />
          ) : tenantsQuery.isLoading ? (
            <StatePanel
              icon={Loader2}
              title="Chargement des tenants"
              message="Lecture de l'annuaire des établissements."
              spinning
            />
          ) : tenants.length === 0 ? (
            <StatePanel
              icon={CircleSlash}
              title="Aucun tenant"
              message="Aucun établissement n'est disponible dans l'annuaire plateforme."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tenants.map((tenant) => (
                <article
                  key={tenant.id}
                  className={
                    selectedTenant?.id === tenant.id
                      ? 'rounded-xl border border-emerald-400/40 bg-slate-950 p-4'
                      : 'rounded-xl border border-slate-800 bg-slate-950 p-4'
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2
                          size={18}
                          className={
                            tenant.isActive
                              ? 'text-emerald-300'
                              : 'text-slate-500'
                          }
                        />
                        <h3 className="truncate font-bold text-white">
                          {tenant.name}
                        </h3>
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {tenant.id}
                      </p>
                    </div>
                    <span
                      className={
                        tenant.isActive
                          ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300'
                          : 'rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-slate-400'
                      }
                    >
                      {tenant.isActive ? 'Actif' : 'Suspendu'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Globe2 size={15} className="text-slate-500" />
                      {tenant.region}
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-slate-500" />
                      Créé le {formatDateTime(tenant.createdAt)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                      Administrer
                    </button>
                    <button
                      type="button"
                      onClick={() => enterTenant(tenant.id)}
                      disabled={!tenant.isActive}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {impersonatedTenantId === tenant.id
                        ? 'Retourner'
                        : 'Ouvrir'}
                      <ArrowRight size={16} />
                    </button>
                    {tenant.isActive ? (
                      <button
                        type="button"
                        onClick={() => suspendTenantMutation.mutate(tenant.id)}
                        className="sm:col-span-2 inline-flex items-center justify-center rounded-lg border border-amber-400/30 px-3 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-400/10"
                      >
                        Suspendre
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activateTenantMutation.mutate(tenant.id)}
                        className="sm:col-span-2 inline-flex items-center justify-center rounded-lg border border-emerald-400/30 px-3 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/10"
                      >
                        Réactiver
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Résumé opérationnel
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Vue consolidée plateforme, non filtrée par le tenant actif.
              </p>
            </div>
            {summaryQuery.isFetching && (
              <Loader2 className="animate-spin text-slate-500" size={20} />
            )}
          </div>

          {summaryQuery.isError ? (
            <StatePanel
              icon={AlertTriangle}
              title="Résumé indisponible"
              message="Le cockpit multi-tenant ne répond pas pour le moment."
            />
          ) : summaryQuery.isLoading ? (
            <StatePanel
              icon={Loader2}
              title="Calcul du résumé"
              message="Agrégation des signaux tenants."
              spinning
            />
          ) : summary ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Tenants suivis" value={summary.totals.tenants} />
                <Metric
                  label="Critiques"
                  value={summary.totals.criticalTenants}
                  tone="danger"
                />
                <Metric
                  label="À surveiller"
                  value={summary.totals.warningTenants}
                  tone="warning"
                />
                <Metric
                  label="Généré"
                  value={formatDateTime(summary.generatedAt)}
                />
              </div>

              <div className="space-y-3">
                {summary.tenants.slice(0, 5).map((tenant) => (
                  <div
                    key={tenant.tenantId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-white">{tenant.tenantId}</p>
                      <p className="text-xs text-slate-500">
                        Alertes ouvertes: {tenant.alerts.open} · Incidents
                        actifs: {tenant.incidents.active}
                      </p>
                    </div>
                    <StatusBadge status={tenant.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <StatePanel
              icon={CircleSlash}
              title="Aucun résumé"
              message="Aucune donnée consolidée n'a été retournée."
            />
          )}
        </div>
      </section>
      )}

      {showTenants && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={submitTenant}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <h2 className="text-xl font-black text-white">Créer un tenant</h2>
            <div className="mt-5 grid gap-4">
              <TextInput
                label="Identifiant"
                value={tenantForm.id ?? ''}
                placeholder="HGD-DOUALA"
                onChange={(value) =>
                  setTenantForm((current) => ({ ...current, id: value }))
                }
              />
              <TextInput
                label="Nom"
                value={tenantForm.name}
                placeholder="Hôpital Général de Douala"
                onChange={(value) =>
                  setTenantForm((current) => ({ ...current, name: value }))
                }
              />
              <TextInput
                label="Région"
                value={tenantForm.region}
                placeholder="CM"
                onChange={(value) =>
                  setTenantForm((current) => ({ ...current, region: value }))
                }
              />
              <TextInput
                label="Email contact"
                value={tenantForm.contactEmail ?? ''}
                placeholder="contact@tenant.cm"
                onChange={(value) =>
                  setTenantForm((current) => ({
                    ...current,
                    contactEmail: value,
                  }))
                }
              />
              <label className="flex items-center gap-3 text-sm font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={tenantForm.isActive ?? true}
                  onChange={(event) =>
                    setTenantForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Tenant actif
              </label>
            </div>
            <button
              type="submit"
              disabled={createTenantMutation.isPending}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              Créer le tenant
            </button>
          </form>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  Administration tenant
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedTenant
                    ? selectedTenant.id
                    : 'Sélectionnez un tenant à administrer.'}
                </p>
              </div>
              {tenantUsersQuery.isFetching && (
                <Loader2 className="animate-spin text-slate-500" size={20} />
              )}
            </div>

            {selectedTenant ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <form onSubmit={submitAdmin} className="space-y-4">
                  <TextInput
                    label="Email admin"
                    value={adminForm.email}
                    placeholder="admin@tenant.cm"
                    onChange={(value) =>
                      setAdminForm((current) => ({ ...current, email: value }))
                    }
                  />
                  <TextInput
                    label="Nom complet"
                    value={adminForm.fullName}
                    placeholder="Administrateur Tenant"
                    onChange={(value) =>
                      setAdminForm((current) => ({
                        ...current,
                        fullName: value,
                      }))
                    }
                  />
                  <p className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400">
                    Une invitation email sera envoyée. Le mot de passe sera
                    défini par l'admin via le lien d'acceptation.
                  </p>
                  <select
                    value={adminForm.role}
                    onChange={(event) =>
                      setAdminForm((current) => ({
                        ...current,
                        role: event.target.value as 'ADMIN' | 'SUPER_ADMIN',
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN tenant</option>
                  </select>
                  <button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-400 disabled:opacity-60"
                  >
                    Inviter l'admin
                  </button>
                </form>

                <div className="space-y-3">
                  {(tenantUsersQuery.data ?? []).slice(0, 8).map((tenantUser) => (
                    <div
                      key={tenantUser.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                    >
                      <p className="font-bold text-white">{tenantUser.nom}</p>
                      <p className="text-xs text-slate-500">
                        {tenantUser.email} · {tenantUser.role} ·{' '}
                        {tenantUser.status}
                      </p>
                    </div>
                  ))}
                  {!tenantUsersQuery.isLoading &&
                    (tenantUsersQuery.data ?? []).length === 0 && (
                      <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-500">
                        Aucun utilisateur tenant.
                      </p>
                    )}
                </div>
              </div>
            ) : (
              <StatePanel
                icon={CircleSlash}
                title="Aucun tenant sélectionné"
                message="Choisissez un tenant dans la liste pour gérer ses admins."
              />
            )}
          </section>
        </section>
      )}

      {showAudit && (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <PlatformAdminPanel
              icon={FileText}
              title="Journal plateforme"
              items={[
                'Audits IMPERSONATION_START et IMPERSONATION_STOP',
                'Filtrage par tenant cible et acteur plateforme',
                'Traçabilité des changements de politiques globales',
              ]}
            />
            <PlatformAdminPanel
              icon={ExternalLink}
              title="Impersonation tenant"
              items={[
                'Entrée contrôlée depuis la fiche tenant',
                'Justification obligatoire côté API',
                'Bannière active tant que le contexte tenant est ouvert',
              ]}
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">
                Événements récents
              </h2>
              {auditQuery.isFetching && (
                <Loader2 className="animate-spin text-slate-500" size={20} />
              )}
            </div>
            <div className="space-y-3">
              {(auditQuery.data ?? []).slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-bold text-white">
                      {log.action} · {log.entityType}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(log.timestamp)} · tenant {log.tenantId}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    #{log.id}
                  </span>
                </div>
              ))}
              {!auditQuery.isLoading && (auditQuery.data ?? []).length === 0 && (
                <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-500">
                  Aucun événement plateforme récent.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {showSecurity && (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            <PlatformAdminPanel
              icon={KeyRound}
              title="Accès plateforme"
              items={[
                'Rôle dédié PLATFORM_SUPER_ADMIN',
                'Permissions platform:* isolées des permissions tenant',
                'Routes tenant bloquées sans tenant actif',
              ]}
            />
            <PlatformAdminPanel
              icon={ShieldCheck}
              title="Isolation tenant"
              items={[
                'JWT plateforme émis avec tenantId null',
                'Routes /api/platform/* séparées',
                'Accès métier possible uniquement après entrée tenant auditée',
              ]}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                createPlatformUserMutation.mutate({
                  ...platformUserForm,
                  password: platformUserForm.password || undefined,
                });
              }}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-xl font-black text-white">
                Créer un utilisateur plateforme
              </h2>
              <div className="mt-5 grid gap-4">
                <TextInput
                  label="Email"
                  value={platformUserForm.email}
                  placeholder="ops@mediplan.local"
                  onChange={(value) =>
                    setPlatformUserForm((current) => ({
                      ...current,
                      email: value,
                    }))
                  }
                />
                <TextInput
                  label="Nom complet"
                  value={platformUserForm.fullName}
                  placeholder="Admin Plateforme"
                  onChange={(value) =>
                    setPlatformUserForm((current) => ({
                      ...current,
                      fullName: value,
                    }))
                  }
                />
                <TextInput
                  label="Mot de passe temporaire"
                  value={platformUserForm.password}
                  placeholder="Généré si vide"
                  type="password"
                  onChange={(value) =>
                    setPlatformUserForm((current) => ({
                      ...current,
                      password: value,
                    }))
                  }
                />
              </div>
              <button
                type="submit"
                disabled={createPlatformUserMutation.isPending}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-400 disabled:opacity-60"
              >
                Créer l'utilisateur plateforme
              </button>
            </form>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-black text-white">
                  Comptes plateforme
                </h2>
                {platformUsersQuery.isFetching && (
                  <Loader2 className="animate-spin text-slate-500" size={20} />
                )}
              </div>
              <div className="space-y-3">
                {(platformUsersQuery.data ?? []).map((platformUser) => (
                  <div
                    key={platformUser.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-white">
                          {platformUser.nom}
                        </p>
                        <p className="text-xs text-slate-500">
                          {platformUser.email} · {platformUser.status}
                        </p>
                      </div>
                      {platformUser.status === 'DISABLED' ? (
                        <button
                          type="button"
                          onClick={() =>
                            reactivatePlatformUserMutation.mutate(
                              platformUser.id,
                            )
                          }
                          className="rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-200"
                        >
                          Réactiver
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            disablePlatformUserMutation.mutate(platformUser.id)
                          }
                          className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-200"
                        >
                          Désactiver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </>
      )}

      {showSettings && (
        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!effectiveSettings) return;
              updateSettingsMutation.mutate({
                sessionDurationMinutes:
                  effectiveSettings.sessionDurationMinutes,
                impersonationReasonRequired:
                  effectiveSettings.impersonationReasonRequired,
                impersonationMinimumReasonLength:
                  effectiveSettings.impersonationMinimumReasonLength,
                tenantDefaults: effectiveSettings.tenantDefaults,
                adminCreationSecurity: effectiveSettings.adminCreationSecurity,
              });
            }}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <h2 className="text-xl font-black text-white">
              Paramètres plateforme
            </h2>
            {settingsQuery.isLoading && (
              <StatePanel
                icon={Loader2}
                title="Chargement"
                message="Lecture des paramètres plateforme."
                spinning
              />
            )}
            {effectiveSettings && (
              <div className="mt-5 grid gap-4">
                <NumberInput
                  label="Durée session (minutes)"
                  value={effectiveSettings.sessionDurationMinutes}
                  onChange={(value) =>
                    setSettingsDraft({
                      ...effectiveSettings,
                      sessionDurationMinutes: value,
                    })
                  }
                />
                <NumberInput
                  label="Longueur raison impersonation"
                  value={effectiveSettings.impersonationMinimumReasonLength}
                  onChange={(value) =>
                    setSettingsDraft({
                      ...effectiveSettings,
                      impersonationMinimumReasonLength: value,
                    })
                  }
                />
                <label className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={effectiveSettings.impersonationReasonRequired}
                    onChange={(event) =>
                      setSettingsDraft({
                        ...effectiveSettings,
                        impersonationReasonRequired: event.target.checked,
                      })
                    }
                  />
                  Raison obligatoire pour impersonation
                </label>
                <NumberInput
                  label="Mot de passe admin min."
                  value={
                    effectiveSettings.adminCreationSecurity.minimumPasswordLength
                  }
                  onChange={(value) =>
                    setSettingsDraft({
                      ...effectiveSettings,
                      adminCreationSecurity: {
                        ...effectiveSettings.adminCreationSecurity,
                        minimumPasswordLength: value,
                      },
                    })
                  }
                />
                <label className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={
                      effectiveSettings.adminCreationSecurity
                        .requireInvitationAcceptance
                    }
                    onChange={(event) =>
                      setSettingsDraft({
                        ...effectiveSettings,
                        adminCreationSecurity: {
                          ...effectiveSettings.adminCreationSecurity,
                          requireInvitationAcceptance: event.target.checked,
                        },
                      })
                    }
                  />
                  Acceptation invitation obligatoire
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={
                      effectiveSettings.adminCreationSecurity
                        .allowDirectPasswordProvisioning
                    }
                    onChange={(event) =>
                      setSettingsDraft({
                        ...effectiveSettings,
                        adminCreationSecurity: {
                          ...effectiveSettings.adminCreationSecurity,
                          allowDirectPasswordProvisioning: event.target.checked,
                        },
                      })
                    }
                  />
                  Provisionnement direct de mot de passe
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={!effectiveSettings || updateSettingsMutation.isPending}
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              Enregistrer
            </button>
          </form>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black text-white">
              Monitoring tenants
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                label="Healthy"
                value={monitoringQuery.data?.totals.healthy ?? '-'}
              />
              <Metric
                label="Dégradés"
                value={monitoringQuery.data?.totals.degraded ?? '-'}
                tone="warning"
              />
              <Metric
                label="Critiques"
                value={monitoringQuery.data?.totals.critical ?? '-'}
                tone="danger"
              />
              <Metric
                label="Alertes ouvertes"
                value={monitoringQuery.data?.totals.openAlerts ?? '-'}
              />
            </div>
          </section>
        </section>
      )}
    </div>
  );
};

const platformSectionTitle = (section: string) => {
  switch (section) {
    case 'tenants':
      return 'Administration des tenants';
    case 'audit':
      return 'Audit plateforme';
    case 'security':
      return 'Sécurité plateforme';
    case 'settings':
      return 'Paramètres plateforme';
    default:
      return 'Administration plateforme Mediplan';
  }
};

const PlatformModuleCard = ({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-emerald-400/40 hover:bg-slate-800"
  >
    <div className="mb-4 inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
      <Icon size={22} />
    </div>
    <h2 className="font-black text-white">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-300">
      {cta}
      <ArrowRight size={15} />
    </span>
  </button>
);

const PlatformAdminPanel = ({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof ShieldCheck;
  title: string;
  items: string[];
}) => (
  <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
    <div className="mb-5 flex items-center gap-3">
      <div className="rounded-lg bg-slate-950 p-2 text-emerald-300">
        <Icon size={22} />
      </div>
      <h2 className="text-xl font-black text-white">{title}</h2>
    </div>
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  </section>
);

const TextInput = ({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
      {label}
    </span>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
    />
  </label>
);

const NumberInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
      {label}
    </span>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
    />
  </label>
);

const readableError = (error: unknown) => {
  if (!error) return null;
  if (typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    return response?.data?.message ?? 'Action plateforme impossible.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Action plateforme impossible.';
};

const Metric = ({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'warning' | 'danger';
}) => {
  const toneClass =
    tone === 'danger'
      ? 'text-rose-300'
      : tone === 'warning'
        ? 'text-amber-300'
        : 'text-white';
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`mt-2 break-words text-lg font-black ${toneClass}`}>
        {value}
      </p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: 'OK' | 'WARNING' | 'CRITICAL' }) => {
  if (status === 'CRITICAL') {
    return (
      <span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-300">
        Critique
      </span>
    );
  }
  if (status === 'WARNING') {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-300">
        À surveiller
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">
      <CheckCircle2 size={13} />
      OK
    </span>
  );
};

const StatePanel = ({
  icon: Icon,
  title,
  message,
  spinning = false,
}: {
  icon: typeof Loader2;
  title: string;
  message: string;
  spinning?: boolean;
}) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950 p-6 text-center">
    <Icon
      size={28}
      className={spinning ? 'mb-3 animate-spin text-slate-500' : 'mb-3 text-slate-500'}
    />
    <h3 className="font-bold text-white">{title}</h3>
    <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
  </div>
);
