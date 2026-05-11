import { BadRequestException } from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformSettingsService,
} from './platform-settings.service';

const createRepository = () => {
  let row: any = null;
  return {
    findOne: jest.fn(async () => row),
    create: jest.fn((input: any) => ({ ...input })),
    save: jest.fn(async (input: any) => {
      row = {
        createdAt: row?.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...input,
      };
      return row;
    }),
    seed(input: any) {
      row = input;
    },
    current() {
      return row;
    },
  };
};

const actor = { id: 7, email: 'platform@mediplan.test' };

describe('PlatformSettingsService', () => {
  it('creates default settings on first read and audits the read', async () => {
    const repository = createRepository();
    const auditService = { log: jest.fn() };
    const service = new PlatformSettingsService(
      repository as any,
      auditService as any,
    );

    await expect(service.getSettings(actor)).resolves.toEqual(
      expect.objectContaining({
        sessionDurationMinutes:
          DEFAULT_PLATFORM_SETTINGS.sessionDurationMinutes,
        tenantDefaults: DEFAULT_PLATFORM_SETTINGS.tenantDefaults,
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'global' }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'PLATFORM',
      actor.id,
      AuditAction.READ,
      AuditEntityType.PLATFORM_SETTINGS,
      'global',
      expect.objectContaining({ action: 'READ_PLATFORM_SETTINGS' }),
    );
  });

  it('updates validated settings and writes a platform audit entry', async () => {
    const repository = createRepository();
    const auditService = { log: jest.fn() };
    const service = new PlatformSettingsService(
      repository as any,
      auditService as any,
    );

    await service.getSettings();
    await expect(
      service.updateSettings(
        {
          sessionDurationMinutes: 120,
          impersonationMinimumReasonLength: 30,
          tenantDefaults: {
            region: 'FR',
            isActive: false,
            contactEmail: 'ops@example.test',
          },
          adminCreationSecurity: {
            requireInvitationAcceptance: true,
            allowDirectPasswordProvisioning: false,
            minimumPasswordLength: 16,
          },
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        sessionDurationMinutes: 120,
        impersonationMinimumReasonLength: 30,
        tenantDefaults: {
          region: 'FR',
          isActive: false,
          contactEmail: 'ops@example.test',
        },
        adminCreationSecurity: {
          requireInvitationAcceptance: true,
          allowDirectPasswordProvisioning: false,
          minimumPasswordLength: 16,
        },
      }),
    );
    expect(auditService.log).toHaveBeenLastCalledWith(
      'PLATFORM',
      actor.id,
      AuditAction.UPDATE,
      AuditEntityType.PLATFORM_SETTINGS,
      'global',
      expect.objectContaining({
        action: 'UPDATE_PLATFORM_SETTINGS',
        changedFields: expect.arrayContaining([
          'sessionDurationMinutes',
          'tenantDefaults',
          'adminCreationSecurity',
        ]),
      }),
    );
  });

  it('enforces impersonation reason policy', async () => {
    const repository = createRepository();
    const service = new PlatformSettingsService(
      repository as any,
      { log: jest.fn() } as any,
    );

    await service.updateSettings(
      {
        impersonationReasonRequired: true,
        impersonationMinimumReasonLength: 10,
      },
      actor,
    );

    await expect(
      service.validateImpersonationReason('too short'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.validateImpersonationReason('Support incident INC-42'),
    ).resolves.toBe('Support incident INC-42');
  });

  it('blocks direct admin passwords when invitation acceptance is mandatory', async () => {
    const repository = createRepository();
    const service = new PlatformSettingsService(
      repository as any,
      { log: jest.fn() } as any,
    );

    await expect(
      service.validateTenantAdminCreation({ password: 'DirectPassw0rd!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.validateTenantAdminCreation({}),
    ).resolves.toBeUndefined();
  });
});
