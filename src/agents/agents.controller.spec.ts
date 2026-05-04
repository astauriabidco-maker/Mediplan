import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['agents:read', 'agents:write'],
    ...overrides,
  },
});

describe('AgentsController', () => {
  let controller: AgentsController;
  let agentsService: jest.Mocked<Pick<AgentsService, 'create' | 'findAll' | 'findOne' | 'update' | 'remove'>>;

  beforeEach(() => {
    agentsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new AgentsController(agentsService as unknown as AgentsService);
  });

  it('forces tenantId from the authenticated user when creating an agent', () => {
    const req = createRequest();
    const body = {
      tenantId: 'evil-tenant',
      nom: 'Agent',
      email: 'agent@example.test',
      matricule: 'MAT-001',
      telephone: '+33612345678',
    } as any;

    controller.create(req, body);

    expect(agentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        email: 'agent@example.test',
      }),
      42,
    );
  });

  it('ignores tenantId query parameters for non-super-admin users', () => {
    const req = createRequest({ role: 'ADMIN' });

    controller.findAll(req, 'tenant-b');

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-a');
  });

  it('allows SUPER_ADMIN users to explicitly inspect another tenant', () => {
    const req = createRequest({ role: 'SUPER_ADMIN' });

    controller.findAll(req, 'tenant-b');

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-b');
  });

  it('passes authenticated actor id to sensitive read and write operations', () => {
    const req = createRequest({ id: 51 });

    controller.findOne(req, '10');
    controller.update(req, '10', { nom: 'Updated' }, undefined);
    controller.remove(req, '10');

    expect(agentsService.findOne).toHaveBeenCalledWith(10, 'tenant-a', 51);
    expect(agentsService.update).toHaveBeenCalledWith(10, { nom: 'Updated' }, 'tenant-a', 51);
    expect(agentsService.remove).toHaveBeenCalledWith(10, 'tenant-a', 51);
  });
});
