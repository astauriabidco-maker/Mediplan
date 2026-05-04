/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { BackupController } from './backup.controller';
import { BackupService, TenantImportMode } from './backup.service';

const createRequest = (overrides: Partial<any> = {}) =>
  ({
    user: {
      id: 42,
      tenantId: 'tenant-a',
      role: 'ADMIN',
      permissions: ['backup:read', 'backup:write'],
      ...overrides,
    },
  }) as any;

describe('BackupController', () => {
  let controller: BackupController;
  const backupService = {
    exportTenant: jest.fn(),
    importTenant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [{ provide: BackupService, useValue: backupService }],
    }).compile();

    controller = module.get(BackupController);
  });

  it('ignores tenantId query parameters for regular tenant exports', async () => {
    await controller.exportTenant(
      createRequest(),
      'tenant-b',
      '2026-01-01',
      '2026-01-31',
    );

    expect(backupService.exportTenant).toHaveBeenCalledWith('tenant-a', {
      from: expect.any(Date),
      to: expect.any(Date),
    });
  });

  it('allows super admins to export an explicit tenant', async () => {
    await controller.exportTenant(
      createRequest({ role: 'SUPER_ADMIN', tenantId: 'root' }),
      'tenant-b',
    );

    expect(backupService.exportTenant).toHaveBeenCalledWith('tenant-b', {
      from: undefined,
      to: undefined,
    });
  });

  it('imports into the authenticated tenant for regular users', async () => {
    const snapshot = {
      kind: 'tenant-business-backup',
      schemaVersion: 1,
      sourceTenantId: 'tenant-a',
      datasets: {},
    } as any;

    await controller.importTenant(
      createRequest(),
      { snapshot, mode: TenantImportMode.REPLACE_PLANNING_DATA },
      'tenant-b',
    );

    expect(backupService.importTenant).toHaveBeenCalledWith(
      'tenant-a',
      snapshot,
      expect.objectContaining({ tenantId: 'tenant-a' }),
      TenantImportMode.REPLACE_PLANNING_DATA,
    );
  });
});
