import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AgentAlertsController } from '../src/agents/agent-alerts.controller';
import { AgentAlertsService } from '../src/agents/agent-alerts.service';
import {
  AlertSeverity,
  AlertType,
} from '../src/agents/entities/agent-alert.entity';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';

const userByScenario: Record<string, any> = {
  admin: {
    id: 42,
    userId: 42,
    sub: 42,
    email: 'admin@tenant-a.test',
    tenantId: 'tenant-a',
    tenant: 'tenant-a',
    role: 'ADMIN',
    permissions: ['agents:read', 'agents:write'],
  },
  superadmin: {
    id: 1,
    userId: 1,
    sub: 1,
    email: 'root@example.test',
    tenantId: 'root',
    tenant: 'root',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
  },
};

describe('Agent alerts tenant isolation (e2e)', () => {
  let app: INestApplication;
  const agentAlertsService = {
    validateFilters: jest.fn((filters) => ({
      agentId: filters.agentId ? Number(filters.agentId) : undefined,
      type: filters.type,
      severity: filters.severity,
      isResolved:
        filters.isResolved === undefined
          ? undefined
          : filters.isResolved === 'true',
    })),
    findAll: jest.fn(async (tenantId, filters) => [
      { id: 1, tenantId, ...filters },
    ]),
    findOne: jest.fn(async (tenantId, id) => ({ id, tenantId })),
    acknowledge: jest.fn(async (tenantId, id, actorId) => ({
      id,
      tenantId,
      actorId,
      isAcknowledged: true,
    })),
    resolve: jest.fn(async (tenantId, id, actorId, reason) => ({
      id,
      tenantId,
      actorId,
      isResolved: true,
      resolutionReason: reason,
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AgentAlertsController],
      providers: [
        { provide: AgentAlertsService, useValue: agentAlertsService },
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

  it('ignores tenantId query parameters for regular admins when listing alerts', async () => {
    await request(app.getHttpServer())
      .get(
        '/agent-alerts?tenantId=tenant-b&agentId=12&type=COMPLIANCE&severity=HIGH&isResolved=false',
      )
      .set('x-test-user', 'admin')
      .expect(200);

    expect(agentAlertsService.findAll).toHaveBeenCalledWith('tenant-a', {
      agentId: 12,
      type: AlertType.COMPLIANCE,
      severity: AlertSeverity.HIGH,
      isResolved: false,
    });
  });

  it('allows super admins to inspect an explicit tenant', async () => {
    await request(app.getHttpServer())
      .get('/agent-alerts?tenantId=tenant-b')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(agentAlertsService.findAll).toHaveBeenCalledWith(
      'tenant-b',
      expect.any(Object),
    );
  });

  it('uses authenticated tenant on detail reads and mutations', async () => {
    await request(app.getHttpServer())
      .get('/agent-alerts/7?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    await request(app.getHttpServer())
      .patch('/agent-alerts/7/acknowledge?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    await request(app.getHttpServer())
      .patch('/agent-alerts/8/resolve?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .send({ reason: 'Situation régularisée' })
      .expect(200);

    expect(agentAlertsService.findOne).toHaveBeenCalledWith('tenant-a', 7);
    expect(agentAlertsService.acknowledge).toHaveBeenCalledWith(
      'tenant-a',
      7,
      42,
    );
    expect(agentAlertsService.resolve).toHaveBeenCalledWith(
      'tenant-a',
      8,
      42,
      'Situation régularisée',
    );
  });
});
