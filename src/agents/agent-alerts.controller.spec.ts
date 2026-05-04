import { AgentAlertsController } from './agent-alerts.controller';
import { AgentAlertsService } from './agent-alerts.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AlertSeverity, AlertType } from './entities/agent-alert.entity';

type RequestOverrides = Partial<AuthenticatedRequest['user']>;
type AlertFilterInput = {
  agentId?: string;
  type?: string;
  severity?: string;
  isResolved?: string;
};
type AgentAlertsServiceMock = jest.Mocked<
  Pick<
    AgentAlertsService,
    'findAll' | 'findOne' | 'acknowledge' | 'resolve' | 'validateFilters'
  >
>;

const createRequest = (overrides: RequestOverrides = {}) =>
  ({
    user: {
      id: 42,
      userId: 42,
      sub: 42,
      email: 'admin@tenant-a.test',
      tenantId: 'tenant-a',
      tenant: 'tenant-a',
      role: 'ADMIN',
      permissions: ['agents:read', 'agents:write'],
      ...overrides,
    },
  }) as AuthenticatedRequest;

const createAgentAlertsServiceMock = (): AgentAlertsServiceMock => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  acknowledge: jest.fn(),
  resolve: jest.fn(),
  validateFilters: jest.fn((filters: AlertFilterInput) => ({
    agentId: filters.agentId ? Number(filters.agentId) : undefined,
    type: filters.type as AlertType | undefined,
    severity: filters.severity as AlertSeverity | undefined,
    isResolved:
      filters.isResolved === undefined
        ? undefined
        : filters.isResolved === 'true',
  })),
});

describe('AgentAlertsController', () => {
  let controller: AgentAlertsController;
  let agentAlertsService: AgentAlertsServiceMock;

  beforeEach(() => {
    agentAlertsService = createAgentAlertsServiceMock();

    controller = new AgentAlertsController(
      agentAlertsService as unknown as AgentAlertsService,
    );
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    const req = createRequest({ role: 'ADMIN' });

    await controller.findAll(
      req,
      'tenant-b',
      '12',
      AlertType.COMPLIANCE,
      AlertSeverity.HIGH,
      'false',
    );

    expect(agentAlertsService.findAll).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        agentId: 12,
        type: AlertType.COMPLIANCE,
        severity: AlertSeverity.HIGH,
        isResolved: false,
      }),
    );
  });

  it('allows SUPER_ADMIN users to explicitly inspect another tenant', async () => {
    const req = createRequest({ role: 'SUPER_ADMIN' });

    await controller.findAll(req, 'tenant-b');

    expect(agentAlertsService.findAll).toHaveBeenCalledWith(
      'tenant-b',
      expect.any(Object),
    );
  });

  it('uses tenant isolation for detail reads', async () => {
    const req = createRequest();

    await controller.findOne(req, 7, 'tenant-b');

    expect(agentAlertsService.findOne).toHaveBeenCalledWith('tenant-a', 7);
  });

  it('passes actor id to alert mutations', async () => {
    const req = createRequest({ id: 51 });

    await controller.acknowledge(req, 7, 'tenant-b');
    await controller.resolve(req, 8, 'Resolved', 'tenant-b');

    expect(agentAlertsService.acknowledge).toHaveBeenCalledWith(
      'tenant-a',
      7,
      51,
    );
    expect(agentAlertsService.resolve).toHaveBeenCalledWith(
      'tenant-a',
      8,
      51,
      'Resolved',
    );
  });
});
