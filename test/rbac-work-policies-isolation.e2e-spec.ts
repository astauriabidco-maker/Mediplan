import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { hasAnyPermission } from '../src/auth/permissions';
import { PERMISSIONS_KEY } from '../src/auth/permissions.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { WorkPoliciesController } from '../src/planning/work-policies.controller';
import { WorkPoliciesService } from '../src/planning/work-policies.service';

const userByScenario: Record<string, any> = {
  agent: {
    id: 10,
    tenantId: 'tenant-a',
    role: 'AGENT',
    permissions: ['planning:read'],
  },
  policyReader: {
    id: 11,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['hr-policies:read'],
  },
  policyWriter: {
    id: 12,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['hr-policies:write'],
  },
  policyManager: {
    id: 13,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['hr-policies:manage'],
  },
  legacyPlanningManager: {
    id: 14,
    tenantId: 'tenant-a',
    role: 'MANAGER',
    permissions: ['planning:manage'],
  },
  admin: {
    id: 1,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: [],
  },
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

      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        return true;
      }

      return hasAnyPermission(user.permissions || [], requiredPermissions);
    },
  };
};

describe('RBAC work policies isolation (e2e)', () => {
  let app: INestApplication;
  const workPoliciesService = {
    findAll: jest.fn(async (tenantId) => [{ id: 1, tenantId }]),
    create: jest.fn(async (tenantId, data, actorId) => ({
      id: 100,
      tenantId,
      actorId,
      ...data,
    })),
    update: jest.fn(async (tenantId, id, data, actorId) => ({
      id,
      tenantId,
      actorId,
      ...data,
    })),
    remove: jest.fn(async (tenantId, id, actorId) => ({
      id,
      tenantId,
      actorId,
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WorkPoliciesController],
      providers: [
        { provide: WorkPoliciesService, useValue: workPoliciesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = userByScenario[req.header('x-test-user') || 'agent'];
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

  it('requires dedicated hr-policies:read for policy consultation', async () => {
    await request(app.getHttpServer())
      .get('/work-policies')
      .set('x-test-user', 'agent')
      .expect(403);

    await request(app.getHttpServer())
      .get('/work-policies')
      .set('x-test-user', 'policyReader')
      .expect(200);

    expect(workPoliciesService.findAll).toHaveBeenCalledWith('tenant-a');
  });

  it('separates write and manage rights for mutations and deletion', async () => {
    await request(app.getHttpServer())
      .post('/work-policies')
      .set('x-test-user', 'policyReader')
      .send({ maxWeeklyHours: 44 })
      .expect(403);

    await request(app.getHttpServer())
      .post('/work-policies')
      .set('x-test-user', 'policyWriter')
      .send({ maxWeeklyHours: 44 })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/work-policies/100')
      .set('x-test-user', 'policyWriter')
      .expect(403);

    await request(app.getHttpServer())
      .delete('/work-policies/100')
      .set('x-test-user', 'policyManager')
      .expect(200);

    expect(workPoliciesService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ maxWeeklyHours: 44 }),
      12,
    );
    expect(workPoliciesService.remove).toHaveBeenCalledWith(
      'tenant-a',
      100,
      13,
    );
  });

  it('keeps planning:manage compatible with existing work policy access', async () => {
    await request(app.getHttpServer())
      .post('/work-policies')
      .set('x-test-user', 'legacyPlanningManager')
      .send({ maxWeeklyHours: 42 })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/work-policies/101')
      .set('x-test-user', 'legacyPlanningManager')
      .expect(403);
  });

  it('keeps admin role bypass for role-based operational support', async () => {
    await request(app.getHttpServer())
      .delete('/work-policies/102')
      .set('x-test-user', 'admin')
      .expect(200);
  });
});
