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
}

export type AuthenticatedRequest = Request & {
    user: AuthenticatedUser;
};
