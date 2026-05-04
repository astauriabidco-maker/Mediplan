import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { Agent, UserStatus } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { HealthRecord } from '../agents/entities/health-record.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import { DocumentsService } from '../documents/documents.service';
import { EventsGateway } from '../events/events.gateway';
import { SettingsService } from '../settings/settings.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { Leave } from './entities/leave.entity';
import { Shift, ShiftType } from './entities/shift.entity';
import { ShiftApplication } from './entities/shift-application.entity';
import { WorkPolicy } from './entities/work-policy.entity';
import { ComplianceValidationService } from './compliance-validation.service';
import { ComplianceRuleCode } from './compliance-validation.types';
import { PlanningService } from './planning.service';
import { WorkPoliciesService } from './work-policies.service';
import {
  AgentAlert,
  AlertSeverity,
} from '../agents/entities/agent-alert.entity';
import { ComplianceAlertService } from './compliance-alert.service';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ id: data.id ?? 1, ...data })),
  createQueryBuilder: jest.fn(),
});

const createQueryBuilderMock = (terminal: {
  getOne?: unknown;
  getCount?: number;
  getMany?: unknown[];
}) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getOne: jest.fn(async () => terminal.getOne ?? null),
  getCount: jest.fn(async () => terminal.getCount ?? 0),
  getMany: jest.fn(async () => terminal.getMany ?? []),
});

const createPublishQueryBuilderMock = (affected = 2) => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn(async () => ({ affected })),
});

describe('PlanningService.validateShift', () => {
  let service: PlanningService;
  let shiftRepository: ReturnType<typeof createRepositoryMock>;
  let leaveRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let hospitalServiceRepository: ReturnType<typeof createRepositoryMock>;
  let healthRecordRepository: ReturnType<typeof createRepositoryMock>;
  let agentCompRepository: ReturnType<typeof createRepositoryMock>;
  let workPolicyRepository: ReturnType<typeof createRepositoryMock>;
  let alertRepository: ReturnType<typeof createRepositoryMock>;
  let settingsService: { getSetting: jest.Mock };
  let auditService: { log: jest.Mock; getLogs: jest.Mock };

  beforeEach(async () => {
    shiftRepository = createRepositoryMock();
    leaveRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
    hospitalServiceRepository = createRepositoryMock();
    healthRecordRepository = createRepositoryMock();
    agentCompRepository = createRepositoryMock();
    workPolicyRepository = createRepositoryMock();
    alertRepository = createRepositoryMock();
    settingsService = { getSetting: jest.fn(async () => 48) };
    auditService = { log: jest.fn(), getLogs: jest.fn(async () => []) };

    agentRepository.findOne.mockResolvedValue({
      id: 10,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
    });
    healthRecordRepository.find.mockResolvedValue([]);
    agentCompRepository.find.mockResolvedValue([]);
    workPolicyRepository.findOne.mockResolvedValue(null);
    alertRepository.findOne.mockResolvedValue(null);
    alertRepository.find.mockResolvedValue([]);
    shiftRepository.find.mockResolvedValue([]);
    mockLeaveOverlapCount(0);
    mockShiftQueries();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
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
          provide: getRepositoryToken(HospitalService),
          useValue: hospitalServiceRepository,
        },
        {
          provide: getRepositoryToken(WorkPolicy),
          useValue: workPolicyRepository,
        },
        { provide: getRepositoryToken(AgentAlert), useValue: alertRepository },
        {
          provide: getRepositoryToken(ShiftApplication),
          useValue: createRepositoryMock(),
        },
        {
          provide: LOCALE_RULES,
          useValue: {
            getWeeklyWorkLimit: () => 48,
            getDailyRestHours: () => 11,
          },
        },
        { provide: AuditService, useValue: auditService },
        { provide: WhatsappService, useValue: { sendMessage: jest.fn() } },
        {
          provide: EventsGateway,
          useValue: { broadcastPlanningUpdate: jest.fn() },
        },
        {
          provide: DocumentsService,
          useValue: { generateContractForShift: jest.fn() },
        },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
  });

  const start = new Date('2026-01-12T08:00:00.000Z');
  const end = new Date('2026-01-12T16:00:00.000Z');
  const futureStart = new Date('2026-06-12T08:00:00.000Z');
  const futureEnd = new Date('2026-06-12T16:00:00.000Z');

  function mockLeaveOverlapCount(count: number) {
    leaveRepository.createQueryBuilder.mockReturnValue(
      createQueryBuilderMock({ getCount: count }),
    );
  }

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

  function mockShiftValidationQueries(count: number) {
    shiftRepository.createQueryBuilder.mockReset();
    for (let index = 0; index < count * 3; index += 1) {
      shiftRepository.createQueryBuilder.mockReturnValueOnce(
        createQueryBuilderMock({ getOne: null }),
      );
    }
  }

  it('returns a structured success result when the shift is compliant', async () => {
    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result).toEqual(
      expect.objectContaining({
        isValid: true,
        blockingReasons: [],
        warnings: [],
        metadata: expect.objectContaining({
          shiftDurationHours: 8,
          weeklyHours: expect.objectContaining({ projected: 8, limit: 48 }),
        }),
      }),
    );
  });

  it('blocks shifts overlapping an approved leave', async () => {
    mockLeaveOverlapCount(1);

    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons).toContain('APPROVED_LEAVE_OVERLAP');
  });

  it('blocks shifts that exceed the weekly hours limit', async () => {
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

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons).toContain('WEEKLY_HOURS_LIMIT_EXCEEDED');
  });

  it('blocks shifts that violate minimum rest before the shift', async () => {
    mockShiftQueries({
      previousShift: {
        id: 1,
        end: new Date('2026-01-12T02:00:00.000Z'),
      },
    });

    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons).toContain(
      'REST_TIME_BEFORE_SHIFT_TOO_SHORT',
    );
  });

  it('blocks shifts that overlap another shift for the same agent', async () => {
    mockShiftQueries({
      overlappingShift: {
        id: 2,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const result = await service.validateShift('tenant-a', 10, start, end);

    expect(result.isValid).toBe(false);
    expect(result.blockingReasons).toContain('SHIFT_OVERLAP');
  });

  it('creates a pending shift only after structured validation and writes audit details', async () => {
    const savedShift = {
      id: 11,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-1',
      type: ShiftType.GARDE_SUR_PLACE,
      facilityId: 3,
      status: 'PENDING',
    };
    shiftRepository.save.mockResolvedValue(savedShift);

    const result = await service.createShift('tenant-a', 99, {
      agentId: 10,
      start,
      end,
      postId: 'URG-1',
      type: ShiftType.GARDE_SUR_PLACE,
      facilityId: 3,
    });

    expect(result).toBe(savedShift);
    expect(shiftRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agent: { id: 10 },
        start,
        end,
        postId: 'URG-1',
        type: ShiftType.GARDE_SUR_PLACE,
        facilityId: 3,
        status: 'PENDING',
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.CREATE,
      AuditEntityType.SHIFT,
      11,
      expect.objectContaining({
        action: 'CREATE_SHIFT',
        validation: expect.objectContaining({
          isValid: true,
          blockingReasons: [],
          warnings: [],
        }),
        after: expect.objectContaining({
          id: 11,
          agentId: 10,
          status: 'PENDING',
        }),
      }),
    );
  });

  it('rejects shift creation with a BadRequestException when validation blocks it', async () => {
    mockLeaveOverlapCount(1);

    await expect(
      service.createShift('tenant-a', 99, {
        agentId: 10,
        start,
        end,
        postId: 'URG-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(shiftRepository.save).not.toHaveBeenCalled();
  });

  it('assigns a replacement with requester audit instead of agent audit', async () => {
    const savedShift = {
      id: 12,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-2',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
    };
    shiftRepository.save.mockResolvedValue(savedShift);

    await service.assignReplacement('tenant-a', 99, 10, start, end, 'URG-2');

    expect(shiftRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agent: { id: 10 },
        postId: 'URG-2',
        status: 'VALIDATED',
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.CREATE,
      AuditEntityType.SHIFT,
      12,
      expect.objectContaining({
        action: 'ASSIGN_REPLACEMENT',
        agentId: 10,
        after: expect.objectContaining({
          id: 12,
          agentId: 10,
          status: 'VALIDATED',
        }),
      }),
    );
  });

  it('updates a shift through structured validation and audits before and after snapshots', async () => {
    const oldStart = new Date('2026-01-12T06:00:00.000Z');
    const oldEnd = new Date('2026-01-12T14:00:00.000Z');
    const existingShift = {
      id: 5,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: oldStart,
      end: oldEnd,
      postId: 'URG-3',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.findOne.mockResolvedValue(existingShift);
    shiftRepository.save.mockImplementation(async (shift) => shift);

    await service.updateShift('tenant-a', 5, start, end, 99);

    expect(shiftRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ start, end }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      5,
      expect.objectContaining({
        action: 'UPDATE_SHIFT',
        before: expect.objectContaining({ start: oldStart, end: oldEnd }),
        after: expect.objectContaining({ start, end }),
      }),
    );
  });

  it('reassigns a shift through structured validation and audits the reassignment', async () => {
    const existingShift = {
      id: 15,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-4',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    const newAgent = {
      id: 77,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
    };
    shiftRepository.findOne.mockResolvedValue(existingShift);
    agentRepository.findOne.mockResolvedValueOnce(newAgent);
    shiftRepository.save.mockImplementation(async (shift) => shift);

    await service.reassignShift('tenant-a', 99, 15, 77, {
      reason: 'Rééquilibrage charge critique',
      recommendationId: 'recommendation:shift:15',
      alertId: 8,
    });

    expect(shiftRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ agent: newAgent }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      15,
      expect.objectContaining({
        action: 'REASSIGN_SHIFT',
        reason: 'Rééquilibrage charge critique',
        actionManager: {
          justification: 'Rééquilibrage charge critique',
          recommendationId: 'recommendation:shift:15',
          alertId: 8,
        },
        previousAgentId: 10,
        newAgentId: 77,
      }),
    );
  });

  it('requests a replacement for a future shift and audits the reason', async () => {
    const shift = {
      id: 16,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: futureStart,
      end: futureEnd,
      postId: 'URG-5',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: false,
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    shiftRepository.save.mockImplementation(async (saved) => saved);

    const result = await service.requestReplacement(
      'tenant-a',
      99,
      16,
      {
        reason: 'Repos insuffisant',
        recommendationId: 'recommendation:shift:16',
        alertId: 8,
      },
    );

    expect(result.isSwapRequested).toBe(true);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      16,
      expect.objectContaining({
        action: 'REQUEST_REPLACEMENT',
        reason: 'Repos insuffisant',
        actionManager: {
          justification: 'Repos insuffisant',
          recommendationId: 'recommendation:shift:16',
          alertId: 8,
        },
      }),
    );
  });

  it('resolves a planning alert and audits the resolution reason', async () => {
    const alert = {
      id: 8,
      tenantId: 'tenant-a',
      agentId: 10,
      type: 'COMPLIANCE',
      severity: 'HIGH',
      isAcknowledged: false,
      isResolved: false,
      resolvedAt: null,
      resolutionReason: null,
    };
    alertRepository.findOne.mockResolvedValue(alert);
    alertRepository.save.mockImplementation(async (saved) => saved);

    const result = await service.resolvePlanningAlert(
      'tenant-a',
      99,
      8,
      {
        reason: 'Réassigné',
        recommendationId: 'recommendation:alert:8',
      },
    );

    expect(result.isResolved).toBe(true);
    expect(result.isAcknowledged).toBe(true);
    expect(result.resolutionReason).toBe('Réassigné');
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      '10',
      expect.objectContaining({
        action: 'RESOLVE_PLANNING_ALERT',
        alertId: 8,
        resolutionReason: 'Réassigné',
        actionManager: {
          justification: 'Réassigné',
          recommendationId: 'recommendation:alert:8',
          alertId: 8,
        },
      }),
    );
  });

  it('revalidates a shift and audits the resulting validation', async () => {
    const shift = {
      id: 17,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-7',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    mockShiftQueries();

    const result = await service.revalidateShift('tenant-a', 99, 17);

    expect(result.validation).toEqual(
      expect.objectContaining({ isValid: true }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      17,
      expect.objectContaining({
        action: 'REVALIDATE_SHIFT',
        validation: expect.objectContaining({ isValid: true }),
      }),
    );
  });

  it('approves a justified compliance exception and audits the validation context', async () => {
    const shift = {
      id: 18,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-8',
      type: ShiftType.NORMAL,
      status: 'PENDING',
      complianceExceptionApproved: false,
      complianceExceptionReason: null,
      complianceExceptionApprovedById: null,
      complianceExceptionApprovedAt: null,
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    shiftRepository.save.mockImplementation(async (saved) => saved);
    mockShiftQueries({
      overlappingShift: {
        id: 19,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const result = await service.approveShiftException(
      'tenant-a',
      99,
      18,
      'Continuité de service critique',
    );

    expect(result.complianceExceptionApproved).toBe(true);
    expect(result.complianceExceptionReason).toBe(
      'Continuité de service critique',
    );
    expect(result.complianceExceptionApprovedById).toBe(99);
    expect(result.complianceExceptionApprovedAt).toBeInstanceOf(Date);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      18,
      expect.objectContaining({
        action: 'APPROVE_COMPLIANCE_EXCEPTION',
        reason: 'Continuité de service critique',
        validation: expect.objectContaining({
          isValid: false,
          blockingReasons: expect.arrayContaining(['SHIFT_OVERLAP']),
        }),
      }),
    );
  });

  it('rejects compliance exceptions without justification or without violations', async () => {
    await expect(
      service.approveShiftException('tenant-a', 99, 18, '   '),
    ).rejects.toThrow(BadRequestException);

    const shift = {
      id: 18,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-8',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    mockShiftQueries();

    await expect(
      service.approveShiftException('tenant-a', 99, 18, 'Pas nécessaire'),
    ).rejects.toThrow(BadRequestException);
  });

  it('publishes pending shifts only after a clean compliance scan and audits the report', async () => {
    const pendingShift = {
      id: 40,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-6',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.find
      .mockResolvedValueOnce([pendingShift])
      .mockResolvedValue([]);
    shiftRepository.save.mockImplementation(async (shift) => shift);
    mockShiftQueries();

    const result = await service.publishPlanning('tenant-a', 99, start, end);

    expect(result).toEqual({
      message: 'Planning publié avec succès',
      affected: 1,
      report: expect.objectContaining({
        totalPending: 1,
        validatedShiftIds: [40],
        violations: [],
        warnings: [],
      }),
    });
    expect(shiftRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 40,
        status: 'VALIDATED',
      }),
    ]);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      `${start.toISOString()}_${end.toISOString()}`,
      expect.objectContaining({
        action: 'PUBLISH_PLANNING',
        blocked: false,
        affected: 1,
        report: expect.objectContaining({
          totalPending: 1,
          validatedShiftIds: [40],
          violations: [],
        }),
      }),
    );
  });

  it('blocks planning publication when a pending shift has compliance violations and audits the failed report', async () => {
    const pendingShift = {
      id: 41,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-7',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.find
      .mockResolvedValueOnce([pendingShift])
      .mockResolvedValue([]);
    mockShiftQueries({
      overlappingShift: {
        id: 42,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    await expect(
      service.publishPlanning('tenant-a', 99, start, end),
    ).rejects.toThrow(BadRequestException);

    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      `${start.toISOString()}_${end.toISOString()}`,
      expect.objectContaining({
        action: 'PUBLISH_PLANNING',
        blocked: true,
        report: expect.objectContaining({
          totalPending: 1,
          validatedShiftIds: [],
          violations: [
            expect.objectContaining({
              shiftId: 41,
              agentId: 10,
              blockingReasons: expect.arrayContaining(['SHIFT_OVERLAP']),
            }),
          ],
        }),
      }),
    );
  });

  it('previews planning publication without saving shifts or writing publication audit', async () => {
    const pendingShift = {
      id: 42,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-PREVIEW',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.find
      .mockResolvedValueOnce([pendingShift])
      .mockResolvedValue([]);
    mockShiftQueries({
      overlappingShift: {
        id: 52,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const result = await service.previewPublishPlanning('tenant-a', start, end);

    expect(result).toEqual({
      publishable: false,
      report: expect.objectContaining({
        publishable: false,
        totalPending: 1,
        validatedShiftIds: [],
        violations: [
          expect.objectContaining({
            shiftId: 42,
            agentId: 10,
            blockingReasons: expect.arrayContaining(['SHIFT_OVERLAP']),
          }),
        ],
        warnings: [],
        recommendations: expect.arrayContaining([
          'Réassigner ou déplacer le shift en chevauchement.',
        ]),
      }),
    });
    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('publishes a non-compliant pending shift when a controlled exception is approved', async () => {
    const approvedAt = new Date('2026-01-11T10:00:00.000Z');
    const pendingShift = {
      id: 43,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-9',
      type: ShiftType.NORMAL,
      status: 'PENDING',
      complianceExceptionApproved: true,
      complianceExceptionReason: 'Continuité de service critique',
      complianceExceptionApprovedById: 99,
      complianceExceptionApprovedAt: approvedAt,
    };
    shiftRepository.find
      .mockResolvedValueOnce([pendingShift])
      .mockResolvedValue([]);
    shiftRepository.save.mockImplementation(async (shift) => shift);
    mockShiftQueries({
      overlappingShift: {
        id: 44,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const result = await service.publishPlanning('tenant-a', 99, start, end);

    expect(result.report.violations).toEqual([]);
    expect(result.report.validatedShiftIds).toEqual([43]);
    expect(result.report.warnings).toEqual([
      expect.objectContaining({
        shiftId: 43,
        agentId: 10,
        warnings: expect.arrayContaining(['SHIFT_OVERLAP']),
        metadata: expect.objectContaining({
          complianceException: {
            approved: true,
            reason: 'Continuité de service critique',
            approvedById: 99,
            approvedAt,
          },
        }),
      }),
    ]);
    expect(shiftRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ id: 43, status: 'VALIDATED' }),
    ]);
  });

  it('reuses validation lookups and saves published shifts in one batch', async () => {
    const pendingShifts = [
      {
        id: 45,
        tenantId: 'tenant-a',
        agent: { id: 10 },
        start,
        end,
        postId: 'URG-10',
        type: ShiftType.NORMAL,
        status: 'PENDING',
      },
      {
        id: 46,
        tenantId: 'tenant-a',
        agent: { id: 10 },
        start: new Date('2026-01-13T08:00:00.000Z'),
        end: new Date('2026-01-13T16:00:00.000Z'),
        postId: 'URG-11',
        type: ShiftType.NORMAL,
        status: 'PENDING',
      },
    ];
    shiftRepository.find
      .mockResolvedValueOnce(pendingShifts)
      .mockResolvedValue([]);
    shiftRepository.save.mockImplementation(async (shifts) => shifts);
    mockShiftValidationQueries(pendingShifts.length);

    const result = await service.publishPlanning('tenant-a', 99, start, end);

    expect(result.affected).toBe(2);
    expect(result.report.validatedShiftIds).toEqual([45, 46]);
    expect(agentRepository.findOne).toHaveBeenCalledTimes(1);
    expect(healthRecordRepository.find).toHaveBeenCalledTimes(1);
    expect(agentCompRepository.find).toHaveBeenCalledTimes(1);
    expect(settingsService.getSetting).toHaveBeenCalledTimes(1);
    expect(shiftRepository.find).toHaveBeenCalledTimes(2);
    expect(shiftRepository.save).toHaveBeenCalledTimes(1);
    expect(shiftRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ id: 45, status: 'VALIDATED' }),
      expect.objectContaining({ id: 46, status: 'VALIDATED' }),
    ]);
  });

  it('reads compliance publication reports from planning audit logs', async () => {
    const report = {
      totalPending: 1,
      validatedShiftIds: [40],
      violations: [],
      warnings: [],
    };
    auditService.getLogs.mockResolvedValue([
      {
        id: 7,
        timestamp: new Date('2026-01-12T09:00:00.000Z'),
        actorId: 99,
        entityId: '2026-01-12T00:00:00.000Z_2026-01-19T00:00:00.000Z',
        details: {
          blocked: false,
          affected: 1,
          report,
        },
      },
    ]);

    const result = await service.getComplianceReports('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      limit: 10,
    });

    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-a', {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
      detailAction: 'PUBLISH_PLANNING',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: undefined,
      limit: 10,
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        actorId: 99,
        blocked: false,
        affected: 1,
        report,
      }),
    ]);
  });

  it('builds a readable planning compliance timeline from audit logs', async () => {
    const publishedAt = new Date('2026-01-12T10:00:00.000Z');
    const reassignedAt = new Date('2026-01-12T09:00:00.000Z');
    auditService.getLogs.mockResolvedValue([
      {
        id: 11,
        timestamp: publishedAt,
        actorId: 99,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PLANNING,
        entityId: '2026-01-12T00:00:00.000Z_2026-01-19T00:00:00.000Z',
        details: {
          action: 'PUBLISH_PLANNING',
          blocked: true,
          affected: 0,
          report: {
            totalPending: 2,
            validatedShiftIds: [],
            violations: [{ shiftId: 80, agentId: 10 }],
            warnings: [],
          },
        },
      },
      {
        id: 10,
        timestamp: reassignedAt,
        actorId: 99,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.SHIFT,
        entityId: '80',
        details: {
          action: 'REASSIGN_SHIFT',
          previousAgentId: 7,
          newAgentId: 10,
          validation: {
            isValid: true,
            blockingReasons: [],
            warnings: [],
          },
          before: { id: 80, agentId: 7 },
          after: { id: 80, agentId: 10 },
        },
      },
      {
        id: 9,
        timestamp: new Date('2026-01-12T08:00:00.000Z'),
        actorId: 99,
        action: AuditAction.READ,
        entityType: AuditEntityType.AGENT,
        entityId: '7',
        details: { action: 'READ_AGENT' },
      },
    ]);

    const result = await service.getPlanningComplianceTimeline('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      agentId: 10,
      shiftId: 80,
      limit: 50,
    });

    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      limit: 50,
    });
    expect(result).toEqual({
      tenantId: 'tenant-a',
      period: {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
      },
      filters: {
        agentId: 10,
        shiftId: 80,
      },
      total: 2,
      items: [
        {
          id: 11,
          timestamp: publishedAt,
          actorId: 99,
          action: 'PUBLISH_PLANNING',
          entity: {
            type: AuditEntityType.PLANNING,
            id: '2026-01-12T00:00:00.000Z_2026-01-19T00:00:00.000Z',
          },
          label: 'Publication planning refusée',
          status: 'BLOCKED',
          severity: AlertSeverity.HIGH,
          details: {
            blocked: true,
            affected: 0,
            totalPending: 2,
            validatedShifts: 0,
            violations: 1,
            warnings: 0,
          },
        },
        {
          id: 10,
          timestamp: reassignedAt,
          actorId: 99,
          action: 'REASSIGN_SHIFT',
          entity: {
            type: AuditEntityType.SHIFT,
            id: '80',
          },
          label: 'Garde réassignée',
          status: 'VALID',
          severity: undefined,
          details: {
            previousAgentId: 7,
            newAgentId: 10,
            validation: {
              isValid: true,
              blockingReasons: [],
              warnings: [],
            },
          },
        },
      ],
    });
  });

  it('builds a compliance summary from open alerts, blocked pending shifts and refused publications', async () => {
    alertRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        agentId: 10,
        severity: 'HIGH',
        isResolved: false,
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        agentId: 20,
        severity: 'MEDIUM',
        isResolved: false,
      },
    ]);
    auditService.getLogs.mockResolvedValue([
      { id: 1, details: { blocked: true } },
      { id: 2, details: { blocked: false } },
      { id: 3, details: { blocked: true } },
    ]);

    shiftRepository.createQueryBuilder
      .mockReset()
      .mockReturnValueOnce(
        createQueryBuilderMock({
          getMany: [
            {
              id: 70,
              tenantId: 'tenant-a',
              agent: { id: 10 },
              start,
              end,
              status: 'PENDING',
            },
            {
              id: 71,
              tenantId: 'tenant-a',
              start,
              end,
              status: 'PENDING',
            },
          ],
        }),
      )
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }))
      .mockReturnValueOnce(
        createQueryBuilderMock({
          getOne: {
            id: 72,
            start: new Date('2026-01-12T10:00:00.000Z'),
            end: new Date('2026-01-12T18:00:00.000Z'),
          },
        }),
      );

    const result = await service.getComplianceSummary('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    });

    expect(alertRepository.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', isResolved: false },
    });
    expect(auditService.getLogs).toHaveBeenCalledWith('tenant-a', {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
      detailAction: 'PUBLISH_PLANNING',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      limit: 1000,
    });
    expect(result.counters).toEqual({
      openAlerts: 2,
      blockedShifts: 2,
      agentsAtRisk: 2,
      refusedPublications: 2,
    });
    expect(result.openAlertsBySeverity).toEqual({
      HIGH: 1,
      MEDIUM: 1,
      LOW: 0,
    });
    expect(result.blockedShiftPreview).toEqual([
      expect.objectContaining({ shiftId: 70, agentId: 10 }),
      { shiftId: 71, blockingReasons: ['UNASSIGNED_SHIFT'] },
    ]);
    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it('builds a manager worklist for rest, overload, missing competency and leave conflicts', async () => {
    alertRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        agentId: 10,
        severity: 'HIGH',
        isResolved: false,
        createdAt: new Date('2026-01-10T08:00:00.000Z'),
        metadata: { ruleCode: ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED },
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        agentId: 11,
        severity: 'HIGH',
        isResolved: false,
        createdAt: new Date('2026-01-10T09:00:00.000Z'),
        metadata: { ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED },
      },
    ]);

    shiftRepository.createQueryBuilder
      .mockReset()
      .mockReturnValueOnce(
        createQueryBuilderMock({
          getMany: [
            {
              id: 80,
              tenantId: 'tenant-a',
              agent: { id: 12 },
              start,
              end,
              status: 'PENDING',
            },
            {
              id: 81,
              tenantId: 'tenant-a',
              agent: { id: 13 },
              start: futureStart,
              end: futureEnd,
              status: 'PENDING',
            },
          ],
        }),
      )
      .mockReturnValueOnce(
        createQueryBuilderMock({
          getOne: {
            id: 79,
            start: new Date('2026-01-12T00:00:00.000Z'),
            end: new Date('2026-01-12T06:00:00.000Z'),
          },
        }),
      )
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ getOne: null }));
    leaveRepository.createQueryBuilder
      .mockReturnValueOnce(createQueryBuilderMock({ getCount: 0 }))
      .mockReturnValueOnce(createQueryBuilderMock({ getCount: 1 }));

    const result = await service.getManagerWorklist('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    });

    expect(result.total).toBe(4);
    expect(result.counters).toEqual({
      REST_INSUFFICIENT: 1,
      WEEKLY_OVERLOAD: 1,
      MISSING_COMPETENCY: 1,
      LEAVE_CONFLICT: 1,
    });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'ALERT',
          category: 'MISSING_COMPETENCY',
          agentId: 10,
          alertId: 1,
        }),
        expect.objectContaining({
          source: 'ALERT',
          category: 'WEEKLY_OVERLOAD',
          agentId: 11,
          alertId: 2,
        }),
        expect.objectContaining({
          source: 'SHIFT_VALIDATION',
          category: 'REST_INSUFFICIENT',
          agentId: 12,
          shiftId: 80,
        }),
        expect.objectContaining({
          source: 'SHIFT_VALIDATION',
          category: 'LEAVE_CONFLICT',
          agentId: 13,
          shiftId: 81,
        }),
      ]),
    );
    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it('prioritizes manager decision recommendations from the worklist', async () => {
    jest.spyOn(service, 'getManagerWorklist').mockResolvedValue({
      tenantId: 'tenant-a',
      period: {},
      total: 3,
      counters: {
        REST_INSUFFICIENT: 1,
        WEEKLY_OVERLOAD: 1,
        MISSING_COMPETENCY: 1,
        LEAVE_CONFLICT: 0,
      },
      items: [
        {
          id: 'shift:1:WEEKLY_HOURS_LIMIT_EXCEEDED',
          category: 'WEEKLY_OVERLOAD',
          source: 'SHIFT_VALIDATION',
          severity: AlertSeverity.HIGH,
          agentId: 10,
          shiftId: 1,
          title: 'Surcharge hebdomadaire',
          ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          dueAt: new Date('2026-01-12T08:00:00.000Z'),
        },
        {
          id: 'shift:2:REST_TIME_BEFORE_SHIFT_TOO_SHORT',
          category: 'REST_INSUFFICIENT',
          source: 'SHIFT_VALIDATION',
          severity: AlertSeverity.HIGH,
          agentId: 11,
          shiftId: 2,
          title: 'Repos insuffisant avant garde',
          ruleCode: ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
          dueAt: new Date('2026-01-12T07:00:00.000Z'),
        },
        {
          id: 'alert:3:MANDATORY_COMPETENCY_EXPIRED',
          category: 'MISSING_COMPETENCY',
          source: 'ALERT',
          severity: 'HIGH',
          agentId: 12,
          alertId: 3,
          title: 'Compétence obligatoire manquante ou expirée',
          ruleCode: ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED,
        },
      ],
    });

    const result = await service.getDecisionRecommendations('tenant-a');

    expect(result.total).toBe(3);
    expect(result.recommendations[0]).toEqual(
      expect.objectContaining({
        category: 'REST_INSUFFICIENT',
        shiftId: 2,
        recommendedActions: expect.arrayContaining([
          'REASSIGN_SHIFT',
          'REQUEST_REPLACEMENT',
          'REVALIDATE_SHIFT',
        ]),
      }),
    );
    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'MISSING_COMPETENCY',
          recommendedActions: expect.arrayContaining([
            'REVIEW_AGENT_FILE',
            'REASSIGN_SHIFT',
          ]),
        }),
      ]),
    );
  });

  it('builds shift decision suggestions with ranked replacement candidates', async () => {
    jest.spyOn(service, 'explainShiftCompliance').mockResolvedValue({
      shift: {
        id: 80,
        tenantId: 'tenant-a',
        agentId: 10,
        postId: 'URG',
      },
      validation: {
        isValid: false,
        blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
        warnings: [],
        metadata: {},
      },
    });

    const result = await service.getShiftDecisionSuggestions('tenant-a', 80, [
      {
        id: 20,
        nom: 'Agent disponible',
        jobTitle: 'IDE',
        hospitalServiceId: 1,
      } as Agent,
    ]);

    expect(result.recommendedActions).toEqual(
      expect.arrayContaining([
        'REASSIGN_SHIFT',
        'REQUEST_REPLACEMENT',
        'REVALIDATE_SHIFT',
      ]),
    );
    expect(result.replacements).toEqual([
      expect.objectContaining({
        agentId: 20,
        displayName: 'Agent disponible',
        score: 85,
        reasons: expect.arrayContaining([
          'AVAILABLE_FOR_SHIFT',
          'DIFFERENT_AGENT',
          'HAS_SERVICE_ASSIGNMENT',
        ]),
      }),
    ]);
  });

  it('builds service indicators for coverage, overload, publication compliance and alert severity', async () => {
    hospitalServiceRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        name: 'Urgences',
        code: 'URG',
        isActive: true,
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        name: 'Réanimation',
        code: 'REA',
        isActive: true,
      },
    ]);
    agentRepository.find.mockResolvedValue([
      { id: 10, tenantId: 'tenant-a', hospitalServiceId: 1 },
      { id: 11, tenantId: 'tenant-a', hospitalServiceId: 1 },
      { id: 20, tenantId: 'tenant-a', hospitalServiceId: 2 },
    ]);
    settingsService.getSetting.mockResolvedValue(40);
    shiftRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        agent: { id: 10, hospitalServiceId: 1 },
        start: new Date('2026-01-12T08:00:00.000Z'),
        end: new Date('2026-01-13T08:00:00.000Z'),
        status: 'VALIDATED',
        complianceExceptionApproved: false,
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        agent: { id: 10, hospitalServiceId: 1 },
        start: new Date('2026-01-14T08:00:00.000Z'),
        end: new Date('2026-01-15T09:00:00.000Z'),
        status: 'PENDING',
        complianceExceptionApproved: true,
      },
      {
        id: 3,
        tenantId: 'tenant-a',
        agent: { id: 20, hospitalServiceId: 2 },
        start: new Date('2026-01-12T08:00:00.000Z'),
        end: new Date('2026-01-12T16:00:00.000Z'),
        status: 'PUBLISHED',
        complianceExceptionApproved: false,
      },
    ]);
    alertRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        agentId: 10,
        agent: { id: 10, hospitalServiceId: 1 },
        severity: 'HIGH',
        isResolved: false,
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        agentId: 20,
        agent: { id: 20, hospitalServiceId: 2 },
        severity: 'LOW',
        isResolved: false,
      },
    ]);

    const result = await service.getServiceComplianceIndicators('tenant-a', {
      from: new Date('2026-01-12T00:00:00.000Z'),
      to: new Date('2026-01-19T00:00:00.000Z'),
    });

    expect(hospitalServiceRepository.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', isActive: true },
      order: { name: 'ASC' },
    });
    expect(result.services).toEqual([
      expect.objectContaining({
        serviceId: 1,
        serviceName: 'Urgences',
        activeAgents: 2,
        plannedShifts: 2,
        validatedOrPublishedShifts: 1,
        pendingShifts: 1,
        coverageRate: 51,
        weeklyOverloadAgents: 1,
        publishedComplianceRate: 50,
        exceptionsApproved: 1,
        openAlertsBySeverity: { HIGH: 1, MEDIUM: 0, LOW: 0 },
      }),
      expect.objectContaining({
        serviceId: 2,
        serviceName: 'Réanimation',
        activeAgents: 1,
        plannedShifts: 1,
        validatedOrPublishedShifts: 1,
        pendingShifts: 0,
        coverageRate: 17,
        weeklyOverloadAgents: 0,
        publishedComplianceRate: 100,
        exceptionsApproved: 0,
        openAlertsBySeverity: { HIGH: 0, MEDIUM: 0, LOW: 1 },
      }),
    ]);
  });

  it('builds production observability health from alerts, shifts, publication logs and job audits', async () => {
    const publicationAt = new Date('2026-01-14T10:00:00.000Z');
    const scanAt = new Date('2026-01-14T09:30:00.000Z');
    alertRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        severity: 'HIGH',
        isResolved: false,
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        severity: 'LOW',
        isResolved: false,
      },
    ]);
    shiftRepository.find.mockResolvedValue([
      { id: 1, tenantId: 'tenant-a', status: 'PENDING' },
      { id: 2, tenantId: 'tenant-a', status: 'VALIDATED' },
      { id: 3, tenantId: 'tenant-a', status: 'PUBLISHED' },
    ]);
    auditService.getLogs
      .mockResolvedValueOnce([
        {
          id: 10,
          timestamp: publicationAt,
          actorId: 99,
          details: {
            blocked: true,
            affected: 0,
            report: {
              totalPending: 2,
              violations: [{ shiftId: 1 }],
              warnings: [{ shiftId: 2 }],
            },
          },
        },
        {
          id: 9,
          timestamp: new Date('2026-01-13T10:00:00.000Z'),
          actorId: 99,
          details: { blocked: false, affected: 1, report: {} },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 20,
          timestamp: scanAt,
          actorId: 0,
          details: { action: 'COMPLIANCE_SCAN', status: 'FAILED' },
        },
      ]);

    const result = await service.getProductionObservabilityHealth('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    });

    expect(alertRepository.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', isResolved: false },
    });
    expect(shiftRepository.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        start: expect.any(Object),
        end: expect.any(Object),
      },
    });
    expect(auditService.getLogs).toHaveBeenNthCalledWith(1, 'tenant-a', {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
      detailAction: 'PUBLISH_PLANNING',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      limit: 20,
    });
    expect(auditService.getLogs).toHaveBeenNthCalledWith(2, 'tenant-a', {
      detailAction: 'COMPLIANCE_SCAN',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      limit: 20,
    });
    expect(result).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        status: 'CRITICAL',
        reasons: expect.arrayContaining([
          'HIGH_ALERTS_OPEN',
          'LAST_PUBLICATION_BLOCKED',
          'PENDING_SHIFTS_WAITING_PUBLICATION',
          'COMPLIANCE_SCAN_FAILURES',
        ]),
        lastPublication: {
          timestamp: publicationAt,
          actorId: 99,
          blocked: true,
          affected: 0,
          totalPending: 2,
          violations: 1,
          warnings: 1,
        },
        counters: {
          openAlerts: 2,
          highAlerts: 1,
          mediumAlerts: 0,
          lowAlerts: 1,
          pendingShifts: 1,
          validatedShifts: 1,
          publishedShifts: 1,
          publicationAttempts: 2,
          refusedPublications: 1,
          successfulPublications: 1,
        },
        jobs: {
          complianceScan: {
            configured: true,
            status: 'DEGRADED',
            recentRuns: 1,
            failedRuns: 1,
            lastRunAt: scanAt,
          },
        },
      }),
    );
  });

  it('explains why a shift is blocked by compliance validation', async () => {
    const shift = {
      id: 50,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start,
      end,
      postId: 'URG-8',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    mockShiftQueries({
      overlappingShift: {
        id: 51,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const result = await service.explainShiftCompliance('tenant-a', 50);

    expect(result).toEqual({
      shift: expect.objectContaining({ id: 50, agentId: 10 }),
      validation: expect.objectContaining({
        isValid: false,
        blockingReasons: expect.arrayContaining(['SHIFT_OVERLAP']),
      }),
    });
  });

  it('guides a manager correction from a blocked shift without duplicating mutations', async () => {
    const shift = {
      id: 52,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: futureStart,
      end: futureEnd,
      postId: 'URG-9',
      type: ShiftType.NORMAL,
      status: 'PENDING',
      isSwapRequested: false,
      complianceExceptionApproved: false,
      complianceExceptionReason: null,
      complianceExceptionApprovedById: null,
      complianceExceptionApprovedAt: null,
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    mockShiftQueries({
      overlappingShift: {
        id: 53,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    const result = await service.getShiftCorrectionGuidance('tenant-a', 52);

    expect(result).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-a',
        problem: expect.objectContaining({
          type: 'SHIFT',
          id: 52,
          shiftId: 52,
          agentId: 10,
          title: 'Shift bloqué par la conformité',
        }),
        reasons: expect.arrayContaining([ComplianceRuleCode.SHIFT_OVERLAP]),
        validation: expect.objectContaining({
          isValid: false,
          blockingReasons: expect.arrayContaining([
            ComplianceRuleCode.SHIFT_OVERLAP,
          ]),
        }),
      }),
    );
    expect(result.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REASSIGN_SHIFT',
          permissions: ['planning:write'],
          endpoint: '/planning/shifts/52/reassign',
          body: expect.objectContaining({
            agentId: expect.objectContaining({ required: true }),
          }),
        }),
        expect.objectContaining({
          code: 'REQUEST_REPLACEMENT',
          endpoint: '/planning/shifts/52/request-replacement',
        }),
        expect.objectContaining({
          code: 'APPROVE_EXCEPTION',
          permissions: ['planning:exception'],
          endpoint: '/planning/shifts/52/exception',
          body: expect.objectContaining({
            reason: expect.objectContaining({ required: true }),
          }),
        }),
        expect.objectContaining({
          code: 'REVALIDATE_SHIFT',
          endpoint: '/planning/shifts/52/revalidate',
        }),
      ]),
    );
    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('guides a manager correction from an open compliance alert', async () => {
    const createdAt = new Date('2026-06-10T08:00:00.000Z');
    alertRepository.findOne.mockResolvedValue({
      id: 7,
      tenantId: 'tenant-a',
      agentId: 10,
      type: 'QVT_FATIGUE',
      severity: AlertSeverity.HIGH,
      message: 'Surcharge hebdomadaire détectée',
      metadata: {
        ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
      },
      isResolved: false,
      createdAt,
    });

    const result = await service.getAlertCorrectionGuidance('tenant-a', 7);

    expect(result).toEqual({
      tenantId: 'tenant-a',
      problem: expect.objectContaining({
        type: 'ALERT',
        id: 7,
        alertId: 7,
        agentId: 10,
        severity: AlertSeverity.HIGH,
        status: 'OPEN',
        detectedAt: createdAt,
      }),
      reasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
      availableActions: [
        expect.objectContaining({
          code: 'RESOLVE_ALERT',
          permissions: ['planning:write', 'alerts:manage'],
          method: 'PATCH',
          endpoint: '/planning/alerts/7/resolve',
          body: expect.objectContaining({
            reason: expect.objectContaining({ required: true }),
            recommendationId: expect.objectContaining({ required: false }),
          }),
        }),
      ],
    });
    expect(alertRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('requests a swap only for the owner of a future validated shift and audits the transition', async () => {
    const shift = {
      id: 30,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: futureStart,
      end: futureEnd,
      postId: 'URG-4',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: false,
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    shiftRepository.save.mockImplementation(async (data) => data);

    const result = await service.requestSwap('tenant-a', 30, 10);

    expect(result.isSwapRequested).toBe(true);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      10,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      30,
      expect.objectContaining({
        action: 'REQUEST_SWAP',
        before: expect.objectContaining({ id: 30, agentId: 10 }),
        after: expect.objectContaining({ id: 30, agentId: 10 }),
      }),
    );
  });

  it('rejects swap requests for non-owned, past, or non-validated shifts', async () => {
    shiftRepository.findOne.mockResolvedValueOnce({
      id: 30,
      tenantId: 'tenant-a',
      agent: { id: 11 },
      start: futureStart,
      end: futureEnd,
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await expect(service.requestSwap('tenant-a', 30, 10)).rejects.toThrow(
      BadRequestException,
    );

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 31,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date('2026-01-12T08:00:00.000Z'),
      end: new Date('2026-01-12T16:00:00.000Z'),
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await expect(service.requestSwap('tenant-a', 31, 10)).rejects.toThrow(
      BadRequestException,
    );

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 32,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: futureStart,
      end: futureEnd,
      status: 'PENDING',
      isSwapRequested: false,
    });

    await expect(service.requestSwap('tenant-a', 32, 10)).rejects.toThrow(
      BadRequestException,
    );
    expect(auditService.log).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      expect.any(Number),
      expect.objectContaining({ action: 'REQUEST_SWAP' }),
    );
  });

  it('applies for swaps through structured validation with excludeShiftId and audits before and after', async () => {
    const formerAgent = { id: 10, telephone: '+33600000000' };
    const applyingAgent = {
      id: 20,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      nom: 'Agent B',
    };
    const shift = {
      id: 33,
      tenantId: 'tenant-a',
      agent: formerAgent,
      start: futureStart,
      end: futureEnd,
      postId: 'URG-5',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: true,
    };
    shiftRepository.findOne.mockResolvedValue(shift);
    agentRepository.findOne.mockResolvedValue(applyingAgent);
    shiftRepository.save.mockImplementation(async (data) => data);
    mockShiftQueries();

    const result = await service.applyForSwap('tenant-a', 33, 20);

    expect(result.success).toBe(true);
    expect(shift.agent).toBe(applyingAgent);
    expect(shift.isSwapRequested).toBe(false);
    const previousShiftQuery =
      shiftRepository.createQueryBuilder.mock.results[0].value;
    const nextShiftQuery =
      shiftRepository.createQueryBuilder.mock.results[1].value;
    const overlapShiftQuery =
      shiftRepository.createQueryBuilder.mock.results[2].value;
    expect(previousShiftQuery.andWhere).toHaveBeenCalledWith(
      'shift.id != :excludeShiftId',
      { excludeShiftId: 33 },
    );
    expect(nextShiftQuery.andWhere).toHaveBeenCalledWith(
      'shift.id != :excludeShiftId',
      { excludeShiftId: 33 },
    );
    expect(overlapShiftQuery.andWhere).toHaveBeenCalledWith(
      'shift.id != :excludeShiftId',
      { excludeShiftId: 33 },
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      20,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      33,
      expect.objectContaining({
        action: 'APPLY_SWAP',
        formerAgentId: 10,
        newAgentId: 20,
        validation: expect.objectContaining({ isValid: true }),
        before: expect.objectContaining({ agentId: 10 }),
        after: expect.objectContaining({ agentId: 20 }),
      }),
    );
  });

  it('rejects swap applications when unavailable, self-applied, or structurally invalid', async () => {
    shiftRepository.findOne.mockResolvedValueOnce({
      id: 33,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: futureStart,
      end: futureEnd,
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await expect(service.applyForSwap('tenant-a', 33, 20)).rejects.toThrow(
      BadRequestException,
    );

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 34,
      tenantId: 'tenant-a',
      agent: { id: 20 },
      start: futureStart,
      end: futureEnd,
      status: 'VALIDATED',
      isSwapRequested: true,
    });

    await expect(service.applyForSwap('tenant-a', 34, 20)).rejects.toThrow(
      BadRequestException,
    );

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 35,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: futureStart,
      end: futureEnd,
      status: 'VALIDATED',
      isSwapRequested: true,
    });
    agentRepository.findOne.mockResolvedValueOnce({
      id: 20,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
    });
    mockShiftQueries({
      overlappingShift: {
        id: 36,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    await expect(service.applyForSwap('tenant-a', 35, 20)).rejects.toThrow(
      BadRequestException,
    );
    expect(shiftRepository.save).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 35 }),
    );
  });
});
