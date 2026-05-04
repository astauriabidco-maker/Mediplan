import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuditController } from '../src/audit/audit.controller';
import { AuditService } from '../src/audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../src/audit/entities/audit-log.entity';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';

const userByScenario: Record<string, any> = {
  admin: {
    id: 42,
    email: 'admin@tenant-a.test',
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['audit:read'],
  },
  superadmin: {
    id: 1,
    email: 'root@example.test',
    tenantId: 'root',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
  },
};

describe('Audit tenant isolation (e2e)', () => {
  let app: INestApplication;
  const auditService = {
    getLogs: jest.fn(async (tenantId, filters) => [
      { id: 1, tenantId, filters },
    ]),
    verifyChain: jest.fn(async (tenantId) => ({
      tenantId,
      valid: true,
      issues: [],
    })),
    exportLogs: jest.fn(async (tenantId, filters) => ({
      tenantId,
      filters,
      logs: [],
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
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

  it('ignores tenantId query parameters for regular admins', async () => {
    await request(app.getHttpServer())
      .get('/audit?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(auditService.getLogs).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Object),
    );
  });

  it('allows super admins to inspect an explicit tenant', async () => {
    await request(app.getHttpServer())
      .get('/audit?tenantId=tenant-b')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(auditService.getLogs).toHaveBeenCalledWith(
      'tenant-b',
      expect.any(Object),
    );
  });

  it('passes audit filters to the service', async () => {
    await request(app.getHttpServer())
      .get('/audit')
      .query({
        actorId: '7',
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.AGENT,
        entityId: '12',
        limit: '20',
      })
      .set('x-test-user', 'admin')
      .expect(200);

    expect(auditService.getLogs).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        actorId: 7,
        action: AuditAction.UPDATE,
        entityType: AuditEntityType.AGENT,
        entityId: '12',
        limit: 20,
      }),
    );
  });

  it('verifies the authenticated tenant chain for regular admins', async () => {
    await request(app.getHttpServer())
      .get('/audit/verify?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(auditService.verifyChain).toHaveBeenCalledWith('tenant-a');
  });

  it('exports audit logs with period, tenant and action filters for super admins', async () => {
    await request(app.getHttpServer())
      .get('/audit/export')
      .query({
        tenantId: 'tenant-b',
        action: AuditAction.DELETE,
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-02-28T23:59:59.000Z',
        limit: '50',
      })
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(auditService.exportLogs).toHaveBeenCalledWith(
      'tenant-b',
      expect.objectContaining({
        action: AuditAction.DELETE,
        from: new Date('2026-02-01T00:00:00.000Z'),
        to: new Date('2026-02-28T23:59:59.000Z'),
        limit: 50,
      }),
    );
  });
});
