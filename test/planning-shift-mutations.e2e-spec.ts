import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Agent, UserStatus } from '../src/agents/entities/agent.entity';
import { HospitalService } from '../src/agents/entities/hospital-service.entity';
import { HealthRecord } from '../src/agents/entities/health-record.entity';
import { AgentAlert } from '../src/agents/entities/agent-alert.entity';
import { AgentCompetency } from '../src/competencies/entities/agent-competency.entity';
import { AuditService } from '../src/audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../src/audit/entities/audit-log.entity';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { LOCALE_RULES } from '../src/core/config/locale.module';
import { DocumentsService } from '../src/documents/documents.service';
import { EventsGateway } from '../src/events/events.gateway';
import { SettingsService } from '../src/settings/settings.service';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import { AutoSchedulerService } from '../src/planning/auto-scheduler.service';
import { ComplianceAlertService } from '../src/planning/compliance-alert.service';
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
  findOneBy: jest.fn(),
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

describe('Planning shift mutations (e2e)', () => {
  let app: INestApplication;
  let shiftRepository: ReturnType<typeof createRepositoryMock>;
  let leaveRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let healthRecordRepository: ReturnType<typeof createRepositoryMock>;
  let agentCompRepository: ReturnType<typeof createRepositoryMock>;
  let workPolicyRepository: ReturnType<typeof createRepositoryMock>;
  let alertRepository: ReturnType<typeof createRepositoryMock>;
  let auditService: { log: jest.Mock };

  const start = '2026-01-12T08:00:00.000Z';
  const end = '2026-01-12T16:00:00.000Z';
  const futureStart = '2026-06-12T08:00:00.000Z';
  const futureEnd = '2026-06-12T16:00:00.000Z';

  beforeEach(async () => {
    jest.clearAllMocks();

    shiftRepository = createRepositoryMock();
    leaveRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
    healthRecordRepository = createRepositoryMock();
    agentCompRepository = createRepositoryMock();
    workPolicyRepository = createRepositoryMock();
    alertRepository = createRepositoryMock();
    auditService = { log: jest.fn() };

    agentRepository.findOne.mockResolvedValue({
      id: 10,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
    });
    healthRecordRepository.find.mockResolvedValue([]);
    agentCompRepository.find.mockResolvedValue([]);
    workPolicyRepository.findOne.mockResolvedValue(null);
    alertRepository.findOne.mockResolvedValue(null);
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
        {
          provide: SettingsService,
          useValue: { getSetting: jest.fn(async () => 48) },
        },
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

  it('rejects client-supplied tenant fields when creating shifts', async () => {
    await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({
        tenantId: 'tenant-b',
        agentId: 10,
        start,
        end,
        postId: 'URG-1',
      })
      .expect(400);

    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('creates shifts in the authenticated tenant after structured validation and audits the actor', async () => {
    await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({
        agentId: 10,
        start,
        end,
        postId: 'URG-1',
        type: ShiftType.NORMAL,
        facilityId: 3,
      })
      .expect(201);

    expect(shiftRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agent: { id: 10 },
        postId: 'URG-1',
        status: 'PENDING',
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.SHIFT,
      1,
      expect.objectContaining({ action: 'CREATE_SHIFT' }),
    );
  });

  it('returns a clean HTTP 400 when creating a shift over an approved leave', async () => {
    mockLeaveOverlapCount(1);

    const response = await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({
        agentId: 10,
        start,
        end,
        postId: 'URG-1',
      })
      .expect(400);

    expect(response.body.message).toContain('Shift validation failed');
    expect(response.body.message).toContain('APPROVED_LEAVE_OVERLAP');
    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('returns a clean HTTP 400 when creating a shift overlapping another shift', async () => {
    mockShiftValidationQueries({
      overlappingShift: {
        id: 7,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/shifts')
      .set('x-test-user', 'admin')
      .send({
        agentId: 10,
        start,
        end,
        postId: 'URG-1',
      })
      .expect(400);

    expect(response.body.message).toContain('SHIFT_OVERLAP');
    expect(shiftRepository.save).not.toHaveBeenCalled();
  });

  it('does not update a shift outside the authenticated tenant', async () => {
    shiftRepository.findOne.mockResolvedValue(null);

    await request(app.getHttpServer())
      .patch('/planning/shifts/99')
      .set('x-test-user', 'admin')
      .send({ start, end })
      .expect(404);

    expect(shiftRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99, tenantId: 'tenant-a' },
      }),
    );
    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('keeps validation failures as HTTP 400 when updating shifts', async () => {
    shiftRepository.findOne.mockResolvedValue({
      id: 5,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date('2026-01-12T06:00:00.000Z'),
      end: new Date('2026-01-12T14:00:00.000Z'),
      postId: 'URG-2',
      type: ShiftType.NORMAL,
      status: 'PENDING',
    });
    mockShiftValidationQueries({
      overlappingShift: {
        id: 6,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .patch('/planning/shifts/5')
      .set('x-test-user', 'admin')
      .send({ start, end })
      .expect(400);

    expect(response.body.message).toContain('SHIFT_OVERLAP');
    expect(shiftRepository.save).not.toHaveBeenCalled();
  });

  it('assigns replacements through validation and audits the requester', async () => {
    await request(app.getHttpServer())
      .post('/planning/assign-replacement')
      .set('x-test-user', 'admin')
      .send({
        agentId: 10,
        start,
        end,
        postId: 'URG-3',
      })
      .expect(201);

    expect(shiftRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agent: { id: 10 },
        postId: 'URG-3',
        status: 'VALIDATED',
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.SHIFT,
      1,
      expect.objectContaining({
        action: 'ASSIGN_REPLACEMENT',
        agentId: 10,
      }),
    );
  });

  it('publishes only compliant pending shifts in the authenticated tenant and writes planning audit report', async () => {
    shiftRepository.find
      .mockResolvedValueOnce([
        {
          id: 15,
          tenantId: 'tenant-a',
          agent: { id: 10 },
          start: new Date('2026-01-12T08:00:00.000Z'),
          end: new Date('2026-01-12T16:00:00.000Z'),
          postId: 'URG-PUBLISH-1',
          type: ShiftType.NORMAL,
          status: 'PENDING',
        },
      ])
      .mockResolvedValue([]);
    mockShiftValidationQueries();

    await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'admin')
      .send({
        start: '2026-01-12T00:00:00.000Z',
        end: '2026-01-19T00:00:00.000Z',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            message: 'Planning publié avec succès',
            affected: 1,
            report: expect.objectContaining({
              totalPending: 1,
              validatedShiftIds: [15],
              violations: [],
            }),
          }),
        );
      });

    expect(shiftRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          status: 'PENDING',
        }),
        relations: ['agent'],
      }),
    );
    expect(shiftRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ id: 15, status: 'VALIDATED' }),
    ]);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      '2026-01-12T00:00:00.000Z_2026-01-19T00:00:00.000Z',
      expect.objectContaining({
        action: 'PUBLISH_PLANNING',
        blocked: false,
        affected: 1,
        report: expect.objectContaining({
          totalPending: 1,
          validatedShiftIds: [15],
          violations: [],
        }),
      }),
    );
  });

  it('blocks publish when the compliance scan finds blocking violations and audits the report', async () => {
    shiftRepository.find
      .mockResolvedValueOnce([
        {
          id: 16,
          tenantId: 'tenant-a',
          agent: { id: 10 },
          start: new Date('2026-01-12T08:00:00.000Z'),
          end: new Date('2026-01-12T16:00:00.000Z'),
          postId: 'URG-PUBLISH-2',
          type: ShiftType.NORMAL,
          status: 'PENDING',
        },
      ])
      .mockResolvedValue([]);
    mockShiftValidationQueries({
      overlappingShift: {
        id: 17,
        start: new Date('2026-01-12T10:00:00.000Z'),
        end: new Date('2026-01-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'admin')
      .send({
        start: '2026-01-12T00:00:00.000Z',
        end: '2026-01-19T00:00:00.000Z',
      })
      .expect(400);

    expect(response.body.message).toBe(
      'Planning publication blocked by compliance violations',
    );
    expect(response.body.report.violations).toEqual([
      expect.objectContaining({
        shiftId: 16,
        agentId: 10,
        blockingReasons: expect.arrayContaining(['SHIFT_OVERLAP']),
      }),
    ]);
    expect(shiftRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      '2026-01-12T00:00:00.000Z_2026-01-19T00:00:00.000Z',
      expect.objectContaining({
        action: 'PUBLISH_PLANNING',
        blocked: true,
        report: expect.objectContaining({
          totalPending: 1,
          validatedShiftIds: [],
        }),
      }),
    );
  });

  it('requests swaps only for owned future validated shifts and writes audit', async () => {
    shiftRepository.findOne.mockResolvedValue({
      id: 21,
      tenantId: 'tenant-a',
      agent: { id: 42 },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      postId: 'URG-SWAP-1',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await request(app.getHttpServer())
      .post('/planning/shifts/21/request-swap')
      .set('x-test-user', 'admin')
      .expect(201);

    expect(shiftRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 21,
        isSwapRequested: true,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      21,
      expect.objectContaining({ action: 'REQUEST_SWAP' }),
    );
  });

  it('rejects request-swap for cross-tenant, non-owned, past, or pending shifts', async () => {
    shiftRepository.findOne.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post('/planning/shifts/99/request-swap')
      .set('x-test-user', 'admin')
      .expect(404);

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 22,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await request(app.getHttpServer())
      .post('/planning/shifts/22/request-swap')
      .set('x-test-user', 'admin')
      .expect(400);

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 23,
      tenantId: 'tenant-a',
      agent: { id: 42 },
      start: new Date('2026-01-12T08:00:00.000Z'),
      end: new Date('2026-01-12T16:00:00.000Z'),
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await request(app.getHttpServer())
      .post('/planning/shifts/23/request-swap')
      .set('x-test-user', 'admin')
      .expect(400);

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 24,
      tenantId: 'tenant-a',
      agent: { id: 42 },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      status: 'PENDING',
      isSwapRequested: false,
    });

    await request(app.getHttpServer())
      .post('/planning/shifts/24/request-swap')
      .set('x-test-user', 'admin')
      .expect(400);
  });

  it('applies for swaps through strict validation and writes full audit', async () => {
    shiftRepository.findOne.mockResolvedValue({
      id: 25,
      tenantId: 'tenant-a',
      agent: { id: 10, telephone: '+33600000000' },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      postId: 'URG-SWAP-2',
      type: ShiftType.NORMAL,
      status: 'VALIDATED',
      isSwapRequested: true,
    });
    agentRepository.findOne.mockResolvedValue({
      id: 42,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
      nom: 'Admin',
    });
    mockShiftValidationQueries();

    await request(app.getHttpServer())
      .post('/planning/shifts/25/apply-swap')
      .set('x-test-user', 'admin')
      .expect(201);

    const previousShiftQuery =
      shiftRepository.createQueryBuilder.mock.results[0].value;
    expect(previousShiftQuery.andWhere).toHaveBeenCalledWith(
      'shift.id != :excludeShiftId',
      { excludeShiftId: 25 },
    );
    expect(shiftRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 25,
        agent: expect.objectContaining({ id: 42 }),
        isSwapRequested: false,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.SHIFT,
      25,
      expect.objectContaining({
        action: 'APPLY_SWAP',
        formerAgentId: 10,
        newAgentId: 42,
        validation: expect.objectContaining({ isValid: true }),
      }),
    );
  });

  it('rejects apply-swap when unavailable, self-applied, or validation fails', async () => {
    shiftRepository.findOne.mockResolvedValueOnce({
      id: 26,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      status: 'VALIDATED',
      isSwapRequested: false,
    });

    await request(app.getHttpServer())
      .post('/planning/shifts/26/apply-swap')
      .set('x-test-user', 'admin')
      .expect(400);

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 27,
      tenantId: 'tenant-a',
      agent: { id: 42 },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      status: 'VALIDATED',
      isSwapRequested: true,
    });

    await request(app.getHttpServer())
      .post('/planning/shifts/27/apply-swap')
      .set('x-test-user', 'admin')
      .expect(400);

    shiftRepository.findOne.mockResolvedValueOnce({
      id: 28,
      tenantId: 'tenant-a',
      agent: { id: 10 },
      start: new Date(futureStart),
      end: new Date(futureEnd),
      status: 'VALIDATED',
      isSwapRequested: true,
    });
    agentRepository.findOne.mockResolvedValueOnce({
      id: 42,
      tenantId: 'tenant-a',
      status: UserStatus.ACTIVE,
    });
    mockShiftValidationQueries({
      overlappingShift: {
        id: 29,
        start: new Date('2026-06-12T10:00:00.000Z'),
        end: new Date('2026-06-12T18:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/planning/shifts/28/apply-swap')
      .set('x-test-user', 'admin')
      .expect(400);

    expect(response.body.message).toContain('SHIFT_OVERLAP');
  });
});
