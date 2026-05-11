import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import {
  PlatformRoute,
  TenantContextGuard,
  TenantRoute,
  hasActiveTenant,
  isPlatformRole,
  resolveTenantId,
  resolveTenantRouteTenantId,
} from './tenant-context';
import type { AuthenticatedRequest } from './authenticated-request';

const createRequest = (role: string, tenantId: string | null = 'tenant-a') =>
  ({
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
    query: {},
  }) as AuthenticatedRequest;

describe('resolveTenantId', () => {
  it('ignores requested tenant ids for regular users', () => {
    expect(resolveTenantId(createRequest('ADMIN'), 'tenant-b')).toBe(
      'tenant-a',
    );
  });

  it('allows super admins to target a requested tenant id', () => {
    expect(
      resolveTenantId(createRequest('SUPER_ADMIN', 'root'), 'tenant-b'),
    ).toBe('tenant-b');
  });

  it('allows platform super admins without active tenant to target a requested tenant id', () => {
    expect(
      resolveTenantId(createRequest('PLATFORM_SUPER_ADMIN', null), 'tenant-b'),
    ).toBe('tenant-b');
  });

  it('falls back to the authenticated tenant when no tenant is requested', () => {
    expect(resolveTenantId(createRequest('SUPER_ADMIN', 'root'))).toBe('root');
  });

  it('rejects platform super admins on tenant routes when no tenant is requested', () => {
    expect(() =>
      resolveTenantId(createRequest('PLATFORM_SUPER_ADMIN', null)),
    ).toThrow('Tenant actif requis');
  });
});

describe('tenant route helpers', () => {
  it('identifies platform roles', () => {
    expect(isPlatformRole('PLATFORM_SUPER_ADMIN')).toBe(true);
    expect(isPlatformRole('SUPER_ADMIN')).toBe(true);
    expect(isPlatformRole('ADMIN')).toBe(false);
  });

  it('detects whether the request has an active tenant', () => {
    expect(hasActiveTenant(createRequest('ADMIN', 'tenant-a'))).toBe(true);
    expect(hasActiveTenant(createRequest('SUPER_ADMIN', null))).toBe(false);
  });

  it('uses the active tenant on tenant routes by default', () => {
    expect(
      resolveTenantRouteTenantId(createRequest('ADMIN'), 'tenant-b'),
    ).toEqual({
      tenantId: 'tenant-a',
      source: 'active-tenant',
    });
  });

  it('rejects tenant routes when no active tenant is available', () => {
    expect(() =>
      resolveTenantRouteTenantId(createRequest('SUPER_ADMIN', null)),
    ).toThrow('Tenant actif requis');
  });

  it('allows explicit platform tenant overrides when the route opts in', () => {
    expect(
      resolveTenantRouteTenantId(
        createRequest('SUPER_ADMIN', null),
        'tenant-b',
        {
          allowPlatformTenantOverride: true,
        },
      ),
    ).toEqual({
      tenantId: 'tenant-b',
      source: 'platform-explicit-override',
    });
  });

  it('allows explicit platform super admin tenant overrides when the route opts in', () => {
    expect(
      resolveTenantRouteTenantId(
        createRequest('PLATFORM_SUPER_ADMIN', null),
        'tenant-b',
        {
          allowPlatformTenantOverride: true,
        },
      ),
    ).toEqual({
      tenantId: 'tenant-b',
      source: 'platform-explicit-override',
    });
  });

  it('does not allow non-platform users to override their active tenant', () => {
    expect(
      resolveTenantRouteTenantId(createRequest('ADMIN'), 'tenant-b', {
        allowPlatformTenantOverride: true,
      }),
    ).toEqual({
      tenantId: 'tenant-a',
      source: 'active-tenant',
    });
  });
});

describe('TenantContextGuard', () => {
  const createContext = (
    req: AuthenticatedRequest,
    handler: () => void = () => undefined,
    controller: new () => unknown = class TestController {},
  ) =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as ExecutionContext;

  it('stores resolved tenant context for tenant routes', () => {
    class Controller {}
    TenantRoute()(Controller);
    const req = createRequest('ADMIN');
    const guard = new TenantContextGuard(new Reflector());

    expect(guard.canActivate(createContext(req, undefined, Controller))).toBe(
      true,
    );
    expect(req.tenantContext).toEqual({
      tenantId: 'tenant-a',
      source: 'active-tenant',
    });
  });

  it('allows platform routes without requiring a tenant context', () => {
    class Controller {}
    PlatformRoute()(Controller);
    const req = createRequest('SUPER_ADMIN', null);
    const guard = new TenantContextGuard(new Reflector());

    expect(guard.canActivate(createContext(req, undefined, Controller))).toBe(
      true,
    );
    expect(req.tenantContext).toBeUndefined();
  });

  it('allows tenant override only when the tenant route opts in', () => {
    class Controller {}
    TenantRoute({ allowPlatformTenantOverride: true })(Controller);
    const req = createRequest('SUPER_ADMIN', null);
    req.query = { tenantId: 'tenant-b' };
    const guard = new TenantContextGuard(new Reflector());

    expect(guard.canActivate(createContext(req, undefined, Controller))).toBe(
      true,
    );
    expect(req.tenantContext).toEqual({
      tenantId: 'tenant-b',
      source: 'platform-explicit-override',
    });
  });

  it('rejects ambiguous tenant override query params', () => {
    class Controller {}
    TenantRoute({ allowPlatformTenantOverride: true })(Controller);
    const req = createRequest('SUPER_ADMIN', null);
    req.query = { tenantId: ['tenant-a', 'tenant-b'] };
    const guard = new TenantContextGuard(new Reflector());

    expect(() =>
      guard.canActivate(createContext(req, undefined, Controller)),
    ).toThrow('Un seul tenant cible');
  });
});
