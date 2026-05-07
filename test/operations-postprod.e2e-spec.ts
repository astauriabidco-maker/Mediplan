import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AuditController } from '../src/audit/audit.controller';
import { AuditService } from '../src/audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../src/audit/entities/audit-log.entity';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import {
  OperationIncident,
  OperationIncidentSeverity,
  OperationIncidentStatus,
} from '../src/operations/entities/operation-incident.entity';
import {
  OperationRoutineRun,
  OperationRoutineRunStatus,
} from '../src/operations/entities/operation-routine-run.entity';
import {
  OperationalAlert,
  OperationalAlertSeverity,
  OperationalAlertStatus,
  OperationalAlertType,
} from '../src/operations/entities/operational-alert.entity';
import { OpsOnCallConfig } from '../src/operations/entities/ops-on-call-config.entity';
import { OperationsJournalEntry } from '../src/operations/entities/operations-journal-entry.entity';
import { OpsOnCallConfigService } from '../src/operations/ops-on-call-config.service';
import { OpsNotificationService } from '../src/operations/ops-notification.service';
import { OpsPreActionValidationService } from '../src/operations/ops-pre-action-validation.service';
import { OpsRoutineSchedulerService } from '../src/operations/ops-routine-scheduler.service';
import { OperationsController } from '../src/operations/operations.controller';
import { OperationsService } from '../src/operations/operations.service';

type MemoryEntity = Record<string, any> & { id?: number; tenantId?: string };

class MemoryRepository<T extends MemoryEntity> {
  private nextId = 1;

  constructor(private readonly rows: T[] = []) {}

  create(data: Partial<T>) {
    return { ...data } as T;
  }

  async save(data: T | T[]) {
    if (Array.isArray(data)) {
      return Promise.all(data.map((entry) => this.save(entry))) as Promise<T[]>;
    }

    if (!data.id) data.id = this.nextId++;
    const now = new Date();
    if (!data.timestamp) data.timestamp = now;
    if (!data.createdAt) data.createdAt = now;
    data.updatedAt = now;

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
    return this.sortRows(filtered, options.order).slice(0, options.take);
  }

  async findOne(
    options: { where?: any; order?: Record<string, 'ASC' | 'DESC'> } = {},
  ) {
    return (await this.find(options))[0] || null;
  }

  createQueryBuilder() {
    const repository = this;
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => repository.all()),
    };
    return qb;
  }

  all() {
    return this.rows;
  }

  private matchesWhere(row: T, where: any): boolean {
    if (!where) return true;
    if (Array.isArray(where)) {
      return where.some((entry) => this.matchesWhere(row, entry));
    }

    return Object.entries(where).every(([key, value]) => {
      if (this.isNotNullFindOperator(value)) {
        return row[key] !== null && row[key] !== undefined;
      }
      if (this.isInFindOperator(value)) {
        return (value as { _value: unknown[] })._value.includes(row[key]);
      }
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return this.matchesWhere(row[key] || {}, value);
      }
      return row[key] === value;
    });
  }

  private isNotNullFindOperator(value: unknown): boolean {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      (value as { _type?: string; _value?: { _type?: string } })._type ===
        'not' &&
      (value as { _value?: { _type?: string } })._value?._type === 'isNull'
    );
  }

  private isInFindOperator(value: unknown): boolean {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      (value as { _type?: string })._type === 'in' &&
      Array.isArray((value as { _value?: unknown[] })._value)
    );
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

describe('Sprint 23 post-production operations (e2e)', () => {
  let app: INestApplication;
  let operationsService: OperationsService;
  let incidentRepository: MemoryRepository<OperationIncident>;
  let routineRunRepository: MemoryRepository<OperationRoutineRun>;
  let alertRepository: MemoryRepository<OperationalAlert>;
  let onCallConfigRepository: MemoryRepository<OpsOnCallConfig>;
  let journalRepository: MemoryRepository<OperationsJournalEntry>;
  let auditRepository: MemoryRepository<AuditLog>;
  let routineSchedulerService: { runManual: jest.Mock };

  beforeEach(async () => {
    incidentRepository = new MemoryRepository<OperationIncident>();
    routineRunRepository = new MemoryRepository<OperationRoutineRun>();
    alertRepository = new MemoryRepository<OperationalAlert>();
    onCallConfigRepository = new MemoryRepository<OpsOnCallConfig>();
    journalRepository = new MemoryRepository<OperationsJournalEntry>();
    auditRepository = new MemoryRepository<AuditLog>();
    routineSchedulerService = {
      runManual: jest.fn(async (tenantId, dto, actorId) => {
        await operationsService.recordRoutineRun(tenantId, {
          routine: dto.routines?.[0] ?? 'daily',
          status: OperationRoutineRunStatus.PASSED,
          startedAt: '2026-05-08T08:00:00.000Z',
          finishedAt: '2026-05-08T08:01:00.000Z',
          durationMs: 60000,
          metadata: { trigger: 'manual', mode: dto.mode, actorId },
        });
        return {
          trigger: 'manual',
          status: 'PASSED',
          mode: dto.mode ?? 'dry-run',
          routines: dto.routines ?? ['daily'],
          tenantId,
          actorId,
          startedAt: '2026-05-08T08:00:00.000Z',
          finishedAt: '2026-05-08T08:01:00.000Z',
          exitCode: 0,
        };
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OperationsController, AuditController],
      providers: [
        OperationsService,
        AuditService,
        {
          provide: getRepositoryToken(OperationIncident),
          useValue: incidentRepository,
        },
        {
          provide: getRepositoryToken(OperationRoutineRun),
          useValue: routineRunRepository,
        },
        {
          provide: getRepositoryToken(OperationalAlert),
          useValue: alertRepository,
        },
        {
          provide: getRepositoryToken(OpsOnCallConfig),
          useValue: onCallConfigRepository,
        },
        {
          provide: getRepositoryToken(OperationsJournalEntry),
          useValue: journalRepository,
        },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepository },
        OpsOnCallConfigService,
        OpsNotificationService,
        OpsPreActionValidationService,
        {
          provide: OpsRoutineSchedulerService,
          useValue: routineSchedulerService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 9001,
            email: 'ops@sprint23.test',
            tenantId: 'tenant-ops-a',
            role: 'ADMIN',
            permissions: ['operations:read', 'operations:write', 'audit:read'],
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    operationsService = moduleFixture.get(OperationsService);
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('detects, assigns, escalates, resolves, audits and closes an incident', async () => {
    const declared = await request(app.getHttpServer())
      .post('/ops/incidents')
      .send({
        title: 'Publication planning bloquée',
        description: 'Le contrôle post-prod signale une violation bloquante.',
        severity: 'HIGH',
        impactedService: 'planning',
        evidenceUrl: 'https://evidence.sprint23.test/detection',
        evidenceLabel: 'Rapport daily ops',
      })
      .expect(201);

    expect(declared.body).toEqual(
      expect.objectContaining({
        id: 1,
        tenantId: 'tenant-ops-a',
        status: 'DECLARED',
      }),
    );

    await request(app.getHttpServer())
      .patch('/ops/incidents/1/assign')
      .send({ assignedToId: 9010, note: 'Astreinte applicative' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ASSIGNED');
        expect(body.assignedToId).toBe(9010);
      });

    await request(app.getHttpServer())
      .patch('/ops/incidents/1/escalate')
      .send({
        escalatedToId: 9020,
        reason: 'Risque publication refusée',
        evidenceUrl: 'https://evidence.sprint23.test/escalation',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ESCALATED');
        expect(body.escalatedToId).toBe(9020);
      });

    await request(app.getHttpServer())
      .patch('/ops/incidents/1/resolve')
      .send({
        resolutionSummary: 'Réassignation appliquée et validation relancée.',
        evidenceUrl: 'https://evidence.sprint23.test/resolution',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('RESOLVED');
        expect(body.resolvedById).toBe(9001);
      });

    await request(app.getHttpServer())
      .patch('/ops/incidents/1/close')
      .send({
        closureSummary: 'Contrôle post-correction conforme.',
        evidenceUrl: 'https://evidence.sprint23.test/closure',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('CLOSED');
        expect(body.evidence).toHaveLength(4);
        expect(body.timeline.map((entry: any) => entry.action)).toEqual([
          'DECLARE_INCIDENT',
          'ASSIGN_INCIDENT',
          'ESCALATE_INCIDENT',
          'RESOLVE_INCIDENT',
          'CLOSE_INCIDENT',
        ]);
      });

    const incidents = await request(app.getHttpServer())
      .get('/ops/incidents')
      .query({ status: 'CLOSED' })
      .expect(200);
    expect(incidents.body).toHaveLength(1);

    const audit = await request(app.getHttpServer())
      .get('/audit')
      .query({
        entityType: AuditEntityType.OPERATION_INCIDENT,
        entityId: 'operation-incident:1',
      })
      .expect(200);
    expect(audit.body).toHaveLength(5);
    expect(audit.body[0].details.action).toBe('CLOSE_INCIDENT');

    await request(app.getHttpServer())
      .get('/audit/verify')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            tenantId: 'tenant-ops-a',
            total: 5,
            valid: true,
            issues: [],
          }),
        );
      });
  });

  it('supervises anomaly, alert, automatic incident, escalation and resolution', async () => {
    const firstAlert = await operationsService.syncOperationalAlert(
      'tenant-ops-a',
      {
        type: OperationalAlertType.SLO_BREACH,
        source: 'production-readiness.slo',
        reference: 'slo:api:p95',
        checkStatus: 'KO',
        severity: OperationalAlertSeverity.CRITICAL,
        message: 'P95 API au-dessus du seuil post-prod.',
        metadata: { objective: 'api-p95', thresholdMs: 750, observedMs: 1200 },
      },
      9001,
    );

    await operationsService.syncOperationalAlert(
      'tenant-ops-a',
      {
        type: OperationalAlertType.SLO_BREACH,
        source: 'production-readiness.slo',
        reference: 'slo:api:p95',
        checkStatus: 'KO',
        severity: OperationalAlertSeverity.CRITICAL,
        message: 'P95 API toujours au-dessus du seuil post-prod.',
        metadata: { objective: 'api-p95', thresholdMs: 750, observedMs: 1210 },
      },
      9001,
    );

    const alerts = await request(app.getHttpServer())
      .get('/ops/alerts')
      .query({ status: OperationalAlertStatus.OPEN })
      .expect(200);
    expect(alerts.body).toHaveLength(1);
    expect(alerts.body[0]).toEqual(
      expect.objectContaining({
        type: OperationalAlertType.SLO_BREACH,
        occurrenceCount: 2,
      }),
    );

    const automaticIncident = await operationsService.syncAutomaticIncident(
      'tenant-ops-a',
      {
        sourceType: 'ALERT',
        reference: `operational-alert:${firstAlert.alert?.id}`,
        title: 'SLO API post-prod critique',
        description: 'Incident automatique créé depuis une alerte SLO critique.',
        alertSeverity: 'CRITICAL',
        impactedService: 'production-readiness',
        evidenceUrl: 'https://evidence.sprint24.test/slo-api',
        evidenceLabel: 'Rapport SLO',
        metadata: { alertId: firstAlert.alert?.id },
      },
      9001,
    );
    expect(automaticIncident).toEqual(
      expect.objectContaining({ created: true, updated: false }),
    );

    const openIncidents = await request(app.getHttpServer())
      .get('/ops/incidents')
      .query({ status: OperationIncidentStatus.OPEN })
      .expect(200);
    expect(openIncidents.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/ops/escalations/run')
      .send({
        escalationUserId: 9015,
        criticalUnassignedDelayMinutes: 1,
        criticalUnresolvedDelayMinutes: 1,
        now: '2099-05-08T08:00:00.000Z',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.escalatedIncidents).toHaveLength(1);
        expect(body.escalatedAlerts).toHaveLength(1);
        expect(body.escalatedIncidents[0].status).toBe(
          OperationIncidentStatus.ESCALATED,
        );
      });

    const notifications = await request(app.getHttpServer())
      .get('/ops/journal')
      .query({ type: 'NOTIFICATION' })
      .expect(200);
    expect(notifications.body.length).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .patch(`/ops/alerts/${firstAlert.alert?.id}/resolve`)
      .send({ resolutionSummary: 'SLO API revenu sous seuil.' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(OperationalAlertStatus.RESOLVED);
        expect(body.resolvedById).toBe(9001);
      });

    await request(app.getHttpServer())
      .patch(`/ops/incidents/${openIncidents.body[0].id}/resolve`)
      .send({
        resolutionSummary: 'Capacité API restaurée.',
        evidenceUrl: 'https://evidence.sprint24.test/slo-api-resolution',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(OperationIncidentStatus.RESOLVED);
      });

    const alertAudit = await request(app.getHttpServer())
      .get('/audit')
      .query({
        entityType: AuditEntityType.OPERATION_ALERT,
        entityId: `operational-alert:${firstAlert.alert?.id}`,
      })
      .expect(200);
    expect(alertAudit.body.map((entry: any) => entry.details.action)).toEqual(
      expect.arrayContaining([
        'CREATE_OPERATIONAL_ALERT',
        'DEDUP_OPERATIONAL_ALERT',
        'RESOLVE_OPERATIONAL_ALERT',
      ]),
    );
  });

  it('guides exploitation through action center, runbook and pre-action validation', async () => {
    const alertResult = await operationsService.syncOperationalAlert(
      'tenant-ops-a',
      {
        type: OperationalAlertType.BACKUP_STALE,
        source: 'backup.readiness',
        reference: 'backup:HGD-DOUALA:daily',
        checkStatus: 'KO',
        severity: OperationalAlertSeverity.HIGH,
        message: 'Backup quotidien non confirmé.',
        metadata: { dataset: 'tenant-backup', expectedFreshnessHours: 24 },
      },
      9001,
    );

    await operationsService.syncAutomaticIncident(
      'tenant-ops-a',
      {
        sourceType: 'ALERT',
        reference: `operational-alert:${alertResult.alert?.id}`,
        title: 'Backup préproduction en retard',
        description: 'Incident automatique issu du contrôle backup.',
        alertSeverity: 'HIGH',
        impactedService: 'backup',
        metadata: { alertId: alertResult.alert?.id },
      },
      9001,
    );

    const actionCenter = await request(app.getHttpServer())
      .get('/ops/action-center')
      .query({ limit: 10 })
      .expect(200);
    expect(actionCenter.body).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-ops-a',
        total: expect.any(Number),
      }),
    );
    expect(actionCenter.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'OPERATIONAL_ALERT',
          priority: 'HIGH',
          sourceReference: expect.objectContaining({
            reference: expect.stringContaining('backup:HGD-DOUALA:daily'),
          }),
        }),
        expect.objectContaining({
          type: 'AUTO_INCIDENT',
          requiredEvidence: expect.arrayContaining([expect.any(String)]),
        }),
      ]),
    );

    const runbook = await request(app.getHttpServer())
      .get(`/ops/alerts/${alertResult.alert?.id}/runbook`)
      .expect(200);
    expect(runbook.body).toEqual(
      expect.objectContaining({
        reference: expect.objectContaining({
          sourceType: 'ALERT',
          id: alertResult.alert?.id,
        }),
        next: expect.objectContaining({
          priority: 'HIGH',
          waitingOn: expect.arrayContaining(['owner', 'evidence']),
        }),
      }),
    );
    expect(runbook.body.steps.length).toBeGreaterThanOrEqual(3);
    expect(runbook.body.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'resolve-alert',
          requiredPermission: 'operations:write',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/ops/alerts/${alertResult.alert?.id}/resolve`)
      .send({ resolutionSummary: '' })
      .expect(400)
      .expect(({ body }) => {
        expect(JSON.stringify(body)).toContain('Missing required evidence');
      });

    await request(app.getHttpServer())
      .patch(`/ops/alerts/${alertResult.alert?.id}/resolve`)
      .send({ resolutionSummary: 'Backup relancé et preuve jointe au journal.' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(OperationalAlertStatus.RESOLVED);
      });
  });

  it('industrializes ops with routine run history, observability and manual scheduler', async () => {
    await request(app.getHttpServer())
      .post('/ops/on-call-configs')
      .send({
        role: 'OPS',
        recipients: ['ops-l1@mediplan.test'],
        priority: 1,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            tenantId: 'tenant-ops-a',
            role: 'OPS',
            recipients: ['ops-l1@mediplan.test'],
          }),
        );
      });

    await operationsService.recordRoutineRun('tenant-ops-a', {
      routine: 'backup',
      status: OperationRoutineRunStatus.FAILED,
      startedAt: '2026-05-08T07:00:00.000Z',
      finishedAt: '2026-05-08T07:01:00.000Z',
      error: 'Backup stale during drill',
      metadata: { trigger: 'scheduled' },
    });

    await operationsService.syncOperationalAlert(
      'tenant-ops-a',
      {
        type: OperationalAlertType.BACKUP_STALE,
        source: 'ops.resilience-drill',
        reference: 'drill:backup-stale',
        checkStatus: 'KO',
        severity: OperationalAlertSeverity.CRITICAL,
        message: 'Drill backup stale détecté.',
        metadata: { drill: true },
      },
      9001,
    );

    await request(app.getHttpServer())
      .post('/ops/routines/run')
      .send({ routines: ['daily'], mode: 'dry-run', date: '2026-05-08' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            trigger: 'manual',
            status: 'PASSED',
            tenantId: 'tenant-ops-a',
          }),
        );
      });

    const runs = await request(app.getHttpServer())
      .get('/ops/routine-runs')
      .expect(200);
    expect(runs.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routine: 'backup',
          status: OperationRoutineRunStatus.FAILED,
        }),
        expect.objectContaining({
          routine: 'daily',
          status: OperationRoutineRunStatus.PASSED,
        }),
      ]),
    );

    await request(app.getHttpServer())
      .get(`/ops/routine-runs/${runs.body[0].id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/ops/observability')
      .query({
        from: '2026-05-08T00:00:00.000Z',
        to: '2026-05-09T00:00:00.000Z',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.routines.failed).toBeGreaterThanOrEqual(1);
        expect(body.alerts.openBySeverity.CRITICAL).toBeGreaterThanOrEqual(1);
        expect(body.actionCenter.total).toBeGreaterThanOrEqual(1);
      });
  });
});
