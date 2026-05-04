import { HospitalServicesController } from './hospital-services.controller';
import { HospitalServicesService } from './hospital-services.service';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['services:read', 'services:write'],
    ...overrides,
  },
});

describe('HospitalServicesController', () => {
  let controller: HospitalServicesController;
  let servicesService: jest.Mocked<Pick<HospitalServicesService, 'findAll' | 'getStats' | 'getServiceTree' | 'findOne' | 'create' | 'createSubService' | 'update' | 'assignResponsible' | 'remove'>>;

  beforeEach(() => {
    servicesService = {
      findAll: jest.fn(),
      getStats: jest.fn(),
      getServiceTree: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createSubService: jest.fn(),
      update: jest.fn(),
      assignResponsible: jest.fn(),
      remove: jest.fn(),
    };

    controller = new HospitalServicesController(servicesService as unknown as HospitalServicesService);
  });

  it('ignores tenantId query parameters for non-super-admin users', () => {
    controller.findAll(createRequest(), 'tenant-b');

    expect(servicesService.findAll).toHaveBeenCalledWith('tenant-a');
  });

  it('allows SUPER_ADMIN users to explicitly inspect another tenant', () => {
    controller.findAll(createRequest({ role: 'SUPER_ADMIN' }), 'tenant-b');

    expect(servicesService.findAll).toHaveBeenCalledWith('tenant-b');
  });

  it('forces tenant and actor identity for service creation', () => {
    controller.create(createRequest(), {
      name: 'Urgences',
      code: 'URG',
    });

    expect(servicesService.create).toHaveBeenCalledWith(
      'tenant-a',
      { name: 'Urgences', code: 'URG' },
      42,
    );
  });

  it('passes actor identity to updates, responsible assignment, and removal', async () => {
    const req = createRequest({ id: 51 });

    controller.update(req, 10, { name: 'Updated' });
    controller.assignResponsible(req, 10, { role: 'chief', agentId: 9 });
    await controller.remove(req, 10);

    expect(servicesService.update).toHaveBeenCalledWith('tenant-a', 10, { name: 'Updated' }, 51);
    expect(servicesService.assignResponsible).toHaveBeenCalledWith('tenant-a', 10, 'chief', 9, 51);
    expect(servicesService.remove).toHaveBeenCalledWith('tenant-a', 10, 51);
  });
});
