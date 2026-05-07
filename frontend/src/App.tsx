import React, { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { useAppConfig } from './store/useAppConfig';
import { useAuth } from './store/useAuth';

const queryClient = new QueryClient();

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const HierarchyPage = lazy(() =>
  import('./pages/HierarchyPage').then((module) => ({
    default: module.HierarchyPage,
  })),
);
const SettingsPage = lazy(() => import('./pages/Settings'));
const PayrollPage = lazy(() =>
  import('./pages/PayrollPage').then((module) => ({
    default: module.PayrollPage,
  })),
);
const HospitalServicesPage = lazy(() =>
  import('./pages/HospitalServicesPage').then((module) => ({
    default: module.HospitalServicesPage,
  })),
);
const AgentsPage = lazy(() =>
  import('./pages/AgentsPage').then((module) => ({
    default: module.AgentsPage,
  })),
);
const CompetenciesPage = lazy(() =>
  import('./pages/CompetenciesPage').then((module) => ({
    default: module.CompetenciesPage,
  })),
);
const PlanningPage = lazy(() =>
  import('./pages/Planning').then((module) => ({
    default: module.PlanningPage,
  })),
);
const PlanningPrepublicationPage = lazy(() =>
  import('./pages/PlanningPrepublicationPage').then((module) => ({
    default: module.PlanningPrepublicationPage,
  })),
);
const ManagerCockpitPage = lazy(() =>
  import('./pages/ManagerCockpitPage').then((module) => ({
    default: module.ManagerCockpitPage,
  })),
);
const ManagerWorklistPage = lazy(() =>
  import('./pages/ManagerWorklistPage').then((module) => ({
    default: module.ManagerWorklistPage,
  })),
);
const AuditLogPage = lazy(() =>
  import('./pages/AuditLogPage').then((module) => ({
    default: module.AuditLogPage,
  })),
);
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage').then((module) => ({
    default: module.AttendancePage,
  })),
);
const LeavesPage = lazy(() =>
  import('./pages/LeavesPage').then((module) => ({
    default: module.LeavesPage,
  })),
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const WhatsAppInbox = lazy(() =>
  import('./pages/WhatsAppInbox').then((module) => ({
    default: module.WhatsAppInbox,
  })),
);
const AcceptInvitePage = lazy(() =>
  import('./pages/AcceptInvitePage').then((module) => ({
    default: module.AcceptInvitePage,
  })),
);
const GedPage = lazy(() =>
  import('./pages/GedPage').then((module) => ({ default: module.GedPage })),
);
const QvtPage = lazy(() =>
  import('./pages/QvtPage').then((module) => ({ default: module.QvtPage })),
);
const ContractTemplatesPage = lazy(() =>
  import('./pages/ContractTemplatesPage').then((module) => ({
    default: module.ContractTemplatesPage,
  })),
);
const PublicSignPage = lazy(() =>
  import('./pages/PublicSignPage').then((module) => ({
    default: module.PublicSignPage,
  })),
);
const ReleaseReadinessPage = lazy(() =>
  import('./pages/ReleaseReadinessPage').then((module) => ({
    default: module.ReleaseReadinessPage,
  })),
);
const OpsDashboardPage = lazy(() =>
  import('./pages/OpsDashboardPage').then((module) => ({
    default: module.OpsDashboardPage,
  })),
);
const SyncPage = lazy(() =>
  import('./pages/PlaceholderPages').then((module) => ({
    default: module.SyncPage,
  })),
);

const PageLoader = () => (
  <div className="flex min-h-[320px] items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-3 text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      <span className="text-sm font-medium">Chargement de la vue...</span>
    </div>
  </div>
);

const ProtectedRoute = () => {
  const token = useAuth((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

function App() {
  const fetchConfig = useAppConfig((state) => state.fetchConfig);
  const isLoading = useAppConfig((state) => state.isLoading);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">
            Initialisation de Mediplan...
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<PageLoader />}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/sign/:token" element={<PublicSignPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="manager" element={<ManagerCockpitPage />} />
                <Route
                  path="manager/cockpit"
                  element={<ManagerCockpitPage />}
                />
                <Route
                  path="manager/worklist"
                  element={<ManagerWorklistPage />}
                />
                <Route path="audit" element={<AuditLogPage />} />
                <Route path="planning" element={<PlanningPage />} />
                <Route
                  path="planning/prepublication"
                  element={<PlanningPrepublicationPage />}
                />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="leaves" element={<LeavesPage />} />
                <Route path="agents">
                  <Route index element={<AgentsPage />} />
                  <Route path="services" element={<HospitalServicesPage />} />
                  <Route path="hierarchy" element={<HierarchyPage />} />
                  <Route path="templates" element={<ContractTemplatesPage />} />
                </Route>
                <Route path="competencies" element={<CompetenciesPage />} />
                <Route path="payment" element={<PayrollPage />} />
                <Route path="ged" element={<GedPage />} />
                <Route path="qvt" element={<QvtPage />} />
                <Route
                  path="admin/release"
                  element={<ReleaseReadinessPage />}
                />
                <Route path="ops" element={<OpsDashboardPage />} />
                <Route path="sync" element={<SyncPage />} />
                <Route path="whatsapp-inbox" element={<WhatsAppInbox />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;
