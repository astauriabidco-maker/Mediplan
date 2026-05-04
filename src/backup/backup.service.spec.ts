/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { ForbiddenException } from '@nestjs/common';
import {
  BackupService,
  TenantBackupSnapshot,
  TenantImportMode,
} from './backup.service';

const createRepositoryMock = () => ({
  find: jest.fn(async () => []),
  findOne: jest.fn(async () => null),
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ id: data.id ?? 100, ...data })),
  update: jest.fn(async () => ({ affected: 1 })),
  delete: jest.fn(async () => ({ affected: 0 })),
});

const createService = () => {
  const repos = {
    facilities: createRepositoryMock(),
    hospitalServices: createRepositoryMock(),
    grades: createRepositoryMock(),
    agents: createRepositoryMock(),
    workPolicies: createRepositoryMock(),
    shifts: createRepositoryMock(),
    leaves: createRepositoryMock(),
    attendance: createRepositoryMock(),
    auditLogs: createRepositoryMock(),
  };

  const service = new BackupService(
    repos.facilities as any,
    repos.hospitalServices as any,
    repos.grades as any,
    repos.agents as any,
    repos.workPolicies as any,
    repos.shifts as any,
    repos.leaves as any,
    repos.attendance as any,
    repos.auditLogs as any,
  );

  return { service, repos };
};

const createSnapshot = (): TenantBackupSnapshot =>
  ({
    kind: 'tenant-business-backup',
    schemaVersion: 1,
    exportedAt: '2026-05-04T10:00:00.000Z',
    sourceTenantId: 'tenant-a',
    datasets: {
      facilities: [],
      hospitalServices: [],
      grades: [],
      agents: [
        {
          sourceId: 10,
          nom: 'Agent Test',
          email: 'agent@test.local',
          matricule: 'MAT-10',
          telephone: '+33123456789',
          role: 'AGENT',
          status: 'ACTIVE',
        },
      ],
      workPolicies: [],
      shifts: [
        {
          sourceId: 20,
          agentSourceId: 10,
          start: '2026-06-01T08:00:00.000Z',
          end: '2026-06-01T20:00:00.000Z',
          postId: 'URG',
          type: 'GARDE_SUR_PLACE',
          status: 'PLANNED',
          complianceExceptionApproved: true,
          complianceExceptionReason: 'Restauration test',
        },
      ],
      leaves: [],
      attendance: [],
      auditLogs: [],
    },
    planningComplianceSnapshot: {
      generatedAt: '2026-05-04T10:00:00.000Z',
      period: {},
      totals: {
        shifts: 1,
        approvedComplianceExceptions: 1,
        pendingComplianceExceptions: 0,
        workPolicies: 0,
        complianceAuditEvents: 0,
      },
      shifts: [],
      workPolicies: [],
      complianceAuditEvents: [],
    },
    integrity: {
      datasetCounts: {},
    },
  }) as TenantBackupSnapshot;

describe('BackupService', () => {
  it('restores a minimal planning snapshot into the target tenant', async () => {
    const { service, repos } = createService();

    repos.agents.save.mockResolvedValueOnce({
      id: 101,
      tenantId: 'tenant-a',
      email: 'agent@test.local',
      matricule: 'MAT-10',
    });
    repos.shifts.save.mockResolvedValueOnce({
      id: 202,
      tenantId: 'tenant-a',
    });

    const result = await service.importTenant(
      'tenant-a',
      createSnapshot(),
      { id: 42, tenantId: 'tenant-a', role: 'ADMIN' } as any,
      TenantImportMode.REPLACE_PLANNING_DATA,
    );

    expect(repos.attendance.delete).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
    });
    expect(repos.leaves.delete).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
    expect(repos.shifts.delete).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
    expect(repos.workPolicies.delete).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
    });
    expect(repos.agents.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        email: 'agent@test.local',
        managerId: null,
      }),
    );
    expect(repos.shifts.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agent: { id: 101 },
        postId: 'URG',
        complianceExceptionApproved: true,
      }),
    );
    expect(result.imported).toEqual(
      expect.objectContaining({ agents: 1, shifts: 1 }),
    );
  });

  it('rejects cross-tenant imports for non-super-admin actors', async () => {
    const { service } = createService();

    await expect(
      service.importTenant('tenant-b', createSnapshot(), {
        id: 42,
        tenantId: 'tenant-a',
        role: 'ADMIN',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
