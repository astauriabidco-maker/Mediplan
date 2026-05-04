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
  let auditService: jest.Mocked<Pick<AuditService, 'getLogs' | 'verifyChain' | 'exportLogs'>>;

  beforeEach(() => {
    auditService = {
      getLogs: jest.fn(),
      verifyChain: jest.fn(),
      exportLogs: jest.fn(),
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

  it('verifies the authenticated tenant chain', async () => {
    await controller.verifyChain(createRequest(), 'tenant-b');

    expect(auditService.verifyChain).toHaveBeenCalledWith('tenant-a');
  });

  it('allows SUPER_ADMIN users to verify an explicit tenant chain', async () => {
    await controller.verifyChain(createRequest({ role: 'SUPER_ADMIN' }), 'tenant-b');

    expect(auditService.verifyChain).toHaveBeenCalledWith('tenant-b');
  });

  it('exports audit logs with period and action filters', async () => {
    await controller.exportLogs(
      createRequest({ role: 'SUPER_ADMIN' }),
      'tenant-b',
      undefined,
      AuditAction.DELETE,
      undefined,
      undefined,
      undefined,
      '2026-02-01T00:00:00.000Z',
      '2026-02-28T23:59:59.000Z',
      '50',
    );

    expect(auditService.exportLogs).toHaveBeenCalledWith('tenant-b', {
      actorId: undefined,
      action: AuditAction.DELETE,
      entityType: undefined,
      entityId: undefined,
      detailAction: undefined,
      from: new Date('2026-02-01T00:00:00.000Z'),
      to: new Date('2026-02-28T23:59:59.000Z'),
      limit: 50,
    });
  });
});
