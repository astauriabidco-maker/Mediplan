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
import { Attendance } from '../src/planning/entities/attendance.entity';
import { Leave } from '../src/planning/entities/leave.entity';
import { Shift, ShiftType } from '../src/planning/entities/shift.entity';
import { WorkPolicy } from '../src/planning/entities/work-policy.entity';
import { PlanningController } from '../src/planning/planning.controller';
import { PlanningService } from '../src/planning/planning.service';
import { OptimizationService } from '../src/planning/optimization.service';
import { AutoSchedulerService } from '../src/planning/auto-scheduler.service';
import { DocumentsService } from '../src/documents/documents.service';
import { MailService } from '../src/mail/mail.service';
import { ComplianceRuleCode } from '../src/planning/compliance-validation.types';

const JWT_SECRET = 'sprint14_auditor_recette_secret';
const tenantId = 'tenant-sprint14-auditor';
const periodStart = '2026-08-03T00:00:00.000Z';
const periodEnd = '2026-08-04T00:00:00.000Z';
const blockedActionId = `${periodStart}_${periodEnd}`;

type MemoryEntity = Record<string, any> & { id?: number; tenantId?: string };

class MemoryRepository<T extends MemoryEntity> {
  private nextId = 1;

  constructor(private readonly rows: T[] = []) {
    this.nextId = Math.max(0, ...rows.map((row) => row.id || 0)) + 1;
  }

  create(data: Partial<T>) {
    return {
      timestamp: new Date('2026-08-03T10:00:00.000Z'),
      ...data,
    } as T;
  }

  async save(data: T | T[]) {
    if (Array.isArray(data)) {
      return Promise.all(data.map((entry) => this.save(entry))) as Promise<T[]>;
    }

    if (!data.id) data.id = this.nextId++;
    const index = this.rows.findIndex((row) => row.id === data.id);
    if (index >= 0) {
      this.rows[index] = { ...this.rows[index], ...data };
    } else {
      this.rows.push(data);
    }
    return data;
  }

  async find(
    options: {
      where?: any;
      order?: Record<string, 'ASC' | 'DESC'>;
      take?: number;
    } = {},
  ) {
    const filtered = this.rows.filter((row) =>
      this.matchesWhere(row, options.where),
    );
    const sorted = this.sortRows(filtered, options.order);
    return options.take ? sorted.slice(0, options.take) : sorted;
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
    const state: Record<string, any> = {};
    const builder = {
      addSelect: jest.fn(() => builder),
      leftJoinAndSelect: jest.fn(() => builder),
      where: jest.fn((_clause: string, params?: Record<string, any>) => {
        Object.assign(state, params);
        return builder;
      }),
      andWhere: jest.fn((_clause: string, params?: Record<string, any>) => {
        Object.assign(state, params);
        return builder;
      }),
      orderBy: jest.fn(() => builder),
      take: jest.fn((limit: number) => {
        state.limit = limit;
        return builder;
      }),
      getOne: jest.fn(async () => this.filterRows(state)[0] || null),
      getMany: jest.fn(async () => {
        const rows = this.filterRows(state);
        return state.limit ? rows.slice(0, state.limit) : rows;
      }),
    };
    return builder;
  }

  all() {
    return this.rows;
  }

  private filterRows(state: Record<string, any>) {
    return this.rows.filter((row) => {
      if (state.email && row.email !== state.email) return false;
      if (state.tenantId && row.tenantId !== state.tenantId) return false;
      if (state.actorId && row.actorId !== state.actorId) return false;
      if (state.action && row.action !== state.action) return false;
      if (state.entityType && row.entityType !== state.entityType) return false;
      if (state.entityId && row.entityId !== state.entityId) return false;
      if (state.detailAction && row.details?.action !== state.detailAction)
        return false;
      if (state.from && row.timestamp < state.from) return false;
      if (state.to && row.timestamp > state.to) return false;
      return true;
    });
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
      if (
        value &&
        typeof value === 'object' &&
        ('type' in value || '_type' in value) &&
        ('value' in value || '_value' in value)
      ) {
        return this.matchesFindOperator(row[key], value);
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

  private matchesFindOperator(rowValue: any, operator: any): boolean {
    const candidate =
      rowValue instanceof Date
        ? rowValue.getTime()
        : new Date(rowValue).getTime();
    const operatorType = operator.type ?? operator._type;
    const operatorValue = operator.value ?? operator._value;
    const values = Array.isArray(operatorValue)
      ? operatorValue.map((value: any) =>
          value instanceof Date ? value.getTime() : new Date(value).getTime(),
        )
      : operatorValue instanceof Date
        ? operatorValue.getTime()
        : new Date(operatorValue).getTime();

    if (operatorType === 'between' && Array.isArray(values)) {
      return candidate >= values[0] && candidate <= values[1];
    }
    if (operatorType === 'moreThanOrEqual') return candidate >= values;
    if (operatorType === 'lessThanOrEqual') return candidate <= values;
    return rowValue === operatorValue;
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

describe('Sprint 14 Phase 3 auditor recette (e2e)', () => {
  let app: INestApplication;
  let auditRepository: MemoryRepository<AuditLog>;
  let shiftRepository: MemoryRepository<Shift>;
  let planningState: {
    fixed: boolean;
    published: boolean;
    reports: any[];
    timeline: any[];
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    planningState = {
      fixed: false,
      published: false,
      reports: [],
      timeline: [],
    };

    const password = await bcrypt.hash('Sprint14!Pass', 10);
    const agentRepository = new MemoryRepository<Agent>([
      user(10, 'manager@sprint14.test', UserRole.MANAGER, password),
      user(30, 'audit@sprint14.test', 'AUDITOR', password),
      {
        id: 101,
        tenantId,
        nom: 'Agent surcharge',
        email: 'agent@sprint14.test',
        matricule: 'S14-101',
        telephone: '0101010101',
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
      } as Agent,
      {
        id: 102,
        tenantId,
        nom: 'Agent relais',
        email: 'replacement@sprint14.test',
        matricule: 'S14-102',
        telephone: '0101010102',
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
      } as Agent,
    ]);
    auditRepository = new MemoryRepository<AuditLog>();
    shiftRepository = new MemoryRepository<Shift>([
      {
        id: 701,
        tenantId,
        agent: { id: 101 } as Agent,
        start: new Date('2026-08-03T08:00:00.000Z'),
        end: new Date('2026-08-03T20:00:00.000Z'),
        postId: 'S14-AUDIT-BLOCKED',
        type: ShiftType.NORMAL,
        status: 'PENDING',
        complianceExceptionApproved: false,
      } as Shift,
    ]);

    const auditService = new AuditService(auditRepository as any);
    const planningService = createAuditorRecettePlanningService(auditService);

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
        { provide: AutoSchedulerService, useValue: {} },
        { provide: DocumentsService, useValue: {} },
        { provide: MailService, useValue: { sendInvitation: jest.fn() } },
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepository },
        { provide: getRepositoryToken(Shift), useValue: shiftRepository },
        {
          provide: getRepositoryToken(Facility),
          useValue: new MemoryRepository<Facility>(),
        },
        {
          provide: getRepositoryToken(HospitalService),
          useValue: new MemoryRepository<HospitalService>(),
        },
        {
          provide: getRepositoryToken(Grade),
          useValue: new MemoryRepository<Grade>(),
        },
        {
          provide: getRepositoryToken(WorkPolicy),
          useValue: new MemoryRepository<WorkPolicy>(),
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

  it('proves auditor read/export/verify and reconstructs alert decision to action to publication', async () => {
    const managerToken = await loginAs('manager@sprint14.test');
    const auditorToken = await loginAs('audit@sprint14.test');

    await request(app.getHttpServer())
      .get('/planning/compliance/worklist')
      .auth(managerToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0]).toEqual(
          expect.objectContaining({
            alertId: 9001,
            shiftId: 701,
            ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          }),
        );
      });

    await request(app.getHttpServer())
      .get('/planning/shifts/701/compliance')
      .auth(managerToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.validation).toEqual(
          expect.objectContaining({
            isValid: false,
            blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
          }),
        );
      });

    await request(app.getHttpServer())
      .post('/planning/publish')
      .auth(managerToken, { type: 'bearer' })
      .send({ start: periodStart, end: periodEnd })
      .expect(400)
      .expect(({ body }) => {
        const report = body.report ?? body.message?.report;
        expect(report).toEqual(expect.objectContaining({ publishable: false }));
      });

    await request(app.getHttpServer())
      .post('/planning/shifts/701/reassign')
      .auth(managerToken, { type: 'bearer' })
      .send({
        agentId: 102,
        reason: 'Recette Sprint 14: decision manager apres alerte hebdomadaire',
        recommendationId:
          'recommendation:shift_validation:shift:701:WEEKLY_HOURS_LIMIT_EXCEEDED',
        alertId: 9001,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.agent).toEqual(expect.objectContaining({ id: 102 }));
        expect(body.trace).toEqual(expect.objectContaining({ alertId: 9001 }));
      });

    await request(app.getHttpServer())
      .post('/planning/shifts/701/revalidate')
      .auth(managerToken, { type: 'bearer' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.validation.blockingReasons).toEqual([]);
      });

    await request(app.getHttpServer())
      .post('/planning/publish/preview')
      .auth(managerToken, { type: 'bearer' })
      .send({ start: periodStart, end: periodEnd })
      .expect(201)
      .expect(({ body }) => {
        expect(body.publishable).toBe(true);
        expect(body.violations).toEqual([]);
      });

    await request(app.getHttpServer())
      .post('/planning/publish')
      .auth(managerToken, { type: 'bearer' })
      .send({ start: periodStart, end: periodEnd })
      .expect(201)
      .expect(({ body }) => {
        expect(body.affected).toBe(1);
        expect(body.report.validatedShiftIds).toEqual([701]);
      });

    await request(app.getHttpServer())
      .get(
        '/planning/compliance/reports?from=2026-08-01T00:00:00.000Z&limit=10',
      )
      .auth(auditorToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
        expect(body.map((report) => report.blocked)).toEqual([true, false]);
        expect(body[1]).toEqual(
          expect.objectContaining({
            action: 'PUBLISH_PLANNING',
            affected: 1,
          }),
        );
      });

    await request(app.getHttpServer())
      .get('/planning/compliance/timeline?shiftId=701&limit=50')
      .auth(auditorToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.events.map((event) => event.action)).toEqual([
          'ALERT_RAISED',
          'REASSIGN_SHIFT',
          'REVALIDATE_SHIFT',
          'PUBLISH_PLANNING',
        ]);
        expect(body.events[1]).toEqual(
          expect.objectContaining({
            alertId: 9001,
            recommendationId:
              'recommendation:shift_validation:shift:701:WEEKLY_HOURS_LIMIT_EXCEEDED',
          }),
        );
      });

    const actionAudit = await request(app.getHttpServer())
      .get('/audit')
      .query({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.SHIFT,
        entityId: '701',
        detailAction: 'REASSIGN_SHIFT',
        limit: '10',
      })
      .auth(auditorToken, { type: 'bearer' })
      .expect(200);
    expect(actionAudit.body).toHaveLength(1);
    expect(actionAudit.body[0].details).toEqual(
      expect.objectContaining({
        action: 'REASSIGN_SHIFT',
        alertId: 9001,
        afterAgentId: 102,
      }),
    );

    const publicationAudit = await request(app.getHttpServer())
      .get('/audit')
      .query({
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.PLANNING,
        detailAction: 'PUBLISH_PLANNING',
        limit: '10',
      })
      .auth(auditorToken, { type: 'bearer' })
      .expect(200);
    expect(publicationAudit.body[0].details.report.validatedShiftIds).toEqual([
      701,
    ]);

    const auditExport = await request(app.getHttpServer())
      .get('/audit/export')
      .query({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
        limit: '100',
      })
      .auth(auditorToken, { type: 'bearer' })
      .expect(200);
    expect(auditExport.body.filters).toEqual(
      expect.objectContaining({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-12-31T23:59:59.999Z',
        limit: 100,
      }),
    );
    expect(auditExport.body.chainVerification).toEqual(
      expect.objectContaining({ tenantId, valid: true, total: 3, issues: [] }),
    );
    expect(auditExport.body.logs.map((log) => log.details.action)).toEqual([
      'PUBLISH_PLANNING',
      'REVALIDATE_SHIFT',
      'REASSIGN_SHIFT',
    ]);

    await request(app.getHttpServer())
      .get('/audit/verify')
      .auth(auditorToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            tenantId,
            valid: true,
            total: 3,
            issues: [],
          }),
        );
      });

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

  function createAuditorRecettePlanningService(auditService: AuditService) {
    return {
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
                id: 'alert:9001',
                alertId: 9001,
                category: 'WEEKLY_OVERLOAD',
                source: 'SHIFT_VALIDATION',
                severity: 'HIGH',
                agentId: 101,
                shiftId: 701,
                title: 'Depassement hebdomadaire',
                ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
              },
            ],
      })),
      explainShiftCompliance: jest.fn(async () => ({
        shiftId: 701,
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
      reassignShift: jest.fn(
        async (requestTenantId, actorId, shiftId, agentId, trace) => {
          planningState.fixed = true;
          planningState.timeline.push({
            action: 'ALERT_RAISED',
            alertId: trace.alertId,
            shiftId,
            ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          });
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
              alertId: trace.alertId,
              recommendationId: trace.recommendationId,
              beforeAgentId: 101,
              afterAgentId: agentId,
            },
          );
          planningState.timeline.push({
            action: 'REASSIGN_SHIFT',
            shiftId,
            alertId: trace.alertId,
            recommendationId: trace.recommendationId,
            afterAgentId: agentId,
          });
          return { id: shiftId, agent: { id: agentId }, trace };
        },
      ),
      revalidateShift: jest.fn(async (requestTenantId, actorId, shiftId) => {
        await auditService.log(
          requestTenantId,
          actorId,
          AuditAction.VALIDATE,
          AuditEntityType.SHIFT,
          shiftId,
          {
            action: 'REVALIDATE_SHIFT',
            isValid: planningState.fixed,
            blockingReasons: [],
          },
        );
        planningState.timeline.push({
          action: 'REVALIDATE_SHIFT',
          shiftId,
          isValid: planningState.fixed,
        });
        return {
          shift: { id: shiftId },
          validation: {
            isValid: planningState.fixed,
            blockingReasons: [],
            warnings: [],
            metadata: {},
          },
        };
      }),
      previewPublishPlanning: jest.fn(async () => ({
        publishable: planningState.fixed,
        totalPending: 1,
        validatedShiftIds: planningState.fixed ? [701] : [],
        violations: [],
        warnings: [],
        recommendations: [],
      })),
      publishPlanning: jest.fn(async (requestTenantId, actorId, start, end) => {
        if (!planningState.fixed) {
          const report = {
            start,
            end,
            publishable: false,
            totalPending: 1,
            validatedShiftIds: [],
            violations: [
              {
                alertId: 9001,
                shiftId: 701,
                agentId: 101,
                blockingReasons: [
                  ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
                ],
                metadata: { projected: 52, limit: 48 },
              },
            ],
            warnings: [],
            recommendations: ['Reassigner le shift a un agent disponible.'],
          };
          planningState.reports.push({
            action: 'PUBLISH_PLANNING',
            blocked: true,
            affected: 0,
            report,
          });
          throw new BadRequestException({
            message: 'Planning publication blocked by compliance violations',
            report,
          });
        }

        planningState.published = true;
        const shift = shiftRepository.all().find((entry) => entry.id === 701);
        if (shift) shift.status = 'VALIDATED';
        const report = {
          start,
          end,
          publishable: true,
          totalPending: 1,
          validatedShiftIds: [701],
          violations: [],
          warnings: [],
          recommendations: [],
        };
        await auditService.log(
          requestTenantId,
          actorId,
          AuditAction.UPDATE,
          AuditEntityType.PLANNING,
          blockedActionId,
          { action: 'PUBLISH_PLANNING', blocked: false, affected: 1, report },
        );
        planningState.reports.push({
          action: 'PUBLISH_PLANNING',
          blocked: false,
          affected: 1,
          report,
        });
        planningState.timeline.push({
          action: 'PUBLISH_PLANNING',
          shiftId: 701,
          affected: 1,
        });
        return { message: 'Planning publie avec succes', affected: 1, report };
      }),
      getComplianceReports: jest.fn(async () => planningState.reports),
      getPlanningComplianceTimeline: jest.fn(async () => ({
        tenantId,
        events: planningState.timeline,
      })),
    };
  }
});
