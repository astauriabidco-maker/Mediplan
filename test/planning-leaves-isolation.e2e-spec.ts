import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Agent } from '../src/agents/entities/agent.entity';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { DocumentsService } from '../src/documents/documents.service';
import { AutoSchedulerService } from '../src/planning/auto-scheduler.service';
import { Leave, LeaveType } from '../src/planning/entities/leave.entity';
import { Shift } from '../src/planning/entities/shift.entity';
import { LeavesController } from '../src/planning/leaves.controller';
import { LeavesService } from '../src/planning/leaves.service';
import { OptimizationService } from '../src/planning/optimization.service';
import { PlanningController } from '../src/planning/planning.controller';
import { PlanningService } from '../src/planning/planning.service';

const userByScenario: Record<string, any> = {
  admin: {
    id: 42,
    email: 'admin@tenant-a.test',
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: [
      'planning:read',
      'planning:write',
      'leaves:read',
      'leaves:request',
    ],
  },
  superadmin: {
    id: 1,
    email: 'root@example.test',
    tenantId: 'root',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
  },
};

const createRepositoryMock = () => ({
  find: jest.fn(async (options) => [
    { id: 1, tenantId: options?.where?.tenantId },
  ]),
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ id: 1, ...data })),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('Planning and leaves tenant isolation (e2e)', () => {
  let app: INestApplication;
  let leaveRepository: ReturnType<typeof createRepositoryMock>;

  const planningService = {
    getShifts: jest.fn(async (tenantId) => [{ id: 1, tenantId }]),
    validateShift: jest.fn(),
    getWeeklyHours: jest.fn(),
    getShiftApplications: jest.fn(),
    approveGhtApplication: jest.fn(),
    getAvailableSwaps: jest.fn(),
    requestSwap: jest.fn(),
    applyForSwap: jest.fn(),
    rejectGhtApplication: jest.fn(),
    assignReplacement: jest.fn(),
    updateShift: jest.fn(),
  };

  const leavesService = {
    requestLeave: jest.fn(async (tenantId, agentId) => ({
      id: 1,
      tenantId,
      agentId,
    })),
    getMyBalances: jest.fn(),
    getMyLeaves: jest.fn(async (tenantId, agentId) => [
      { id: 1, tenantId, agentId },
    ]),
    getTeamRequests: jest.fn(),
    validateLeave: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    leaveRepository = createRepositoryMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController, LeavesController],
      providers: [
        { provide: PlanningService, useValue: planningService },
        { provide: OptimizationService, useValue: { compute: jest.fn() } },
        {
          provide: AutoSchedulerService,
          useValue: {
            findReplacements: jest.fn(),
            generateSchedule: jest.fn(),
            generateSmartSchedule: jest.fn(),
          },
        },
        {
          provide: DocumentsService,
          useValue: { generateContractForShift: jest.fn() },
        },
        { provide: LeavesService, useValue: leavesService },
        {
          provide: getRepositoryToken(Agent),
          useValue: createRepositoryMock(),
        },
        { provide: getRepositoryToken(Leave), useValue: leaveRepository },
        {
          provide: getRepositoryToken(Shift),
          useValue: createRepositoryMock(),
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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('ignores tenantId query parameters for regular admins when listing shifts', async () => {
    await request(app.getHttpServer())
      .get('/planning/shifts?tenantId=tenant-b&start=2026-01-01&end=2026-01-07')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(planningService.getShifts).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Date),
      expect.any(Date),
      undefined,
      undefined,
    );
  });

  it('allows super admins to inspect explicit tenant shifts', async () => {
    await request(app.getHttpServer())
      .get('/planning/shifts?tenantId=tenant-b&start=2026-01-01&end=2026-01-07')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(planningService.getShifts).toHaveBeenCalledWith(
      'tenant-b',
      expect.any(Date),
      expect.any(Date),
      undefined,
      undefined,
    );
  });

  it('ignores tenantId query parameters for regular admins when listing planning leaves', async () => {
    await request(app.getHttpServer())
      .get('/planning/leaves?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(leaveRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a' },
      }),
    );
  });

  it('loads my leaves using the authenticated tenant and agent id', async () => {
    await request(app.getHttpServer())
      .get('/leaves/my-leaves?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(leavesService.getMyLeaves).toHaveBeenCalledWith('tenant-a', 42);
  });

  it('requests leave in the authenticated tenant and ignores client tenant fields', async () => {
    await request(app.getHttpServer())
      .post('/leaves/request')
      .set('x-test-user', 'admin')
      .send({
        tenantId: 'tenant-b',
        start: '2026-01-10',
        end: '2026-01-12',
        type: LeaveType.CONGE_ANNUEL,
        reason: 'Repos',
      })
      .expect(201);

    expect(leavesService.requestLeave).toHaveBeenCalledWith(
      'tenant-a',
      42,
      expect.any(Date),
      expect.any(Date),
      LeaveType.CONGE_ANNUEL,
      'Repos',
      expect.objectContaining({ id: 42, canManageAll: true }),
    );
  });
});
