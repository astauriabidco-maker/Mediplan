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
  let agentsService: jest.Mocked<Pick<AgentsService, 'create' | 'findAll' | 'findOne' | 'update' | 'remove' | 'getMyTeam'>>;

  beforeEach(() => {
    agentsService = {
      create: jest.fn(async (agent: any) => ({ id: 1, ...agent })),
      findAll: jest.fn(async () => []),
      findOne: jest.fn(async (id: number) => ({ id, nom: 'Agent', tenantId: 'tenant-a' }) as any),
      update: jest.fn(async (id: number, agent: any) => ({ id, ...agent })),
      remove: jest.fn(async (id: number) => ({ id, status: 'DISABLED' }) as any),
      getMyTeam: jest.fn(async () => []),
    };

    controller = new AgentsController(agentsService as unknown as AgentsService);
  });

  it('forces tenantId from the authenticated user when creating an agent', async () => {
    const req = createRequest();
    const body = {
      tenantId: 'evil-tenant',
      nom: 'Agent',
      email: 'agent@example.test',
      matricule: 'MAT-001',
      telephone: '+33612345678',
    } as any;

    await controller.create(req, body);

    expect(agentsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        email: 'agent@example.test',
      }),
      42,
    );
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    const req = createRequest({ role: 'ADMIN' });

    await controller.findAll(req, 'tenant-b');

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-a');
  });

  it('allows SUPER_ADMIN users to explicitly inspect another tenant', async () => {
    const req = createRequest({ role: 'SUPER_ADMIN' });

    await controller.findAll(req, 'tenant-b');

    expect(agentsService.findAll).toHaveBeenCalledWith('tenant-b');
  });

  it('passes authenticated actor id to sensitive read and write operations', async () => {
    const req = createRequest({ id: 51 });

    await controller.findOne(req, '10');
    await controller.update(req, '10', { nom: 'Updated' }, undefined);
    await controller.remove(req, '10');

    expect(agentsService.findOne).toHaveBeenCalledWith(10, 'tenant-a', 51);
    expect(agentsService.update).toHaveBeenCalledWith(10, { nom: 'Updated' }, 'tenant-a', 51);
    expect(agentsService.remove).toHaveBeenCalledWith(10, 'tenant-a', 51);
  });

  it('masks sensitive HR fields for manager reads of another agent', async () => {
    const req = createRequest({ id: 51, role: 'MANAGER' });
    agentsService.findAll.mockResolvedValueOnce([
      {
        id: 10,
        nom: 'Agent Ten',
        email: 'work@example.test',
        tenantId: 'tenant-a',
        nir: '1880123456789',
        birthName: 'Private Birth Name',
        personalEmail: 'private@example.test',
        mobileMoneyNumber: '+237699111222',
        contracts: [{ id: 1, baseSalary: 50000 }],
      } as any,
    ]);

    const result = await controller.findAll(req);

    expect(result[0]).toEqual(expect.objectContaining({
      id: 10,
      email: 'work@example.test',
      nir: null,
      birthName: null,
      personalEmail: null,
      mobileMoneyNumber: null,
      contracts: null,
    }));
  });

  it('keeps sensitive HR fields visible to admins', async () => {
    const req = createRequest({ id: 51, role: 'ADMIN' });
    agentsService.findOne.mockResolvedValueOnce({
      id: 10,
      nom: 'Agent Ten',
      tenantId: 'tenant-a',
      nir: '1880123456789',
      personalEmail: 'private@example.test',
    } as any);

    const result = await controller.findOne(req, '10');

    expect(result).toEqual(expect.objectContaining({
      nir: '1880123456789',
      personalEmail: 'private@example.test',
    }));
  });
});
