import { AuthService } from './auth.service';
import { Permission } from './permissions';
import { UserRole, UserStatus } from '../agents/entities/agent.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  const createService = (agentRepository = {} as never) => {
    const jwtService = {
      sign: jest.fn((payload: unknown) => JSON.stringify(payload)),
    };
    const platformSettingsService = {
      getSessionDurationMinutes: jest.fn(async () => 90),
      validateImpersonationReason: jest.fn(async (reason?: string) =>
        reason?.trim(),
      ),
    };
    const auditService = {
      logTenantImpersonationStart: jest.fn(),
      logTenantImpersonationStop: jest.fn(),
    };
    const service = new AuthService(
      agentRepository,
      jwtService as never,
      {} as never,
      auditService as never,
      platformSettingsService as never,
    );

    return { service, jwtService, platformSettingsService, auditService };
  };

  it('signs platform super admin tokens without a tenant', async () => {
    const { service, jwtService } = createService();

    const result = await service.login({
      id: 1,
      email: 'platform@example.test',
      role: UserRole.PLATFORM_SUPER_ADMIN,
      tenantId: null,
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: null,
        role: UserRole.PLATFORM_SUPER_ADMIN,
        permissions: expect.arrayContaining([
          'platform:*',
          Permission.PlatformTenantsRead,
        ]),
      }),
      { expiresIn: 5400 },
    );
    expect(result.user).toEqual(
      expect.objectContaining({
        tenantId: null,
        role: UserRole.PLATFORM_SUPER_ADMIN,
      }),
    );
  });

  it('keeps historical tenant super admin tokens tenant scoped by default', async () => {
    const { service, jwtService } = createService();

    const result = await service.login({
      id: 2,
      email: 'super-admin@example.test',
      role: UserRole.SUPER_ADMIN,
      tenantId: 'tenant-a',
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 'tenant-a',
        role: UserRole.SUPER_ADMIN,
        permissions: [Permission.All],
      }),
      { expiresIn: 5400 },
    );
    expect(result.user.tenantId).toBe('tenant-a');
  });

  it('keeps default tenant fallback for legacy tenant users', async () => {
    const { service, jwtService } = createService();

    const result = await service.login({
      id: 3,
      email: 'agent@example.test',
      role: UserRole.AGENT,
      tenantId: undefined,
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 'DEFAULT_TENANT',
        role: UserRole.AGENT,
      }),
      { expiresIn: 5400 },
    );
    expect(result.user.tenantId).toBe('DEFAULT_TENANT');
  });

  it('normalizes impersonation reasons through platform settings before issuing a tenant token', async () => {
    const { service, platformSettingsService, auditService, jwtService } =
      createService();

    await service.startTenantImpersonation(
      {
        id: 1,
        email: 'platform@example.test',
        tenantId: null,
        role: UserRole.PLATFORM_SUPER_ADMIN,
        permissions: ['platform:*'],
      },
      'TENANT-A',
      '  Support incident INC-42  ',
    );

    expect(
      platformSettingsService.validateImpersonationReason,
    ).toHaveBeenCalledWith('  Support incident INC-42  ');
    expect(auditService.logTenantImpersonationStart).toHaveBeenCalledWith(
      expect.objectContaining({
        targetTenantId: 'TENANT-A',
        reason: 'Support incident INC-42',
      }),
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: 'TENANT-A',
        impersonation: expect.objectContaining({
          reason: 'Support incident INC-42',
        }),
      }),
      { expiresIn: 5400 },
    );
  });

  it('rejects disabled users during password validation', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({
        id: 4,
        email: 'disabled@example.test',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        status: UserStatus.DISABLED,
        password: await bcrypt.hash('ValidPassword123', 10),
      })),
    };
    const agentRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const { service } = createService(agentRepository as never);

    await expect(
      service.validateUser('disabled@example.test', 'ValidPassword123'),
    ).resolves.toBeNull();
  });
});
