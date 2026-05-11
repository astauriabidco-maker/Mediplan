import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../agents/entities/agent.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 1,
    email: 'root@example.test',
    tenantId: 'platform',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    permissions: ['*'],
    ...overrides,
  },
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<
    Pick<AuthService, 'startTenantImpersonation' | 'stopTenantImpersonation'>
  >;

  beforeEach(() => {
    authService = {
      startTenantImpersonation: jest.fn(),
      stopTenantImpersonation: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  it('requires a platform-capable super admin for starting tenant impersonation', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AuthController.prototype.startTenantImpersonation,
    );

    expect(roles).toEqual([UserRole.PLATFORM_SUPER_ADMIN]);
  });

  it('starts tenant impersonation through the auth service', async () => {
    await controller.startTenantImpersonation(
      { targetTenantId: 'tenant-b', reason: 'Support incident INC-42' },
      createRequest() as any,
    );

    expect(authService.startTenantImpersonation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      'tenant-b',
      'Support incident INC-42',
    );
  });

  it('stops tenant impersonation through the auth service', async () => {
    await controller.stopTenantImpersonation(
      { reason: 'Done' },
      createRequest() as any,
    );

    expect(authService.stopTenantImpersonation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      'Done',
    );
  });
});
