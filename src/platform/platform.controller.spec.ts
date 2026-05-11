import { ForbiddenException } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformRoleGuard } from './platform-role.guard';

const createRequest = (role = 'PLATFORM_SUPER_ADMIN') =>
  ({
    user: {
      id: 1,
      email: 'platform@mediplan.test',
      tenantId: null,
      role,
      permissions: ['platform:*'],
    },
  }) as any;

describe('PlatformController', () => {
  const platformService = {
    getPlatformUser: jest.fn(),
    getTenantSummaries: jest.fn(),
    createTenant: jest.fn(),
    updateTenant: jest.fn(),
    suspendTenant: jest.fn(),
    activateTenant: jest.fn(),
    listTenantUsers: jest.fn(),
    createTenantAdmin: jest.fn(),
  };
  const platformTenantDetailService = {
    getTenantDetail: jest.fn(),
  };
  const platformSettingsService = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };
  const platformMonitoringService = {
    getTenantMonitoring: jest.fn(),
  };
  const platformAuditService = {
    list: jest.fn(),
    export: jest.fn(),
  };

  let controller: PlatformController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PlatformController(
      platformService as any,
      platformTenantDetailService as any,
      platformSettingsService as any,
      platformMonitoringService as any,
      platformAuditService as any,
    );
  });

  it('returns the authenticated platform user context', async () => {
    platformService.getPlatformUser.mockResolvedValue({
      id: 1,
      email: 'platform@mediplan.test',
      role: 'PLATFORM_SUPER_ADMIN',
    });

    await expect(controller.me(createRequest())).resolves.toEqual({
      id: 1,
      email: 'platform@mediplan.test',
      tenantId: null,
      role: 'PLATFORM_SUPER_ADMIN',
      permissions: ['platform:*'],
      profile: {
        id: 1,
        email: 'platform@mediplan.test',
        role: 'PLATFORM_SUPER_ADMIN',
      },
    });
  });

  it('returns tenant summaries from the platform service', async () => {
    platformService.getTenantSummaries.mockResolvedValue([
      { id: 'GHT_A', name: 'GHT A', userCount: 3 },
    ]);

    await expect(controller.tenants()).resolves.toEqual([
      { id: 'GHT_A', name: 'GHT A', userCount: 3 },
    ]);
  });

  it('creates a tenant through the platform service', async () => {
    platformService.createTenant.mockResolvedValue({ id: 'TENANT-A' });

    await expect(
      controller.createTenant(createRequest(), {
        id: 'TENANT-A',
        name: 'Tenant A',
        region: 'CM',
      }),
    ).resolves.toEqual({ id: 'TENANT-A' });
    expect(platformService.createTenant).toHaveBeenCalledWith(
      { id: 'TENANT-A', name: 'Tenant A', region: 'CM' },
      expect.objectContaining({ role: 'PLATFORM_SUPER_ADMIN' }),
    );
  });

  it('returns a tenant detail aggregate from the tenant detail service', async () => {
    platformTenantDetailService.getTenantDetail.mockResolvedValue({
      tenant: { id: 'TENANT-A', name: 'Tenant A', isActive: true },
      counts: { agents: 3, services: 2, shifts: 9, leaves: 1, audits: 4 },
    });

    await expect(controller.tenantDetail('tenant-a')).resolves.toEqual({
      tenant: { id: 'TENANT-A', name: 'Tenant A', isActive: true },
      counts: { agents: 3, services: 2, shifts: 9, leaves: 1, audits: 4 },
    });
    expect(platformTenantDetailService.getTenantDetail).toHaveBeenCalledWith(
      'tenant-a',
    );
  });

  it('returns consolidated tenant monitoring with parsed freshness threshold', async () => {
    platformMonitoringService.getTenantMonitoring.mockResolvedValue({
      tenants: [{ tenant: { id: 'TENANT-A' }, status: 'HEALTHY' }],
    });

    await expect(
      controller.tenantMonitoring({
        tenantId: 'TENANT-A',
        backupFreshnessHours: '48',
      }),
    ).resolves.toEqual({
      tenants: [{ tenant: { id: 'TENANT-A' }, status: 'HEALTHY' }],
    });
    expect(platformMonitoringService.getTenantMonitoring).toHaveBeenCalledWith({
      tenantId: 'TENANT-A',
      backupFreshnessHours: 48,
    });
  });

  it('reads platform settings through the settings service with audit actor', async () => {
    platformSettingsService.getSettings.mockResolvedValue({
      sessionDurationMinutes: 60,
    });

    await expect(controller.settings(createRequest())).resolves.toEqual({
      sessionDurationMinutes: 60,
    });
    expect(platformSettingsService.getSettings).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'PLATFORM_SUPER_ADMIN' }),
    );
  });

  it('updates platform settings through the settings service with audit actor', async () => {
    platformSettingsService.updateSettings.mockResolvedValue({
      sessionDurationMinutes: 120,
    });

    await expect(
      controller.updateSettings(createRequest(), {
        sessionDurationMinutes: 120,
      }),
    ).resolves.toEqual({ sessionDurationMinutes: 120 });
    expect(platformSettingsService.updateSettings).toHaveBeenCalledWith(
      { sessionDurationMinutes: 120 },
      expect.objectContaining({ role: 'PLATFORM_SUPER_ADMIN' }),
    );
  });

  it('invites a tenant admin through the platform service', async () => {
    platformService.createTenantAdmin.mockResolvedValue({
      id: 10,
      email: 'admin@tenant.test',
      status: 'INVITED',
      invitationSent: true,
    });

    await expect(
      controller.createTenantAdmin(createRequest(), 'TENANT-A', {
        email: 'admin@tenant.test',
        fullName: 'Tenant Admin',
      }),
    ).resolves.toEqual({
      id: 10,
      email: 'admin@tenant.test',
      status: 'INVITED',
      invitationSent: true,
    });
    expect(platformService.createTenantAdmin).toHaveBeenCalledWith(
      'TENANT-A',
      { email: 'admin@tenant.test', fullName: 'Tenant Admin' },
      expect.objectContaining({ role: 'PLATFORM_SUPER_ADMIN' }),
    );
  });

  it('returns filtered readable platform audit logs', async () => {
    platformAuditService.list.mockResolvedValue([{ id: 99, summary: 'audit' }]);

    await expect(
      controller.audit({
        tenantId: 'TENANT-A',
        action: 'CREATE_PLATFORM_TENANT',
      }),
    ).resolves.toEqual([{ id: 99, summary: 'audit' }]);
    expect(platformAuditService.list).toHaveBeenCalledWith({
      tenantId: 'TENANT-A',
      action: 'CREATE_PLATFORM_TENANT',
    });
  });

  it('returns an exportable platform audit payload', async () => {
    platformAuditService.export.mockResolvedValue({
      format: 'csv',
      data: '"id"\n"99"',
    });

    await expect(
      controller.exportAudit({ format: 'csv', limit: '25' }),
    ).resolves.toEqual({
      format: 'csv',
      data: '"id"\n"99"',
    });
    expect(platformAuditService.export).toHaveBeenCalledWith(
      { format: 'csv', limit: '25' },
      'csv',
    );
  });
});

describe('PlatformRoleGuard', () => {
  const guard = new PlatformRoleGuard();

  const createContext = (role: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => createRequest(role),
      }),
    }) as any;

  it('allows PLATFORM_SUPER_ADMIN users', () => {
    expect(guard.canActivate(createContext('PLATFORM_SUPER_ADMIN'))).toBe(true);
  });

  it('rejects tenant SUPER_ADMIN users', () => {
    expect(() => guard.canActivate(createContext('SUPER_ADMIN'))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects tenant ADMIN users even when they have wildcard permissions', () => {
    expect(() => guard.canActivate(createContext('ADMIN'))).toThrow(
      ForbiddenException,
    );
  });
});
