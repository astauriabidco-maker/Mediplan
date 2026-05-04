import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { HospitalServicesController } from '../src/agents/hospital-services.controller';
import { HospitalServicesService } from '../src/agents/hospital-services.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';

const userByScenario: Record<string, any> = {
  admin: {
    id: 42,
    email: 'admin@tenant-a.test',
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['services:read', 'services:write'],
  },
  superadmin: {
    id: 1,
    email: 'root@example.test',
    tenantId: 'root',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
  },
};

describe('Hospital services tenant isolation (e2e)', () => {
  let app: INestApplication;
  const servicesService = {
    findAll: jest.fn(async (tenantId) => [{ id: 1, tenantId }]),
    getStats: jest.fn(),
    getServiceTree: jest.fn(),
    findOne: jest.fn(),
    getServiceHierarchy: jest.fn(),
    create: jest.fn(async (tenantId, data) => ({ id: 100, tenantId, ...data })),
    createSubService: jest.fn(),
    update: jest.fn(),
    assignResponsible: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HospitalServicesController],
      providers: [
        { provide: HospitalServicesService, useValue: servicesService },
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

  it('ignores tenantId query parameters for regular admins', async () => {
    await request(app.getHttpServer())
      .get('/hospital-services?tenantId=tenant-b')
      .set('x-test-user', 'admin')
      .expect(200);

    expect(servicesService.findAll).toHaveBeenCalledWith('tenant-a');
  });

  it('allows super admins to inspect an explicit tenant', async () => {
    await request(app.getHttpServer())
      .get('/hospital-services?tenantId=tenant-b')
      .set('x-test-user', 'superadmin')
      .expect(200);

    expect(servicesService.findAll).toHaveBeenCalledWith('tenant-b');
  });

  it('rejects client-supplied tenantId when creating services', async () => {
    await request(app.getHttpServer())
      .post('/hospital-services')
      .set('x-test-user', 'admin')
      .send({
        tenantId: 'tenant-b',
        name: 'Urgences',
        code: 'URG',
      })
      .expect(400);

    expect(servicesService.create).not.toHaveBeenCalled();
  });

  it('creates services in the authenticated tenant when payload is valid', async () => {
    await request(app.getHttpServer())
      .post('/hospital-services')
      .set('x-test-user', 'admin')
      .send({
        name: 'Urgences',
        code: 'URG',
      })
      .expect(201);

    expect(servicesService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({ name: 'Urgences', code: 'URG' }),
      42,
    );
  });
});
