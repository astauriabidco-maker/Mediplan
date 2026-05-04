import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent, UserStatus } from '../agents/entities/agent.entity';
import { HealthRecord } from '../agents/entities/health-record.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { AgentAlert } from '../agents/entities/agent-alert.entity';
import { ComplianceAlertService } from './compliance-alert.service';
import {
  ComplianceRuleCode,
  ComplianceValidationService,
} from './compliance-validation.service';
import { Leave } from './entities/leave.entity';
import { Shift } from './entities/shift.entity';
import { WorkPolicy } from './entities/work-policy.entity';
import { WorkPoliciesService } from './work-policies.service';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (data) => ({ id: data.id ?? 1, ...data })),
  createQueryBuilder: jest.fn(),
});

const createQueryBuilderMock = (terminal: {
  getOne?: unknown;
  getCount?: number;
}) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn(async () => terminal.getOne ?? null),
  getCount: jest.fn(async () => terminal.getCount ?? 0),
});

describe('ComplianceValidationService', () => {
  let service: ComplianceValidationService;
  let shiftRepository: ReturnType<typeof createRepositoryMock>;
  let leaveRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let healthRecordRepository: ReturnType<typeof createRepositoryMock>;
  let agentCompRepository: ReturnType<typeof createRepositoryMock>;
  let workPolicyRepository: ReturnType<typeof createRepositoryMock>;
  let alertRepository: ReturnType<typeof createRepositoryMock>;
  let settingsService: { getSetting: jest.Mock };

  const start = new Date('2026-01-12T08:00:00.000Z');
  const end = new Date('2026-01-12T16:00:00.000Z');

  beforeEach(async () => {
    shiftRepository = createRepositoryMock();
    leaveRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
    healthRecordRepository = createRepositoryMock();
    agentCompRepository = createRepositoryMock();
    workPolicyRepository = createRepositoryMock();
    alertRepository = createRepositoryMock();
    settingsService = { getSetting: jest.fn(async () => 48) };

    agentRepository.findOne.mockResolvedValue({
      id: 10,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      hospitalServiceId: 2,
      gradeId: 3,
    });
    healthRecordRepository.find.mockResolvedValue([]);
    agentCompRepository.find.mockResolvedValue([]);
    workPolicyRepository.findOne.mockResolvedValue(null);
    alertRepository.findOne.mockResolvedValue(null);
    alertRepository.find.mockResolvedValue([]);
    shiftRepository.find.mockResolvedValue([]);
    leaveRepository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock({ getCount: 0 }),
    );
    mockShiftQueries();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceValidationService,
        WorkPoliciesService,
        ComplianceAlertService,
        { provide: getRepositoryToken(Shift), useValue: shiftRepository },
        {
          provide: getRepositoryToken(HealthRecord),
          useValue: healthRecordRepository,
        },
        {
          provide: getRepositoryToken(AgentCompetency),
          useValue: agentCompRepository,
        },
        { provide: getRepositoryToken(Leave), useValue: leaveRepository },
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        {
          provide: getRepositoryToken(WorkPolicy),
          useValue: workPolicyRepository,
        },
        { provide: getRepositoryToken(AgentAlert), useValue: alertRepository },
        {
          provide: LOCALE_RULES,
          useValue: {
            getWeeklyWorkLimit: () => 48,
            getDailyRestHours: () => 11,
          },
        },
        { provide: SettingsService, useValue: settingsService },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<ComplianceValidationService>(
      ComplianceValidationService,
    );
  });

  function mockShiftQueries(
    options: {
      previousShift?: Partial<Shift> | null;
      nextShift?: Partial<Shift> | null;
      overlappingShift?: Partial<Shift> | null;
    } = {},
  ) {
    shiftRepository.createQueryBuilder
      .mockReset()
      .mockReturnValueOnce(
        createQueryBuilderMock({ getOne: options.previousShift || null }),
      )
      .mockReturnValueOnce(
        createQueryBuilderMock({ getOne: options.nextShift || null }),
      )
      .mockReturnValueOnce(
        createQueryBuilderMock({ getOne: options.overlappingShift || null }),
      );
  }

  it('returns a stable structured result with metadata for compliant shifts', async () => {
    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result).toEqual(
      expect.objectContaining({
        isValid: true,
        blockingReasons: [],
        warnings: [],
        metadata: expect.objectContaining({
          constraints: expect.objectContaining({
            restHoursAfterGuard: 24,
            maxGuardDuration: 24,
            maxWeeklyHours: 48,
          }),
          shiftDurationHours: 8,
          weeklyHours: expect.objectContaining({
            current: 0,
            shift: 8,
            projected: 8,
            limit: 48,
          }),
        }),
      }),
    );
  });

  it('uses stable compliance codes for blocking violations', async () => {
    mockShiftQueries({
      overlappingShift: {
        id: 7,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons).toContain(ComplianceRuleCode.SHIFT_OVERLAP);
    expect(result.metadata[ComplianceRuleCode.SHIFT_OVERLAP]).toEqual({
      overlappingShiftId: 7,
    });
  });

  it('honors service and grade policy constraints before tenant defaults', async () => {
    workPolicyRepository.findOne.mockResolvedValueOnce({
      restHoursAfterGuard: 12,
      maxGuardDuration: 6,
      maxWeeklyHours: 36,
      onCallCompensationPercent: 0.5,
    });

    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(workPolicyRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', hospitalServiceId: 2, gradeId: 3 },
    });
    expect(result.blockingReasons).toContain(
      ComplianceRuleCode.MAX_GUARD_DURATION_EXCEEDED,
    );
    expect(result.metadata.constraints).toEqual({
      restHoursAfterGuard: 12,
      maxGuardDuration: 6,
      maxWeeklyHours: 36,
      onCallCompensationPercent: 0.5,
      source: 'service_grade',
    });
  });

  it('synchronizes compliance alerts from validation violations', async () => {
    settingsService.getSetting.mockResolvedValue(40);
    shiftRepository.find.mockResolvedValue([
      {
        start: new Date('2026-01-12T08:00:00.000Z'),
        end: new Date('2026-01-12T20:00:00.000Z'),
      },
      {
        start: new Date('2026-01-13T08:00:00.000Z'),
        end: new Date('2026-01-13T20:00:00.000Z'),
      },
      {
        start: new Date('2026-01-14T08:00:00.000Z'),
        end: new Date('2026-01-14T20:00:00.000Z'),
      },
    ]);

    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result.blockingReasons).toContain(
      ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
    );
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agentId: 10,
        metadata: expect.objectContaining({
          ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
        }),
      }),
    );
  });
});
