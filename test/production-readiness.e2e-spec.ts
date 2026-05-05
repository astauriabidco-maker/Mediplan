import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { ProductionGate } from '../src/production-readiness/entities/production-gate.entity';
import { ProductionSignoff } from '../src/production-readiness/entities/production-signoff.entity';
import { ProductionReadinessController } from '../src/production-readiness/production-readiness.controller';
import { ProductionReadinessService } from '../src/production-readiness/production-readiness.service';

const tenantId = 'tenant-sprint22-readiness';
const requiredSignoffs = [
  'HR',
  'SECURITY',
  'OPERATIONS',
  'TECHNICAL',
  'DIRECTION',
] as const;
const requiredGates = [
  'MIGRATION',
  'SEED',
  'SMOKE',
  'COMPLIANCE',
  'AUDIT',
  'BACKUP',
] as const;

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
    if (!data.timestamp) data.timestamp = new Date();
    const now = new Date();
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
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return this.matchesWhere(row[key] || {}, value);
      }
      if (value instanceof Date && row[key] instanceof Date) {
        return row[key].getTime() === value.getTime();
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

describe('Sprint 22 Phase 6 production readiness (e2e)', () => {
  let app: INestApplication;
  let signoffRepository: MemoryRepository<ProductionSignoff>;
  let gateRepository: MemoryRepository<ProductionGate>;
  let auditRepository: MemoryRepository<AuditLog>;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    delete process.env.PROD_FREEZE_STATUS;
    for (const gate of requiredGates) {
      delete process.env[`PROD_GATE_${gate}`];
    }

    signoffRepository = new MemoryRepository<ProductionSignoff>();
    gateRepository = new MemoryRepository<ProductionGate>();
    auditRepository = new MemoryRepository<AuditLog>();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductionReadinessController, AuditController],
      providers: [
        ProductionReadinessService,
        AuditService,
        {
          provide: getRepositoryToken(ProductionSignoff),
          useValue: signoffRepository,
        },
        {
          provide: getRepositoryToken(ProductionGate),
          useValue: gateRepository,
        },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepository },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 9001,
            email: 'release@sprint22.test',
            tenantId,
            role: 'ADMIN',
            permissions: ['release:read', 'release:write', 'audit:read'],
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await app?.close();
  });

  it('moves from blocked decision to PROD_READY and exposes signoff audits', async () => {
    const blockedDecision = await request(app.getHttpServer())
      .get('/production-readiness/decision')
      .expect(200);

    expect(blockedDecision.body.status).toBe('PROD_NO_GO');
    expect(blockedDecision.body.blockers).toEqual(
      expect.arrayContaining([
        'Missing SECURITY signoff',
        'FREEZE gate is UNKNOWN',
        'SMOKE gate is UNKNOWN',
      ]),
    );

    for (const signoffKey of requiredSignoffs) {
      await request(app.getHttpServer())
        .patch(`/production-readiness/signoffs/${signoffKey}`)
        .send({
          status: 'GO',
          signerName: `${signoffKey} responsable`,
          signerRole: 'Release approver',
          proofUrl: `https://evidence.sprint22.test/${signoffKey.toLowerCase()}`,
          proofLabel: `Preuve ${signoffKey}`,
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({
              key: signoffKey,
              status: 'GO',
              signedById: 9001,
              proofUrl: `https://evidence.sprint22.test/${signoffKey.toLowerCase()}`,
            }),
          );
        });
    }

    await request(app.getHttpServer())
      .patch('/production-readiness/gates/FREEZE')
      .send({
        status: 'PASSED',
        source: 'freeze-decision',
        evidenceUrl: 'https://evidence.sprint22.test/freeze',
      })
      .expect(200);
    for (const gate of requiredGates) {
      await request(app.getHttpServer())
        .patch(`/production-readiness/gates/${gate}`)
        .send({
          status: 'PASSED',
          source: 'release-control',
          evidenceUrl: `https://evidence.sprint22.test/${gate.toLowerCase()}`,
        })
        .expect(200);
    }

    const readyDecision = await request(app.getHttpServer())
      .get('/production-readiness/decision')
      .expect(200);

    expect(readyDecision.body).toEqual(
      expect.objectContaining({
        tenantId,
        status: 'PROD_READY',
        blockers: [],
      }),
    );
    expect(readyDecision.body.signoffSummary).toEqual(
      expect.objectContaining({
        missing: [],
        pending: [],
        noGo: [],
        proofMissing: [],
      }),
    );
    expect(readyDecision.body.gates.checks).toHaveLength(requiredGates.length);
    expect(
      readyDecision.body.gates.checks.every(
        (gate: { status: string }) => gate.status === 'PASSED',
      ),
    ).toBe(true);

    const securityAudit = await request(app.getHttpServer())
      .get('/audit')
      .query({
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PLANNING,
        entityId: 'production-signoff:SECURITY',
      })
      .expect(200);

    expect(securityAudit.body).toHaveLength(1);
    expect(securityAudit.body[0]).toEqual(
      expect.objectContaining({
        tenantId,
        actorId: 9001,
        action: AuditAction.CREATE,
        entityType: AuditEntityType.PLANNING,
        entityId: 'production-signoff:SECURITY',
        details: expect.objectContaining({
          action: 'CREATE_PRODUCTION_SIGNOFF',
          signoffKey: 'SECURITY',
          after: expect.objectContaining({
            status: 'GO',
            proofUrl: 'https://evidence.sprint22.test/security',
          }),
        }),
      }),
    );

    await request(app.getHttpServer())
      .get('/audit/verify')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            tenantId,
            total: requiredSignoffs.length + requiredGates.length + 1,
            valid: true,
            issues: [],
          }),
        );
      });
    expect(auditRepository.all()).toHaveLength(
      requiredSignoffs.length + requiredGates.length + 1,
    );
  });
});
