import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AgentsController } from '../src/agents/agents.controller';
import { AgentsService } from '../src/agents/agents.service';
import { GradesController } from '../src/agents/grades.controller';
import { GradesService } from '../src/agents/grades.service';
import { HospitalServicesController } from '../src/agents/hospital-services.controller';
import { HospitalServicesService } from '../src/agents/hospital-services.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { hasAnyPermission } from '../src/auth/permissions';
import { PERMISSIONS_KEY } from '../src/auth/permissions.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { LeaveStatus, LeaveType } from '../src/planning/entities/leave.entity';
import { LeavesController } from '../src/planning/leaves.controller';
import { LeavesService } from '../src/planning/leaves.service';
import { WorkPoliciesController } from '../src/planning/work-policies.controller';
import { WorkPoliciesService } from '../src/planning/work-policies.service';

const sensitiveAgent = {
  id: 102,
  tenantId: 'tenant-a',
  nom: 'Agent sensible',
  email: 'sensible@example.test',
  matricule: 'RH-102',
  telephone: '+33612345679',
  nir: '190010100000000',
  iban: 'FR7612345987650123456789014',
  personalEmail: 'perso@example.test',
  healthRecords: [{ id: 1, title: 'Aptitude' }],
  beneficiaries: [{ id: 1, name: 'Ayant droit' }],
  password: 'hashed-password',
  invitationToken: 'invite-token',
};

const userByScenario: Record<string, any> = {
  noPermissions: {
    id: 1,
    tenantId: 'tenant-a',
    role: 'AGENT',
    permissions: [],
  },
  hrAdmin: {
    id: 10,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: [
      'agents:read',
      'agents:write',
      'services:read',
      'services:write',
      'hr-policies:read',
      'hr-policies:write',
      'hr-policies:manage',
      'leaves:read',
      'leaves:manage',
    ],
  },
  manager: {
    id: 101,
    tenantId: 'tenant-a',
    role: 'MANAGER',
    permissions: ['agents:read', 'services:read', 'leaves:read'],
  },
  servicesWriter: {
    id: 11,
    tenantId: 'tenant-a',
    role: 'MANAGER',
    permissions: ['services:write'],
  },
  gradeWriter: {
    id: 12,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['agents:write'],
  },
  policyReader: {
    id: 13,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['hr-policies:read'],
  },
  policyWriter: {
    id: 14,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['hr-policies:write'],
  },
  policyManager: {
    id: 15,
    tenantId: 'tenant-a',
    role: 'HR_MANAGER',
    permissions: ['hr-policies:manage'],
  },
  leaveRequester: {
    id: 100,
    tenantId: 'tenant-a',
    role: 'AGENT',
    permissions: ['leaves:read', 'leaves:request'],
  },
  leaveValidator: {
    id: 101,
    tenantId: 'tenant-a',
    role: 'MANAGER',
    permissions: ['leaves:read', 'leaves:validate'],
  },
  superadmin: {
    id: 999,
    tenantId: 'root',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
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

describe('Sprint 14 RH recette (e2e)', () => {
  let app: INestApplication;

  const agentsService = {
    create: jest.fn(async (data) => ({ id: 100, ...data })),
    findAll: jest.fn(async (tenantId) => [{ id: 100, tenantId }]),
    findOne: jest.fn(async (_id, tenantId) => ({
      ...sensitiveAgent,
      tenantId,
    })),
    update: jest.fn(),
    remove: jest.fn(),
    getMyTeam: jest.fn(async () => [sensitiveAgent]),
    getHealthRecords: jest.fn(async (agentId, tenantId) => [
      { id: 1, agentId, tenantId, title: 'Aptitude' },
    ]),
    addHealthRecord: jest.fn(),
    deleteHealthRecord: jest.fn(),
  };

  const servicesService = {
    findAll: jest.fn(async (tenantId) => [{ id: 10, tenantId }]),
    getStats: jest.fn(),
    getServiceTree: jest.fn(async (tenantId) => [{ id: 10, tenantId }]),
    findOne: jest.fn(),
    getServiceHierarchy: jest.fn(),
    create: jest.fn(async (tenantId, data, actorId) => ({
      id: 10,
      tenantId,
      actorId,
      ...data,
    })),
    createSubService: jest.fn(),
    update: jest.fn(),
    assignResponsible: jest.fn(),
    remove: jest.fn(),
  };

  const gradesService = {
    findAll: jest.fn(async (tenantId) => [{ id: 20, tenantId }]),
    create: jest.fn(async (tenantId, data) => ({
      id: 20,
      tenantId,
      ...data,
    })),
    update: jest.fn(),
    remove: jest.fn(async (tenantId, id) => ({ tenantId, id })),
  };

  const workPoliciesService = {
    findAll: jest.fn(async (tenantId) => [{ id: 30, tenantId }]),
    create: jest.fn(async (tenantId, data, actorId) => ({
      id: 30,
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

  const leavesService = {
    requestLeave: jest.fn(
      async (tenantId, agentId, start, end, type, reason) => ({
        id: 200,
        tenantId,
        agentId,
        start,
        end,
        type,
        reason,
      }),
    ),
    getMyBalances: jest.fn(async (tenantId, agentId, year) => ({
      tenantId,
      agentId,
      year,
    })),
    getMyLeaves: jest.fn(async (tenantId, agentId) => [
      { id: 200, tenantId, agentId },
    ]),
    getTeamRequests: jest.fn(async (tenantId, managerId) => [
      { id: 200, tenantId, managerId },
    ]),
    validateLeave: jest.fn(async (tenantId, validatorId, id, status) => ({
      id,
      tenantId,
      validatorId,
      status,
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AgentsController,
        HospitalServicesController,
        GradesController,
        WorkPoliciesController,
        LeavesController,
      ],
      providers: [
        { provide: AgentsService, useValue: agentsService },
        { provide: HospitalServicesService, useValue: servicesService },
        { provide: GradesService, useValue: gradesService },
        { provide: WorkPoliciesService, useValue: workPoliciesService },
        { provide: LeavesService, useValue: leavesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = userByScenario[req.header('x-test-user') || 'hrAdmin'];
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

  it('forces agent tenant and masks sensitive HR fields for non-privileged readers', async () => {
    await request(app.getHttpServer())
      .post('/agents')
      .set('x-test-user', 'hrAdmin')
      .send({
        tenantId: 'tenant-b',
        nom: 'Nadia Kouame',
        email: 'nadia.kouame@example.test',
        matricule: 'RH-REC-100',
        telephone: '+33612345678',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/agents')
      .set('x-test-user', 'hrAdmin')
      .send({
        nom: 'Nadia Kouame',
        email: 'nadia.kouame@example.test',
        matricule: 'RH-REC-100',
        telephone: '+33612345678',
        nir: '190010100000000',
        iban: 'FR7612345987650123456789014',
      })
      .expect(201);

    expect(agentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a' }),
      10,
    );

    await request(app.getHttpServer())
      .get('/agents?tenantId=tenant-b')
      .set('x-test-user', 'hrAdmin')
      .expect(200);

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-a');

    const managerRead = await request(app.getHttpServer())
      .get('/agents/102')
      .set('x-test-user', 'manager')
      .expect(200);

    expect(managerRead.body).toEqual(
      expect.objectContaining({
        id: 102,
        nir: null,
        iban: null,
        personalEmail: null,
        healthRecords: null,
        beneficiaries: null,
      }),
    );
    expect(managerRead.body.password).toBeUndefined();
    expect(managerRead.body.invitationToken).toBeUndefined();

    const adminRead = await request(app.getHttpServer())
      .get('/agents/102')
      .set('x-test-user', 'hrAdmin')
      .expect(200);

    expect(adminRead.body).toEqual(
      expect.objectContaining({
        nir: sensitiveAgent.nir,
        iban: sensitiveAgent.iban,
        personalEmail: sensitiveAgent.personalEmail,
      }),
    );
  });

  it('keeps service and grade mutations scoped to the authenticated tenant and permissions', async () => {
    await request(app.getHttpServer())
      .get('/hospital-services?tenantId=tenant-b')
      .set('x-test-user', 'manager')
      .expect(200);

    expect(servicesService.findAll).toHaveBeenCalledWith('tenant-a');

    await request(app.getHttpServer())
      .get('/hospital-services?tenantId=tenant-b')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(servicesService.findAll).toHaveBeenLastCalledWith('tenant-b');

    await request(app.getHttpServer())
      .post('/hospital-services')
      .set('x-test-user', 'servicesWriter')
      .send({ tenantId: 'tenant-b', name: 'Urgences', code: 'URG' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/hospital-services')
      .set('x-test-user', 'servicesWriter')
      .send({ name: 'Urgences', code: 'URG' })
      .expect(201);

    expect(servicesService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ name: 'Urgences', code: 'URG' }),
      11,
    );

    await request(app.getHttpServer())
      .get('/grades')
      .set('x-test-user', 'manager')
      .expect(200);

    expect(gradesService.findAll).toHaveBeenCalledWith('tenant-a');

    await request(app.getHttpServer())
      .post('/grades')
      .set('x-test-user', 'gradeWriter')
      .send({ name: 'Infirmier diplome d Etat', code: 'IDE' })
      .expect(201);

    expect(gradesService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ name: 'Infirmier diplome d Etat' }),
    );

    await request(app.getHttpServer())
      .delete('/grades/20')
      .set('x-test-user', 'manager')
      .expect(403);
  });

  it('separates RH policy read, write and manage permissions for service-grade policies', async () => {
    await request(app.getHttpServer())
      .get('/work-policies')
      .set('x-test-user', 'noPermissions')
      .expect(403);

    await request(app.getHttpServer())
      .get('/work-policies')
      .set('x-test-user', 'policyReader')
      .expect(200);

    expect(workPoliciesService.findAll).toHaveBeenCalledWith('tenant-a');

    await request(app.getHttpServer())
      .post('/work-policies')
      .set('x-test-user', 'policyReader')
      .send({ hospitalServiceId: 10, gradeId: 20, maxWeeklyHours: 44 })
      .expect(403);

    await request(app.getHttpServer())
      .post('/work-policies')
      .set('x-test-user', 'policyWriter')
      .send({
        hospitalServiceId: 10,
        gradeId: 20,
        restHoursAfterGuard: 12,
        maxGuardDuration: 12,
        maxWeeklyHours: 44,
        onCallCompensationPercent: 0.5,
      })
      .expect(201);

    expect(workPoliciesService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ hospitalServiceId: 10, gradeId: 20 }),
      14,
    );

    await request(app.getHttpServer())
      .delete('/work-policies/30')
      .set('x-test-user', 'policyWriter')
      .expect(403);

    await request(app.getHttpServer())
      .delete('/work-policies/30')
      .set('x-test-user', 'policyManager')
      .expect(200);

    expect(workPoliciesService.remove).toHaveBeenCalledWith('tenant-a', 30, 15);
  });

  it('uses authenticated tenant and leave permissions for request, balances and validation', async () => {
    await request(app.getHttpServer())
      .post('/leaves/request')
      .set('x-test-user', 'noPermissions')
      .send({
        start: '2026-06-22',
        end: '2026-06-24',
        type: LeaveType.CONGE_ANNUEL,
        reason: 'Repos annuel planifie',
      })
      .expect(403);

    await request(app.getHttpServer())
      .post('/leaves/request')
      .set('x-test-user', 'leaveRequester')
      .send({
        tenantId: 'tenant-b',
        start: '2026-06-22',
        end: '2026-06-24',
        type: LeaveType.CONGE_ANNUEL,
        reason: 'Repos annuel planifie',
      })
      .expect(201);

    expect(leavesService.requestLeave).toHaveBeenCalledWith(
      'tenant-a',
      100,
      new Date('2026-06-22'),
      new Date('2026-06-24'),
      LeaveType.CONGE_ANNUEL,
      'Repos annuel planifie',
      expect.objectContaining({ id: 100, canManageAll: false }),
    );

    await request(app.getHttpServer())
      .get('/leaves/balances?year=2026')
      .set('x-test-user', 'leaveRequester')
      .expect(200);

    expect(leavesService.getMyBalances).toHaveBeenCalledWith(
      'tenant-a',
      100,
      2026,
    );

    await request(app.getHttpServer())
      .get('/leaves/team-requests')
      .set('x-test-user', 'leaveRequester')
      .expect(403);

    await request(app.getHttpServer())
      .get('/leaves/team-requests')
      .set('x-test-user', 'leaveValidator')
      .expect(200);

    expect(leavesService.getTeamRequests).toHaveBeenCalledWith('tenant-a', 101);

    await request(app.getHttpServer())
      .patch('/leaves/200/validate')
      .set('x-test-user', 'leaveValidator')
      .send({ status: LeaveStatus.APPROVED })
      .expect(200);

    expect(leavesService.validateLeave).toHaveBeenCalledWith(
      'tenant-a',
      101,
      200,
      LeaveStatus.APPROVED,
      undefined,
      false,
    );

    await request(app.getHttpServer())
      .post('/leaves/request')
      .set('x-test-user', 'hrAdmin')
      .send({
        agentId: 102,
        start: '2026-06-25',
        end: '2026-06-26',
        type: LeaveType.CONGE_ANNUEL,
        reason: 'Regularisation RH',
      })
      .expect(201);

    expect(leavesService.requestLeave).toHaveBeenLastCalledWith(
      'tenant-a',
      102,
      new Date('2026-06-25'),
      new Date('2026-06-26'),
      LeaveType.CONGE_ANNUEL,
      'Regularisation RH',
      expect.objectContaining({ id: 10, canManageAll: true }),
    );
  });
});
