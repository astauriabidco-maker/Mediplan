import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditAction, AuditEntityType } from './entities/audit-log.entity';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['audit:read'],
    ...overrides,
  },
});

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: jest.Mocked<Pick<AuditService, 'getLogs'>>;

  beforeEach(() => {
    auditService = {
      getLogs: jest.fn(),
    };

    controller = new AuditController(auditService as unknown as AuditService);
  });

  it('requires the dedicated audit:read permission', () => {
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, AuditController.prototype.getLogs);

    expect(permissions).toEqual(['audit:read']);
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    await controller.getLogs(createRequest(), 'tenant-b');

    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-a', expect.any(Object));
  });

  it('allows SUPER_ADMIN users to inspect an explicit tenant', async () => {
    await controller.getLogs(createRequest({ role: 'SUPER_ADMIN' }), 'tenant-b');

    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-b', expect.any(Object));
  });

  it('maps audit filters into the service call', async () => {
    await controller.getLogs(
      createRequest(),
      undefined,
      '7',
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      '12',
      'PUBLISH_PLANNING',
      '2026-01-01T00:00:00.000Z',
      '2026-01-31T23:59:59.000Z',
      '25',
    );

    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-a', {
      actorId: 7,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.AGENT,
      entityId: '12',
      detailAction: 'PUBLISH_PLANNING',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      limit: 25,
    });
  });
});
