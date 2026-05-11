import { Request } from 'express';

export interface AuthenticatedUser {
    id: number;
    userId: number;
    sub: number;
    email: string;
    tenantId: string;
    tenant: string;
    role: string;
    permissions: string[];
    impersonation?: TenantImpersonationContext;
}

export interface TenantImpersonationContext {
    active: true;
    actorId: number;
    actorEmail: string;
    sourceTenantId: string | null;
    targetTenantId: string;
    startedAt: string;
    reason?: string;
}

export type AuthenticatedRequest = Request & {
    user: AuthenticatedUser;
};
