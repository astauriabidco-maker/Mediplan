import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    email: string;
    tenantId: string | null;
    role: string;
    permissions: string[];
    impersonation?: {
        active: true;
        actorId: number;
        actorEmail: string;
        sourceTenantId: string | null;
        targetTenantId: string;
        startedAt: string;
        reason?: string;
    };
}

interface AuthState {
    token: string | null;
    user: User | null;
    impersonatedTenantId: string | null;
    setAuth: (token: string, user: User) => void;
    setImpersonatedTenantId: (tenantId: string | null) => void;
    logout: () => void;
}

export const useAuth = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            impersonatedTenantId: null,
            setAuth: (token, user) => set({ token, user }),
            setImpersonatedTenantId: (tenantId) => set({ impersonatedTenantId: tenantId }),
            logout: () => set({ token: null, user: null, impersonatedTenantId: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
