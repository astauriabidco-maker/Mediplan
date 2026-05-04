import { resolveTenantId } from './tenant-context';
import type { AuthenticatedRequest } from './authenticated-request';

const createRequest = (role: string, tenantId = 'tenant-a') => ({
  user: {
    id: 42,
    userId: 42,
    sub: 42,
    email: 'user@example.test',
    tenantId,
    tenant: tenantId,
    role,
    permissions: [],
  },
}) as AuthenticatedRequest;

describe('resolveTenantId', () => {
  it('ignores requested tenant ids for regular users', () => {
    expect(resolveTenantId(createRequest('ADMIN'), 'tenant-b')).toBe('tenant-a');
  });

  it('allows super admins to target a requested tenant id', () => {
    expect(resolveTenantId(createRequest('SUPER_ADMIN', 'root'), 'tenant-b')).toBe('tenant-b');
  });

  it('falls back to the authenticated tenant when no tenant is requested', () => {
    expect(resolveTenantId(createRequest('SUPER_ADMIN', 'root'))).toBe('root');
  });
});
