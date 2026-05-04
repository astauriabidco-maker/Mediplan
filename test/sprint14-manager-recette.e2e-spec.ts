import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import {
  Agent,
  UserRole,
  UserStatus,
} from '../src/agents/entities/agent.entity';
import { Facility } from '../src/agents/entities/facility.entity';
import { Grade } from '../src/agents/entities/grade.entity';
import { HospitalService } from '../src/agents/entities/hospital-service.entity';
import { AuditController } from '../src/audit/audit.controller';
import { AuditService } from '../src/audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../src/audit/entities/audit-log.entity';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { HOSPITAL_ROLE_PERMISSIONS } from '../src/auth/permissions';
import { RolesGuard } from '../src/auth/roles.guard';
import { DocumentsService } from '../src/documents/documents.service';
import { MailService } from '../src/mail/mail.service';
import { Attendance } from '../src/planning/entities/attendance.entity';
import { Leave } from '../src/planning/entities/leave.entity';
import { Shift, ShiftType } from '../src/planning/entities/shift.entity';
import { WorkPolicy } from '../src/planning/entities/work-policy.entity';
import { AutoSchedulerService } from '../src/planning/auto-scheduler.service';
import { ComplianceRuleCode } from '../src/planning/compliance-validation.types';
import { OptimizationService } from '../src/planning/optimization.service';
import { PlanningController } from '../src/planning/planning.controller';
import { PlanningService } from '../src/planning/planning.service';

const JWT_SECRET = 'sprint14_manager_recette_secret';
const tenantId = 'tenant-sprint14';
const periodStart = '2026-08-03T00:00:00.000Z';
const periodEnd = '2026-08-04T00:00:00.000Z';
const blockedShiftId = 1401;

type MemoryEntity = Record<string, any> & { id?: number; tenantId?: string };

class MemoryRepository<T extends MemoryEntity> {
  private nextId = 1;

  constructor(private readonly rows: T[] = []) {
    this.nextId = Math.max(0, ...rows.map((row) => row.id || 0)) + 1;
  }

  create(data: Partial<T>) {
    return { ...data } as T;
  }

  async save(data: T | T[]) {
    if (Array.isArray(data)) {
      return Promise.all(data.map((entry) => this.save(entry))) as Promise<T[]>;
    }

    if (!data.id) data.id = this.nextId++;
    const index = this.rows.findIndex((row) => row.id === data.id);
    if (index >= 0) this.rows[index] = { ...this.rows[index], ...data };
    else this.rows.push(data);
    return data;
  }

  async find(
    options: { where?: any; order?: Record<string, 'ASC' | 'DESC'> } = {},
  ) {
    const filtered = this.rows.filter((row) =>
      this.matchesWhere(row, options.where),
    );
    return this.sortRows(filtered, options.order);
  }

  async findOne(
    options: { where?: any; order?: Record<string, 'ASC' | 'DESC'> } = {},
  ) {
    return (await this.find(options))[0] || null;
  }

  async update(criteria: any, partial: Partial<T>) {
    this.rows
      .filter((row) => this.matchesWhere(row, criteria))
      .forEach((row) => Object.assign(row, partial));
    return { affected: 1 };
  }

  createQueryBuilder() {
    const state: { email?: string } = {};
    const builder = {
      addSelect: jest.fn(() => builder),
      leftJoinAndSelect: jest.fn(() => builder),
      where: jest.fn((_clause: string, params?: { email?: string }) => {
        state.email = params?.email;
        return builder;
      }),
      getOne: jest.fn(
        async () => this.rows.find((row) => row.email === state.email) || null,
      ),
    };
    return builder;
  }

  all() {
    return this.rows;
  }

  private matchesWhere(row: T, where: any): boolean {
    if (!where) return true;
    if (Array.isArray(where))
      return where.some((entry) => this.matchesWhere(row, entry));

    return Object.entries(where).every(([key, value]) => {
      if (
        key === 'chainSequence' &&
        value &&
        typeof value === 'object' &&
        !(value instanceof Date)
      ) {
        return row[key] !== null && row[key] !== undefined;
      }
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return this.matchesWhere(row[key] || {}, value);
      }
      if (value instanceof Date && row[key] instanceof Date) {
        return row[key].getTime() === value.getTime();
      }
      return row[key] === value;
    });
  }

  private sortRows(rows: T[], order?: Record<string, 'ASC' | 'DESC'>) {
    if (!order) return [...rows];
    const entries = Object.entries(order);
    return [...rows].sort((left, right) => {
      for (const [key, direction] of entries) {
        const leftValue =
          left[key] instanceof Date ? left[key].getTime() : left[key];
        const rightValue =
          right[key] instanceof Date ? right[key].getTime() : right[key];
        if (leftValue === rightValue) continue;
        return (
          (leftValue > rightValue ? 1 : -1) * (direction === 'ASC' ? 1 : -1)
        );
      }
      return 0;
    });
  }
}

describe('Sprint 14 Phase 1 manager guided recette (e2e)', () => {
  let app: INestApplication;
  let auditRepository: MemoryRepository<AuditLog>;
  let shiftRepository: MemoryRepository<Shift>;
  let planningState: { fixed: boolean; published: boolean };

  beforeEach(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    planningState = { fixed: false, published: false };

    const password = await bcrypt.hash('Sprint14!Pass', 10);
    const agentRepository = new MemoryRepository<Agent>([
      user(10, 'manager@sprint14.test', UserRole.MANAGER, password),
      user(20, 'auditor@sprint14.test', 'AUDITOR', password),
      {
        id: 101,
        tenantId,
        nom: 'Agent surcharge',
        email: 'overloaded@sprint14.test',
        matricule: 'S14-101',
        telephone: '0101010101',
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
      } as Agent,
      {
        id: 102,
        tenantId,
        nom: 'Agent disponible',
        email: 'available@sprint14.test',
        matricule: 'S14-102',
        telephone: '0101010102',
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
      } as Agent,
    ]);
    auditRepository = new MemoryRepository<AuditLog>();
    shiftRepository = new MemoryRepository<Shift>([
      {
        id: blockedShiftId,
        tenantId,
        agent: { id: 101 } as Agent,
        start: new Date('2026-08-03T08:00:00.000Z'),
        end: new Date('2026-08-03T20:00:00.000Z'),
        postId: 'S14-GUIDED',
        type: ShiftType.NORMAL,
        status: 'PENDING',
        complianceExceptionApproved: false,
      } as Shift,
    ]);

    const auditService = new AuditService(auditRepository as any);
    const planningService = createPlanningGuidedService(auditService);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '60m' },
        }),
      ],
      controllers: [AuthController, PlanningController, AuditController],
      providers: [
        AuthService,
        JwtStrategy,
        RolesGuard,
        { provide: AuditService, useValue: auditService },
        { provide: PlanningService, useValue: planningService },
        { provide: OptimizationService, useValue: { compute: jest.fn() } },
        {
          provide: AutoSchedulerService,
          useValue: { findReplacements: jest.fn() },
        },
        { provide: DocumentsService, useValue: {} },
        { provide: MailService, useValue: { sendInvitation: jest.fn() } },
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepository },
        { provide: getRepositoryToken(Shift), useValue: shiftRepository },
        {
          provide: getRepositoryToken(Facility),
          useValue: new MemoryRepository<Facility>([
            {
              id: 1,
              tenantId,
              name: 'Hopital Sprint 14',
              code: 'S14',
            } as Facility,
          ]),
        },
        {
          provide: getRepositoryToken(HospitalService),
          useValue: new MemoryRepository<HospitalService>([
            {
              id: 1,
              tenantId,
              name: 'Urgences',
              code: 'URG',
              facilityId: 1,
            } as HospitalService,
          ]),
        },
        {
          provide: getRepositoryToken(Grade),
          useValue: new MemoryRepository<Grade>([
            { id: 1, tenantId, name: 'IDE', code: 'IDE' } as Grade,
          ]),
        },
        {
          provide: getRepositoryToken(WorkPolicy),
          useValue: new MemoryRepository<WorkPolicy>([
            {
              id: 1,
              tenantId,
              maxWeeklyHours: 48,
              hospitalServiceId: 1,
              gradeId: 1,
            } as WorkPolicy,
          ]),
        },
        {
          provide: getRepositoryToken(Leave),
          useValue: new MemoryRepository<Leave>(),
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: new MemoryRepository<Attendance>(),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('guides a manager from detection to explanation, correction, preview and publication', async () => {
    const managerToken = await loginAs('manager@sprint14.test');
    const auditorToken = await loginAs('auditor@sprint14.test');

    await request(app.getHttpServer())
      .get(`/planning/manager/cockpit?from=${periodStart}&to=${periodEnd}`)
      .auth(managerToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.kpis.blockedShifts).toBe(1);
        expect(body.priorityActions[0]).toEqual(
          expect.objectContaining({
            step: 'DETECT',
            shiftId: blockedShiftId,
            nextAction: 'OPEN_WORKLIST',
          }),
        );
      });

    await request(app.getHttpServer())
      .get(`/planning/compliance/worklist?from=${periodStart}&to=${periodEnd}`)
      .auth(managerToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0]).toEqual(
          expect.objectContaining({
            shiftId: blockedShiftId,
            ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
            availableActions: expect.arrayContaining([
              'REASSIGN_SHIFT',
              'REVALIDATE_SHIFT',
            ]),
          }),
        );
      });

    await request(app.getHttpServer())
      .get(`/planning/shifts/${blockedShiftId}/compliance`)
      .auth(managerToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.validation).toEqual(
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
      });

    await request(app.getHttpServer())
      .get(`/planning/shifts/${blockedShiftId}/correction-guidance`)
      .auth(managerToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.steps).toEqual([
          expect.objectContaining({ step: 'UNDERSTAND' }),
          expect.objectContaining({ step: 'FIX' }),
          expect.objectContaining({ step: 'PUBLISH' }),
        ]);
      });

    await request(app.getHttpServer())
      .post('/planning/publish/preview')
      .auth(managerToken, { type: 'bearer' })
      .send({ start: periodStart, end: periodEnd })
      .expect(201)
      .expect(({ body }) => {
        expect(body.publishable).toBe(false);
        expect(body.report.violations[0].shiftId).toBe(blockedShiftId);
      });

    await request(app.getHttpServer())
      .post(`/planning/shifts/${blockedShiftId}/reassign`)
      .auth(managerToken, { type: 'bearer' })
      .send({
        agentId: 102,
        reason:
          'Recette Sprint 14: correction guidee apres surcharge hebdomadaire',
        recommendationId:
          'recommendation:shift_validation:shift:1401:WEEKLY_HOURS_LIMIT_EXCEEDED',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.agent).toEqual(expect.objectContaining({ id: 102 }));
      });

    await request(app.getHttpServer())
      .post(`/planning/shifts/${blockedShiftId}/revalidate`)
      .auth(managerToken, { type: 'bearer' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.validation).toEqual(
          expect.objectContaining({ isValid: true, blockingReasons: [] }),
        );
      });

    await request(app.getHttpServer())
      .post('/planning/publish/preview')
      .auth(managerToken, { type: 'bearer' })
      .send({ start: periodStart, end: periodEnd })
      .expect(201)
      .expect(({ body }) => {
        expect(body.publishable).toBe(true);
        expect(body.report.violations).toEqual([]);
      });

    await request(app.getHttpServer())
      .post('/planning/publish')
      .auth(managerToken, { type: 'bearer' })
      .send({ start: periodStart, end: periodEnd })
      .expect(201)
      .expect(({ body }) => {
        expect(body.affected).toBe(1);
        expect(body.report.validatedShiftIds).toEqual([blockedShiftId]);
      });

    await request(app.getHttpServer())
      .get('/audit/verify')
      .auth(auditorToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ tenantId, valid: true, total: 2 }),
        );
      });

    const auditDetails = auditRepository.all().map((entry) => entry.details);
    expect(auditDetails).toEqual([
      expect.objectContaining({ action: 'REASSIGN_SHIFT' }),
      expect.objectContaining({ action: 'PUBLISH_PLANNING', blocked: false }),
    ]);
    expect(planningState.published).toBe(true);
  });

  async function loginAs(email: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Sprint14!Pass' })
      .expect(201);

    expect(response.body.user.email).toBe(email);
    return response.body.access_token as string;
  }

  function user(id: number, email: string, role: string, password: string) {
    return {
      id,
      tenantId,
      email,
      password,
      nom: email.split('@')[0],
      matricule: `USR-${id}`,
      telephone: '0101010101',
      role,
      status: UserStatus.ACTIVE,
      dbRole: {
        name: role,
        permissions: HOSPITAL_ROLE_PERMISSIONS[role]?.permissions || [],
      },
    } as Agent;
  }

  function createPlanningGuidedService(auditService: AuditService) {
    const blockedReport = (start: Date, end: Date) => ({
      start,
      end,
      publishable: false,
      totalPending: 1,
      validatedShiftIds: [],
      violations: [
        {
          shiftId: blockedShiftId,
          agentId: 101,
          blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
          metadata: {
            [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
              projected: 52,
              limit: 48,
            },
          },
        },
      ],
      warnings: [],
      recommendations: [
        'Reassigner le shift a un agent disponible puis revalider.',
      ],
    });

    const cleanReport = (start: Date, end: Date) => ({
      start,
      end,
      publishable: true,
      totalPending: 1,
      validatedShiftIds: [blockedShiftId],
      violations: [],
      warnings: [],
      recommendations: [],
    });

    return {
      getManagerCockpit: jest.fn(async () => ({
        tenantId,
        period: { from: periodStart, to: periodEnd },
        health: planningState.fixed ? 'HEALTHY' : 'DEGRADED',
        kpis: {
          openAlerts: planningState.fixed ? 0 : 1,
          blockedShifts: planningState.fixed ? 0 : 1,
          publishable: planningState.fixed,
        },
        priorityActions: planningState.fixed
          ? []
          : [
              {
                step: 'DETECT',
                shiftId: blockedShiftId,
                severity: 'HIGH',
                title: 'Shift bloque avant publication',
                nextAction: 'OPEN_WORKLIST',
              },
            ],
      })),
      getManagerWorklist: jest.fn(async () => ({
        tenantId,
        total: planningState.fixed ? 0 : 1,
        counters: {
          REST_INSUFFICIENT: 0,
          WEEKLY_OVERLOAD: planningState.fixed ? 0 : 1,
          MISSING_COMPETENCY: 0,
          LEAVE_CONFLICT: 0,
        },
        items: planningState.fixed
          ? []
          : [
              {
                id: `shift:${blockedShiftId}:WEEKLY_HOURS_LIMIT_EXCEEDED`,
                category: 'WEEKLY_OVERLOAD',
                source: 'SHIFT_VALIDATION',
                severity: 'HIGH',
                agentId: 101,
                shiftId: blockedShiftId,
                title: 'Depassement hebdomadaire',
                ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
                availableActions: ['REASSIGN_SHIFT', 'REVALIDATE_SHIFT'],
              },
            ],
      })),
      explainShiftCompliance: jest.fn(async () => ({
        shift: {
          id: blockedShiftId,
          agentId: planningState.fixed ? 102 : 101,
          start: '2026-08-03T08:00:00.000Z',
          end: '2026-08-03T20:00:00.000Z',
        },
        validation: {
          isValid: planningState.fixed,
          blockingReasons: planningState.fixed
            ? []
            : [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
          warnings: [],
          metadata: planningState.fixed
            ? {}
            : {
                [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
                  projected: 52,
                  limit: 48,
                },
              },
        },
      })),
      getShiftCorrectionGuidance: jest.fn(async () => ({
        shiftId: blockedShiftId,
        steps: [
          {
            step: 'UNDERSTAND',
            label: 'Lire la cause et les seuils',
            evidence: 'projected=52, limit=48',
          },
          {
            step: 'FIX',
            label: 'Reassigner a un agent compatible',
            endpoint: `/planning/shifts/${blockedShiftId}/reassign`,
          },
          {
            step: 'PUBLISH',
            label: 'Revalider, previsualiser, publier',
            endpoint: '/planning/publish',
          },
        ],
      })),
      previewPublishPlanning: jest.fn(async (_requestTenantId, start, end) => ({
        publishable: planningState.fixed,
        report: planningState.fixed
          ? cleanReport(start, end)
          : blockedReport(start, end),
      })),
      reassignShift: jest.fn(
        async (requestTenantId, actorId, shiftId, agentId, trace) => {
          planningState.fixed = true;
          const shift = shiftRepository
            .all()
            .find((entry) => entry.id === shiftId);
          if (shift) shift.agent = { id: agentId } as Agent;
          await auditService.log(
            requestTenantId,
            actorId,
            AuditAction.UPDATE,
            AuditEntityType.SHIFT,
            shiftId,
            {
              action: 'REASSIGN_SHIFT',
              reason: trace.reason,
              recommendationId: trace.recommendationId,
              afterAgentId: agentId,
            },
          );
          return { id: shiftId, agent: { id: agentId } };
        },
      ),
      revalidateShift: jest.fn(async () => ({
        shift: { id: blockedShiftId },
        validation: {
          isValid: planningState.fixed,
          blockingReasons: planningState.fixed
            ? []
            : [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
          warnings: [],
          metadata: {},
        },
      })),
      publishPlanning: jest.fn(async (requestTenantId, actorId, start, end) => {
        if (!planningState.fixed) {
          throw new BadRequestException({
            message: 'Planning publication blocked by compliance violations',
            report: blockedReport(start, end),
          });
        }

        planningState.published = true;
        const shift = shiftRepository
          .all()
          .find((entry) => entry.id === blockedShiftId);
        if (shift) shift.status = 'VALIDATED';
        const report = cleanReport(start, end);
        await auditService.log(
          requestTenantId,
          actorId,
          AuditAction.UPDATE,
          AuditEntityType.PLANNING,
          `${start.toISOString()}_${end.toISOString()}`,
          { action: 'PUBLISH_PLANNING', blocked: false, affected: 1, report },
        );
        return { message: 'Planning publie avec succes', affected: 1, report };
      }),
    };
  }
});
