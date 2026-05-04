import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { WorkPolicy } from './entities/work-policy.entity';
import { WorkPoliciesService } from './work-policies.service';

type WorkPolicyMock = Partial<WorkPolicy> & { id?: number };
type WorkPolicyRepositoryMock = {
  find: jest.Mock<Promise<WorkPolicyMock[]>, []>;
  findOne: jest.Mock<Promise<WorkPolicyMock | null>, [unknown?]>;
  create: jest.Mock<WorkPolicyMock, [WorkPolicyMock]>;
  save: jest.Mock<Promise<WorkPolicyMock>, [WorkPolicyMock]>;
  delete: jest.Mock<Promise<{ affected: number }>, [unknown?]>;
};

const createRepositoryMock = (): WorkPolicyRepositoryMock => ({
  find: jest.fn(() => Promise.resolve([])),
  findOne: jest.fn(() => Promise.resolve(null)),
  create: jest.fn((data: WorkPolicyMock) => data),
  save: jest.fn((data: WorkPolicyMock) =>
    Promise.resolve({ id: data.id ?? 1, ...data }),
  ),
  delete: jest.fn(() => Promise.resolve({ affected: 1 })),
});

describe('WorkPoliciesService', () => {
  let service: WorkPoliciesService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let auditService: { log: jest.Mock };

  const agent = {
    id: 10,
    tenantId: 'tenant-a',
    hospitalServiceId: 2,
    gradeId: 3,
  } as Agent;

  beforeEach(async () => {
    repository = createRepositoryMock();
    auditService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkPoliciesService,
        { provide: getRepositoryToken(WorkPolicy), useValue: repository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<WorkPoliciesService>(WorkPoliciesService);
  });

  it('resolves service+grade before grade, service and tenant defaults', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 1,
      restHoursAfterGuard: 12,
      maxGuardDuration: 10,
      maxWeeklyHours: 36,
      onCallCompensationPercent: 0.75,
    });

    const result = await service.resolveForAgent('tenant-a', agent);

    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', hospitalServiceId: 2, gradeId: 3 },
    });
    expect(result).toEqual({
      restHoursAfterGuard: 12,
      maxGuardDuration: 10,
      maxWeeklyHours: 36,
      onCallCompensationPercent: 0.75,
      source: 'service_grade',
      policyId: 1,
    });
  });

  it('falls back from service+grade to grade policy', async () => {
    repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 2,
      restHoursAfterGuard: 11,
      maxGuardDuration: 12,
      maxWeeklyHours: 44,
      onCallCompensationPercent: 0.25,
    });

    const result = await service.resolveForAgent('tenant-a', agent);

    expect(repository.findOne).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        source: 'grade',
        policyId: 2,
        restHoursAfterGuard: 11,
        maxGuardDuration: 12,
        maxWeeklyHours: 44,
        onCallCompensationPercent: 0.25,
      }),
    );
  });

  it('falls back from grade to service policy and then tenant default', async () => {
    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 4,
        restHoursAfterGuard: 24,
        maxGuardDuration: 24,
        maxWeeklyHours: 48,
        onCallCompensationPercent: 0,
      });

    const result = await service.resolveForAgent('tenant-a', agent);

    expect(repository.findOne).toHaveBeenCalledTimes(4);
    expect(result).toEqual(
      expect.objectContaining({
        source: 'tenant_default',
        policyId: 4,
        maxWeeklyHours: 48,
      }),
    );
  });

  it('returns system defaults when no configured policy matches', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.resolveForAgent('tenant-a', agent);

    expect(result).toEqual({
      restHoursAfterGuard: 24,
      maxGuardDuration: 24,
      maxWeeklyHours: 48,
      onCallCompensationPercent: 0,
      source: 'system_default',
    });
  });

  it('audits created policies with all configurable rule values', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockResolvedValue({
      id: 9,
      tenantId: 'tenant-a',
      hospitalServiceId: 2,
      gradeId: 3,
      restHoursAfterGuard: 12,
      maxGuardDuration: 10,
      maxWeeklyHours: 36,
      onCallCompensationPercent: 0.5,
    });

    await service.create(
      'tenant-a',
      {
        hospitalServiceId: 2,
        gradeId: 3,
        restHoursAfterGuard: 12,
        maxGuardDuration: 10,
        maxWeeklyHours: 36,
        onCallCompensationPercent: 0.5,
      },
      42,
    );

    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.WORK_POLICY,
      9,
      expect.objectContaining({
        action: 'CREATE_WORK_POLICY',
        after: expect.objectContaining({
          maxWeeklyHours: 36,
          onCallCompensationPercent: 0.5,
        }) as unknown,
      }),
    );
  });

  it('normalizes an omitted scope to tenant default values when creating a policy', async () => {
    repository.findOne.mockResolvedValue(null);

    await service.create('tenant-a', {}, 42);

    expect(repository.create).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      hospitalServiceId: null,
      gradeId: null,
      restHoursAfterGuard: 24,
      maxGuardDuration: 24,
      maxWeeklyHours: 48,
      onCallCompensationPercent: 0,
    });
    expect(repository.save).toHaveBeenCalled();
  });

  it('rejects invalid policy rule values before persisting', async () => {
    await expect(
      service.create(
        'tenant-a',
        {
          hospitalServiceId: 0,
          maxGuardDuration: 24,
          maxWeeklyHours: 48,
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        'tenant-a',
        {
          maxGuardDuration: 49,
          maxWeeklyHours: 48,
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        'tenant-a',
        {
          maxGuardDuration: 24,
          maxWeeklyHours: 20,
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        'tenant-a',
        {
          onCallCompensationPercent: 1.2,
        },
        42,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('rejects duplicate policy scopes before hitting the database unique constraint', async () => {
    repository.findOne.mockResolvedValue({
      id: 7,
      tenantId: 'tenant-a',
      hospitalServiceId: 2,
      gradeId: 3,
    });

    await expect(
      service.create(
        'tenant-a',
        {
          hospitalServiceId: 2,
          gradeId: 3,
          restHoursAfterGuard: 12,
          maxGuardDuration: 24,
          maxWeeklyHours: 48,
          onCallCompensationPercent: 0,
        },
        42,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', hospitalServiceId: 2, gradeId: 3 },
    });
    expect(repository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('audits updated policies with before and after snapshots', async () => {
    repository.findOne.mockResolvedValue({
      id: 9,
      tenantId: 'tenant-a',
      hospitalServiceId: 2,
      gradeId: 3,
      restHoursAfterGuard: 24,
      maxGuardDuration: 24,
      maxWeeklyHours: 48,
      onCallCompensationPercent: 0,
    });

    await service.update('tenant-a', 9, { maxWeeklyHours: 40 }, 42);

    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.WORK_POLICY,
      9,
      expect.objectContaining({
        action: 'UPDATE_WORK_POLICY',
        before: expect.objectContaining({ maxWeeklyHours: 48 }) as unknown,
        after: expect.objectContaining({ maxWeeklyHours: 40 }) as unknown,
      }),
    );
  });

  it('rejects updates that would collide with another policy scope', async () => {
    repository.findOne
      .mockResolvedValueOnce({
        id: 9,
        tenantId: 'tenant-a',
        hospitalServiceId: null,
        gradeId: null,
        restHoursAfterGuard: 24,
        maxGuardDuration: 24,
        maxWeeklyHours: 48,
        onCallCompensationPercent: 0,
      })
      .mockResolvedValueOnce({
        id: 10,
        tenantId: 'tenant-a',
        hospitalServiceId: 2,
        gradeId: null,
      });

    await expect(
      service.update('tenant-a', 9, { hospitalServiceId: 2 }, 42),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('rejects updates for policies outside the tenant', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.update('tenant-a', 9, { maxWeeklyHours: 40 }, 42),
    ).rejects.toThrow(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
