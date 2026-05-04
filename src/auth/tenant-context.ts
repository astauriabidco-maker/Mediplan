import type { AuthenticatedRequest } from './authenticated-request';

export function resolveTenantId(
  req: AuthenticatedRequest,
  requestedTenantId?: string | null,
): string {
  return req.user.role === 'SUPER_ADMIN' && requestedTenantId
    ? requestedTenantId
    : req.user.tenantId;
}
