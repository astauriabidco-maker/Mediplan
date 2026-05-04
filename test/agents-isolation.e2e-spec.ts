import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AgentsController } from '../src/agents/agents.controller';
import { AgentsService } from '../src/agents/agents.service';
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

describe('Agents tenant isolation (e2e)', () => {
  let app: INestApplication;
  const agentsService = {
    create: jest.fn(async (data) => ({ id: 100, ...data })),
    findAll: jest.fn(async (tenantId) => [{ id: 1, tenantId }]),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getMyTeam: jest.fn(),
    getHealthRecords: jest.fn(),
    addHealthRecord: jest.fn(),
    deleteHealthRecord: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: agentsService }],
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

  it('ignores tenantId query parameters for regular admins', async () => {
    await request(app.getHttpServer())
      .get('/agents?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-a');
  });

  it('allows super admins to inspect an explicit tenant', async () => {
    await request(app.getHttpServer())
      .get('/agents?tenantId=tenant-b')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-b');
  });

  it('rejects client-supplied tenantId when creating agents', async () => {
    await request(app.getHttpServer())
      .post('/agents')
      .set('x-test-user', 'admin')
      .send({
        tenantId: 'tenant-b',
        nom: 'Agent',
        email: 'agent@example.test',
        matricule: 'MAT-001',
        telephone: '+33612345678',
      })
      .expect(400);

    expect(agentsService.create).not.toHaveBeenCalled();
  });

  it('creates agents in the authenticated tenant when payload is valid', async () => {
    await request(app.getHttpServer())
      .post('/agents')
      .set('x-test-user', 'admin')
      .send({
        nom: 'Agent',
        email: 'agent@example.test',
        matricule: 'MAT-001',
        telephone: '+33612345678',
      })
      .expect(201);

    expect(agentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a' }),
      42,
    );
  });
});
