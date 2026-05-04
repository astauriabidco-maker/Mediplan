import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Agent, UserStatus } from '../src/agents/entities/agent.entity';
import { AgentAlert } from '../src/agents/entities/agent-alert.entity';
import { HospitalService } from '../src/agents/entities/hospital-service.entity';
import { HealthRecord } from '../src/agents/entities/health-record.entity';
import { AuditService } from '../src/audit/audit.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { AgentCompetency } from '../src/competencies/entities/agent-competency.entity';
import { LOCALE_RULES } from '../src/core/config/locale.module';
import { DocumentsService } from '../src/documents/documents.service';
import { EventsGateway } from '../src/events/events.gateway';
import { SettingsService } from '../src/settings/settings.service';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import { AutoSchedulerService } from '../src/planning/auto-scheduler.service';
import { ComplianceAlertService } from '../src/planning/compliance-alert.service';
import { ComplianceRuleCode } from '../src/planning/compliance-validation.types';
import { ComplianceValidationService } from '../src/planning/compliance-validation.service';
import { Leave } from '../src/planning/entities/leave.entity';
import { Shift, ShiftType } from '../src/planning/entities/shift.entity';
import { ShiftApplication } from '../src/planning/entities/shift-application.entity';
import { WorkPolicy } from '../src/planning/entities/work-policy.entity';
import { OptimizationService } from '../src/planning/optimization.service';
import { PlanningController } from '../src/planning/planning.controller';
import { PlanningService } from '../src/planning/planning.service';
import { WorkPoliciesService } from '../src/planning/work-policies.service';

const userByScenario: Record<string, any> = {
  admin: {
    id: 42,
    userId: 42,
    sub: 42,
    email: 'admin@tenant-a.test',
    tenantId: 'tenant-a',
    tenant: 'tenant-a',
    role: 'ADMIN',
    permissions: ['planning:read', 'planning:write', 'planning:manage'],
  },
};

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ id: data.id ?? 1, ...data })),
  createQueryBuilder: jest.fn(),
});

const createReadQueryBuilderMock = (terminal: {
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

describe('Planning compliance API (e2e)', () => {
  let app: INestApplication;
  let shiftRepository: ReturnType<typeof createRepositoryMock>;
  let leaveRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let healthRecordRepository: ReturnType<typeof createRepositoryMock>;
  let agentCompRepository: ReturnType<typeof createRepositoryMock>;
  let workPolicyRepository: ReturnType<typeof createRepositoryMock>;
  let alertRepository: ReturnType<typeof createRepositoryMock>;
  let settingsService: { getSetting: jest.Mock };
  let auditService: { log: jest.Mock; getLogs: jest.Mock };

  const start = '2026-06-12T08:00:00.000Z';
  const end = '2026-06-12T16:00:00.000Z';

  beforeEach(async () => {
    jest.clearAllMocks();

    shiftRepository = createRepositoryMock();
    leaveRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
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
      hospitalServiceId: 2,
      gradeId: 3,
      nom: 'Agent',
    });
    healthRecordRepository.find.mockResolvedValue([]);
    agentCompRepository.find.mockResolvedValue([]);
    workPolicyRepository.findOne.mockResolvedValue(null);
    alertRepository.findOne.mockResolvedValue(null);
    alertRepository.save.mockImplementation(async (data) => ({
      id: data.id ?? 1,
      ...data,
    }));
    shiftRepository.find.mockResolvedValue([]);
    shiftRepository.save.mockImplementation(async (shift) => ({
      id: shift.id ?? 1,
      ...shift,
    }));
    mockLeaveOverlapCount(0);
    mockShiftValidationQueries();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        PlanningService,
        ComplianceValidationService,
        WorkPoliciesService,
        ComplianceAlertService,
        { provide: OptimizationService, useValue: { compute: jest.fn() } },
        {
          provide: AutoSchedulerService,
          useValue: {
            findReplacements: jest.fn(),
            generateSchedule: jest.fn(),
            generateSmartSchedule: jest.fn(),
          },
        },
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
          useValue: createRepositoryMock(),
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = userByScenario[req.header('x-test-user') || 'admin'];
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function mockLeaveOverlapCount(count: number) {
    leaveRepository.createQueryBuilder.mockReturnValue(
      createReadQueryBuilderMock({ getCount: count }),
    );
  }

  function mockShiftValidationQueries(
    options: {
      previousShift?: Partial<Shift> | null;
      nextShift?: Partial<Shift> | null;
      overlappingShift?: Partial<Shift> | null;
    } = {},
  ) {
    shiftRepository.createQueryBuilder
      .mockReset()
      .mockReturnValueOnce(
        createReadQueryBuilderMock({ getOne: options.previousShift || null }),
      )
      .mockReturnValueOnce(
        createReadQueryBuilderMock({ getOne: options.nextShift || null }),
      )
      .mockReturnValueOnce(
        createReadQueryBuilderMock({
          getOne: options.overlappingShift || null,
        }),
      );
  }

  it('returns HTTP 400 and creates an alert when minimum rest is violated', async () => {
    mockShiftValidationQueries({
      previousShift: {
        id: 1,
        end: new Date('2026-06-12T02:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({ agentId: 10, start, end, postId: 'REST-1' })
      .expect(400);

    expect(response.body.message).toContain(
      ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
    );
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agentId: 10,
        metadata: expect.objectContaining({
          ruleCode: ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
        }),
      }),
    );
  });

  it('returns HTTP 400 and creates an alert when weekly hours exceed the limit', async () => {
    settingsService.getSetting.mockResolvedValue(40);
    shiftRepository.find.mockResolvedValue([
      {
        start: new Date('2026-06-08T08:00:00.000Z'),
        end: new Date('2026-06-08T20:00:00.000Z'),
      },
      {
        start: new Date('2026-06-09T08:00:00.000Z'),
        end: new Date('2026-06-09T20:00:00.000Z'),
      },
      {
        start: new Date('2026-06-10T08:00:00.000Z'),
        end: new Date('2026-06-10T20:00:00.000Z'),
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({ agentId: 10, start, end, postId: 'WEEK-1' })
      .expect(400);

    expect(response.body.message).toContain(
      ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
    );
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          details: expect.objectContaining({ projected: 44, limit: 40 }),
        }),
      }),
    );
  });

  it('applies service+grade policy constraints at API level', async () => {
    workPolicyRepository.findOne.mockResolvedValueOnce({
      id: 77,
      restHoursAfterGuard: 12,
      maxGuardDuration: 6,
      maxWeeklyHours: 36,
      onCallCompensationPercent: 0.5,
    });

    const response = await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({ agentId: 10, start, end, postId: 'POLICY-1' })
      .expect(400);

    expect(workPolicyRepository.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', hospitalServiceId: 2, gradeId: 3 },
    });
    expect(response.body.message).toContain(
      ComplianceRuleCode.MAX_GUARD_DURATION_EXCEEDED,
    );
  });

  it('accepts and rejects swaps through compliance validation', async () => {
    shiftRepository.findOne.mockResolvedValueOnce({
      id: 20,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date(start),
      end: new Date(end),
      postId: 'SWAP-OK',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: true,
    });
    agentRepository.findOne.mockResolvedValueOnce({
      id: 42,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      hospitalServiceId: 2,
      gradeId: 3,
      nom: 'Admin',
    });
    mockShiftValidationQueries();

    await request(app.getHttpServer())
      .post('/planning/shifts/20/apply-swap')
      .set('x-test-user', 'admin')
      .expect(201);

    expect(shiftRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 20,
        agent: expect.objectContaining({ id: 42 }),
        isSwapRequested: false,
      }),
    );

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 21,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date(start),
      end: new Date(end),
      postId: 'SWAP-KO',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: true,
    });
    agentRepository.findOne.mockResolvedValueOnce({
      id: 42,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      hospitalServiceId: 2,
      gradeId: 3,
    });
    mockShiftValidationQueries({
      overlappingShift: {
        id: 22,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/shifts/21/apply-swap')
      .set('x-test-user', 'admin')
      .expect(400);

    expect(response.body.message).toContain(ComplianceRuleCode.SHIFT_OVERLAP);
  });

  it('blocks publication when pending shifts contain compliance violations', async () => {
    shiftRepository.find
      .mockResolvedValueOnce([
        {
          id: 30,
          tenantId: 'tenant-a',
          agent: { id: 10 },
          start: new Date(start),
          end: new Date(end),
          postId: 'PUB-KO',
          type: ShiftType.NORMAL,
          status: 'PENDING',
        },
      ])
      .mockResolvedValue([]);
    mockShiftValidationQueries({
      overlappingShift: {
        id: 31,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'admin')
      .send({
        start: '2026-06-12T00:00:00.000Z',
        end: '2026-06-13T00:00:00.000Z',
      })
      .expect(400);

    expect(response.body.message).toBe(
      'Planning publication blocked by compliance violations',
    );
    expect(response.body.report.violations).toEqual([
      expect.objectContaining({
        shiftId: 30,
        agentId: 10,
        blockingReasons: expect.arrayContaining([
          ComplianceRuleCode.SHIFT_OVERLAP,
        ]),
      }),
    ]);
  });

  it('previews publication blockers without mutating shifts or publication audits', async () => {
    shiftRepository.find
      .mockResolvedValueOnce([
        {
          id: 32,
          tenantId: 'tenant-a',
          agent: { id: 10 },
          start: new Date(start),
          end: new Date(end),
          postId: 'PUB-PREVIEW',
          type: ShiftType.NORMAL,
          status: 'PENDING',
        },
      ])
      .mockResolvedValue([]);
    mockShiftValidationQueries({
      overlappingShift: {
        id: 33,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/publish/preview')
      .set('x-test-user', 'admin')
      .send({
        start: '2026-06-12T00:00:00.000Z',
        end: '2026-06-13T00:00:00.000Z',
      })
      .expect(201);

    expect(response.body.publishable).toBe(false);
    expect(response.body.report).toEqual(
      expect.objectContaining({
        publishable: false,
        totalPending: 1,
        validatedShiftIds: [],
        violations: [
          expect.objectContaining({
            shiftId: 32,
            agentId: 10,
            blockingReasons: expect.arrayContaining([
              ComplianceRuleCode.SHIFT_OVERLAP,
            ]),
          }),
        ],
        recommendations: expect.arrayContaining([
          'Réassigner ou déplacer le shift en chevauchement.',
        ]),
      }),
    );
    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ action: 'PUBLISH_PLANNING' }),
    );
  });

  it('reads compliance publication reports through the planning API', async () => {
    auditService.getLogs.mockResolvedValue([
      {
        id: 70,
        timestamp: new Date('2026-06-12T12:00:00.000Z'),
        actorId: 42,
        entityId: '2026-06-12T00:00:00.000Z_2026-06-13T00:00:00.000Z',
        details: {
          blocked: true,
          affected: 0,
          report: {
            totalPending: 1,
            validatedShiftIds: [],
            violations: [
              {
                shiftId: 30,
                blockingReasons: [ComplianceRuleCode.SHIFT_OVERLAP],
              },
            ],
            warnings: [],
          },
        },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/planning/compliance/reports?from=2026-06-01T00:00:00.000Z&limit=5')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(auditService.getLogs).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        detailAction: 'PUBLISH_PLANNING',
        limit: 5,
      }),
    );
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 70,
        actorId: 42,
        blocked: true,
        affected: 0,
        report: expect.objectContaining({ totalPending: 1 }),
      }),
    ]);
  });

  it('explains why an existing shift is blocked', async () => {
    shiftRepository.findOne.mockResolvedValue({
      id: 80,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date(start),
      end: new Date(end),
      postId: 'EXPLAIN-1',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    });
    mockShiftValidationQueries({
      overlappingShift: {
        id: 81,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .get('/planning/shifts/80/compliance')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(response.body.shift).toEqual(
      expect.objectContaining({ id: 80, agentId: 10 }),
    );
    expect(response.body.validation).toEqual(
      expect.objectContaining({
        isValid: false,
        blockingReasons: expect.arrayContaining([
          ComplianceRuleCode.SHIFT_OVERLAP,
        ]),
      }),
    );
  });

  it('covers the manager journey: detect, understand, fix and publish', async () => {
    const blockedShift = {
      id: 90,
      tenantId: 'tenant-a',
      agent: { id: 10, hospitalServiceId: 2, gradeId: 3 },
      start: new Date(start),
      end: new Date(end),
      postId: 'MANAGER-JOURNEY',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    };
    const overloadedAgent = {
      id: 10,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      hospitalServiceId: 2,
      gradeId: 3,
      nom: 'Agent surchargé',
    };
    const replacementAgent = {
      id: 20,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      hospitalServiceId: 2,
      gradeId: 3,
      nom: 'Agent disponible',
    };
    const weeklyOverloadHistory = [
      {
        start: new Date('2026-06-08T08:00:00.000Z'),
        end: new Date('2026-06-09T06:00:00.000Z'),
      },
      {
        start: new Date('2026-06-10T08:00:00.000Z'),
        end: new Date('2026-06-11T06:00:00.000Z'),
      },
    ];

    let validatedAgentId = 10;
    agentRepository.findOne.mockImplementation(async ({ where }) => {
      validatedAgentId = where.id;
      if (where.id === 20) return replacementAgent;
      return overloadedAgent;
    });
    shiftRepository.findOne.mockImplementation(async ({ where }) =>
      where.id === 90 && where.tenantId === 'tenant-a' ? blockedShift : null,
    );
    shiftRepository.find.mockImplementation(async ({ where }) => {
      if (where.status === 'PENDING') {
        return blockedShift.status === 'PENDING' ? [blockedShift] : [];
      }

      return validatedAgentId === 10 ? weeklyOverloadHistory : [];
    });
    shiftRepository.save.mockImplementation(async (shift) => {
      Object.assign(blockedShift, shift);
      return blockedShift;
    });
    alertRepository.find.mockResolvedValue([]);
    shiftRepository.createQueryBuilder.mockReset();
    shiftRepository.createQueryBuilder.mockImplementation(() => {
      const builder: Record<string, jest.Mock> = {};
      builder.where = jest.fn(() => builder);
      builder.andWhere = jest.fn(() => builder);
      builder.orderBy = jest.fn(() => builder);
      builder.leftJoinAndSelect = jest.fn(() => builder);
      builder.getOne = jest.fn(async () => null);
      builder.getCount = jest.fn(async () => 0);
      builder.getMany = jest.fn(async () =>
        blockedShift.status === 'PENDING' ? [blockedShift] : [],
      );
      return builder;
    });

    const worklist = await request(app.getHttpServer())
      .get('/planning/compliance/worklist')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(worklist.body).toEqual(
      expect.objectContaining({
        total: 1,
        counters: expect.objectContaining({ WEEKLY_OVERLOAD: 1 }),
        items: [
          expect.objectContaining({
            category: 'WEEKLY_OVERLOAD',
            shiftId: 90,
            ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          }),
        ],
      }),
    );

    const explanation = await request(app.getHttpServer())
      .get('/planning/shifts/90/compliance')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(explanation.body.validation).toEqual(
      expect.objectContaining({
        isValid: false,
        blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
        metadata: expect.objectContaining({
          [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]:
            expect.objectContaining({
              projected: 52,
              limit: 48,
            }),
        }),
      }),
    );

    await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'admin')
      .send({
        start: '2026-06-12T00:00:00.000Z',
        end: '2026-06-13T00:00:00.000Z',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.report.violations).toEqual([
          expect.objectContaining({
            shiftId: 90,
            agentId: 10,
            blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
          }),
        ]);
      });

    await request(app.getHttpServer())
      .post('/planning/shifts/90/reassign')
      .set('x-test-user', 'admin')
      .send({
        agentId: 20,
        reason: 'Rééquilibrage de charge après recommandation manager',
        recommendationId:
          'recommendation:shift_validation:shift:90:WEEKLY_HOURS_LIMIT_EXCEEDED',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.agent).toEqual(expect.objectContaining({ id: 20 }));
      });

    const revalidation = await request(app.getHttpServer())
      .post('/planning/shifts/90/revalidate')
      .set('x-test-user', 'admin')
      .expect(201);

    expect(revalidation.body.validation).toEqual(
      expect.objectContaining({
        isValid: true,
        blockingReasons: [],
      }),
    );

    await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'admin')
      .send({
        start: '2026-06-12T00:00:00.000Z',
        end: '2026-06-13T00:00:00.000Z',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            affected: 1,
            report: expect.objectContaining({
              validatedShiftIds: [90],
              violations: [],
            }),
          }),
        );
      });

    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      expect.any(String),
      expect.any(String),
      90,
      expect.objectContaining({ action: 'REASSIGN_SHIFT' }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      expect.any(String),
      expect.any(String),
      '2026-06-12T00:00:00.000Z_2026-06-13T00:00:00.000Z',
      expect.objectContaining({
        action: 'PUBLISH_PLANNING',
        blocked: false,
        affected: 1,
      }),
    );
  });
});
