import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { DashboardPage, QvtPage, SyncPage } from './pages/PlaceholderPages'
import { HierarchyPage } from './pages/HierarchyPage'
import SettingsPage from './pages/Settings'
import { PayrollPage } from './pages/PayrollPage'
import { HospitalServicesPage } from './pages/HospitalServicesPage'
import { AgentsPage } from './pages/AgentsPage'
import { CompetenciesPage } from './pages/CompetenciesPage'
import { PlanningPage } from './pages/Planning'
import { LeavesPage } from './pages/LeavesPage'
import { LoginPage } from './pages/LoginPage'
import { WhatsAppInbox } from './pages/WhatsAppInbox'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { GedPage } from './pages/GedPage'
import { useAppConfig } from './store/useAppConfig'
import { useAuth } from './store/useAuth'

const queryClient = new QueryClient()

const ProtectedRoute = () => {
    const token = useAuth((state) => state.token);
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

function App() {
    const fetchConfig = useAppConfig((state) => state.fetchConfig)
    const isLoading = useAppConfig((state) => state.isLoading)

    useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-medium">Initialisation de Mediplan...</p>
                </div>
            </div>
        )
    }

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="planning" element={<PlanningPage />} />
                            <Route path="leaves" element={<LeavesPage />} />
                            <Route path="agents">
                                <Route index element={<AgentsPage />} />
                                <Route path="services" element={<HospitalServicesPage />} />
                                <Route path="hierarchy" element={<HierarchyPage />} />
                            </Route>
                            <Route path="competencies" element={<CompetenciesPage />} />
                            <Route path="payment" element={<PayrollPage />} />
                            <Route path="ged" element={<GedPage />} />
                            <Route path="qvt" element={<QvtPage />} />
                            <Route path="sync" element={<SyncPage />} />
                            <Route path="whatsapp-inbox" element={<WhatsAppInbox />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
