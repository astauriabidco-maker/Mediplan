import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Agent, UserRole } from '../src/agents/entities/agent.entity';
import { Leave } from '../src/planning/entities/leave.entity';
import { Shift } from '../src/planning/entities/shift.entity';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { PERMISSIONS_KEY } from '../src/auth/permissions.decorator';
import { hasAnyPermission } from '../src/auth/permissions';
import { RolesGuard } from '../src/auth/roles.guard';
import { AutoSchedulerService } from '../src/planning/auto-scheduler.service';
import { DocumentsService } from '../src/documents/documents.service';
import { OptimizationService } from '../src/planning/optimization.service';
import { PlanningController } from '../src/planning/planning.controller';
import { PlanningService } from '../src/planning/planning.service';

const userByScenario: Record<string, any> = {
  noPermissions: {
    id: 10,
    userId: 10,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: [],
  },
  reader: {
    id: 11,
    userId: 11,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: ['planning:read'],
  },
  writer: {
    id: 12,
    userId: 12,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: ['planning:write'],
  },
  planningManager: {
    id: 13,
    userId: 13,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: ['planning:publish'],
  },
  exceptionApprover: {
    id: 14,
    userId: 14,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: ['planning:exceptions:approve'],
  },
  legacyExceptionApprover: {
    id: 16,
    userId: 16,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: ['planning:exception'],
  },
  auditor: {
    id: 15,
    userId: 15,
    tenantId: 'tenant-a',
    role: UserRole.MANAGER,
    permissions: ['audit:read'],
  },
  superadmin: {
    id: 1,
    userId: 1,
    tenantId: 'root',
    role: UserRole.SUPER_ADMIN,
    permissions: ['*'],
  },
};

const repositoryMock = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => data),
};

const createPermissionGuard = () => {
  const reflector = new Reflector();

  return {
    canActivate: (context) => {
      const requiredPermissions = reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredPermissions) return true;

      const { user } = context.switchToHttp().getRequest();
      const userPermissions = user.permissions || [];

      if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
        return true;
      }

      return hasAnyPermission(userPermissions, requiredPermissions);
    },
  };
};

describe('Planning security isolation (e2e)', () => {
  let app: INestApplication;
  let planningService: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();

    planningService = {
      getComplianceSummary: jest.fn(async (tenantId) => ({ tenantId })),
      getManagerWorklist: jest.fn(async (tenantId) => ({ tenantId })),
      getServiceComplianceIndicators: jest.fn(async (tenantId) => ({
        tenantId,
        services: [],
      })),
      getComplianceReports: jest.fn(async (tenantId) => [{ tenantId }]),
      explainShiftCompliance: jest.fn(async (tenantId, id) => ({
        tenantId,
        shift: { id },
      })),
      reassignShift: jest.fn(async (tenantId, actorId, id, agentId) => ({
        tenantId,
        actorId,
        id,
        agentId,
      })),
      revalidateShift: jest.fn(async (tenantId, actorId, id) => ({
        tenantId,
        actorId,
        id,
      })),
      requestReplacement: jest.fn(async (tenantId, actorId, id, reason) => ({
        tenantId,
        actorId,
        id,
        reason,
      })),
      resolvePlanningAlert: jest.fn(async (tenantId, actorId, id, reason) => ({
        tenantId,
        actorId,
        id,
        reason,
      })),
      approveShiftException: jest.fn(async (tenantId, actorId, id, reason) => ({
        tenantId,
        actorId,
        id,
        reason,
      })),
      publishPlanning: jest.fn(async (tenantId, actorId, start, end) => ({
        tenantId,
        actorId,
        start,
        end,
      })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
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
        { provide: getRepositoryToken(Agent), useValue: repositoryMock },
        { provide: getRepositoryToken(Leave), useValue: repositoryMock },
        { provide: getRepositoryToken(Shift), useValue: repositoryMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = userByScenario[req.header('x-test-user') || 'reader'];
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue(createPermissionGuard())
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

  it('keeps compliance read endpoints in the authenticated tenant for regular users', async () => {
    await request(app.getHttpServer())
      .get('/planning/compliance/summary?tenantId=tenant-b')
      .set('x-test-user', 'reader')
      .expect(200);
    await request(app.getHttpServer())
      .get('/planning/compliance/worklist?tenantId=tenant-b')
      .set('x-test-user', 'reader')
      .expect(200);
    await request(app.getHttpServer())
      .get('/planning/compliance/service-indicators?tenantId=tenant-b')
      .set('x-test-user', 'reader')
      .expect(200);

    expect(planningService.getComplianceSummary).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Object),
    );
    expect(planningService.getManagerWorklist).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Object),
    );
    expect(planningService.getServiceComplianceIndicators).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Object),
    );
  });

  it('requires planning:read for compliance read endpoints and shift explanations', async () => {
    await request(app.getHttpServer())
      .get('/planning/compliance/summary')
      .set('x-test-user', 'noPermissions')
      .expect(403);
    await request(app.getHttpServer())
      .get('/planning/compliance/worklist')
      .set('x-test-user', 'noPermissions')
      .expect(403);
    await request(app.getHttpServer())
      .get('/planning/compliance/service-indicators')
      .set('x-test-user', 'noPermissions')
      .expect(403);
    await request(app.getHttpServer())
      .get('/planning/shifts/90/compliance')
      .set('x-test-user', 'noPermissions')
      .expect(403);

    await request(app.getHttpServer())
      .get('/planning/shifts/90/compliance')
      .set('x-test-user', 'reader')
      .expect(200);

    expect(planningService.explainShiftCompliance).toHaveBeenCalledWith(
      'tenant-a',
      90,
    );
  });

  it('protects compliance reports with audit:read and honors super-admin tenant selection', async () => {
    await request(app.getHttpServer())
      .get('/planning/compliance/reports?tenantId=tenant-b')
      .set('x-test-user', 'reader')
      .expect(403);

    await request(app.getHttpServer())
      .get('/planning/compliance/reports?tenantId=tenant-b')
      .set('x-test-user', 'auditor')
      .expect(200);

    expect(planningService.getComplianceReports).toHaveBeenLastCalledWith(
      'tenant-a',
      expect.any(Object),
    );

    await request(app.getHttpServer())
      .get('/planning/compliance/reports?tenantId=tenant-b')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(planningService.getComplianceReports).toHaveBeenLastCalledWith(
      'tenant-b',
      expect.any(Object),
    );
  });

  it('requires planning:write for manager correction actions', async () => {
    await request(app.getHttpServer())
      .post('/planning/shifts/90/reassign')
      .set('x-test-user', 'reader')
      .send({ agentId: 20, reason: 'Rééquilibrage' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/planning/shifts/90/revalidate')
      .set('x-test-user', 'reader')
      .expect(403);
    await request(app.getHttpServer())
      .post('/planning/shifts/90/request-replacement')
      .set('x-test-user', 'reader')
      .send({ reason: 'Besoin remplacement' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/planning/alerts/30/resolve')
      .set('x-test-user', 'reader')
      .send({ reason: 'Corrigé' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/planning/shifts/90/reassign')
      .set('x-test-user', 'writer')
      .send({ agentId: 20, reason: 'Rééquilibrage' })
      .expect(201);

    expect(planningService.reassignShift).toHaveBeenCalledWith(
      'tenant-a',
      12,
      90,
      20,
      {
        reason: 'Rééquilibrage',
        recommendationId: undefined,
        alertId: undefined,
      },
    );
  });

  it('requires planning:exception for controlled exceptions', async () => {
    await request(app.getHttpServer())
      .post('/planning/shifts/90/exception')
      .set('x-test-user', 'writer')
      .send({ reason: 'Nécessité de continuité de soins' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/planning/shifts/90/exception')
      .set('x-test-user', 'exceptionApprover')
      .send({ reason: 'Nécessité de continuité de soins' })
      .expect(201);

    expect(planningService.approveShiftException).toHaveBeenCalledWith(
      'tenant-a',
      14,
      90,
      {
        reason: 'Nécessité de continuité de soins',
        recommendationId: undefined,
        alertId: undefined,
      },
    );
  });

  it('keeps the legacy planning:exception permission compatible', async () => {
    await request(app.getHttpServer())
      .post('/planning/shifts/90/exception')
      .set('x-test-user', 'legacyExceptionApprover')
      .send({ reason: 'Autorisation héritée déjà attribuée' })
      .expect(201);

    expect(planningService.approveShiftException).toHaveBeenCalledWith(
      'tenant-a',
      16,
      90,
      {
        reason: 'Autorisation héritée déjà attribuée',
        recommendationId: undefined,
        alertId: undefined,
      },
    );
  });

  it('requires planning:manage for publication', async () => {
    const body = {
      start: '2026-06-12T00:00:00.000Z',
      end: '2026-06-13T00:00:00.000Z',
    };

    await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'writer')
      .send(body)
      .expect(403);

    await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'planningManager')
      .send(body)
      .expect(201);

    expect(planningService.publishPlanning).toHaveBeenCalledWith(
      'tenant-a',
      13,
      new Date(body.start),
      new Date(body.end),
    );
  });

  it('rejects invalid mutation payloads before calling the service', async () => {
    await request(app.getHttpServer())
      .post('/planning/shifts/90/reassign')
      .set('x-test-user', 'writer')
      .send({ agentId: 'not-a-number' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/planning/shifts/90/reassign')
      .set('x-test-user', 'writer')
      .send({ agentId: 20, reason: 'Rééquilibrage', tenantId: 'tenant-b' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/planning/shifts/90/exception')
      .set('x-test-user', 'exceptionApprover')
      .send({ reason: '' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/planning/publish')
      .set('x-test-user', 'planningManager')
      .send({ start: 'not-a-date', end: '2026-06-13T00:00:00.000Z' })
      .expect(400);

    expect(planningService.reassignShift).not.toHaveBeenCalled();
    expect(planningService.approveShiftException).not.toHaveBeenCalled();
    expect(planningService.publishPlanning).not.toHaveBeenCalled();
  });
});
