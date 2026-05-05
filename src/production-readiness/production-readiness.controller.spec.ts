import { ProductionReadinessController } from './production-readiness.controller';
import {
  ProductionSignoffKey,
  ProductionSignoffStatus,
} from './entities/production-signoff.entity';
import {
  ProductionGateKey,
  ProductionGateStatus,
} from './entities/production-gate.entity';
import { ProductionReadinessService } from './production-readiness.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

type RequestOverrides = Partial<AuthenticatedRequest['user']>;
type ProductionReadinessServiceMock = jest.Mocked<
  Pick<
    ProductionReadinessService,
    | 'findSignoffs'
    | 'upsertSignoff'
    | 'findGates'
    | 'upsertGate'
    | 'getDecision'
    | 'getSignoffHistory'
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
      permissions: ['release:read', 'release:write'],
      ...overrides,
    },
  }) as AuthenticatedRequest;

const createServiceMock = (): ProductionReadinessServiceMock => ({
  findSignoffs: jest.fn(),
  upsertSignoff: jest.fn(),
  findGates: jest.fn(),
  upsertGate: jest.fn(),
  getDecision: jest.fn(),
  getSignoffHistory: jest.fn(),
});

describe('ProductionReadinessController', () => {
  let controller: ProductionReadinessController;
  let productionReadinessService: ProductionReadinessServiceMock;

  beforeEach(() => {
    productionReadinessService = createServiceMock();
    controller = new ProductionReadinessController(
      productionReadinessService as unknown as ProductionReadinessService,
    );
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    const req = createRequest({ role: 'ADMIN' });

    await controller.findSignoffs(req, 'tenant-b');
    await controller.findGates(req, 'tenant-b');
    await controller.getDecision(req, 'tenant-b');
    await controller.getSignoffHistory(req, 'tenant-b');

    expect(productionReadinessService.findSignoffs).toHaveBeenCalledWith(
      'tenant-a',
    );
    expect(productionReadinessService.getDecision).toHaveBeenCalledWith(
      'tenant-a',
    );
    expect(productionReadinessService.findGates).toHaveBeenCalledWith(
      'tenant-a',
    );
    expect(productionReadinessService.getSignoffHistory).toHaveBeenCalledWith(
      'tenant-a',
    );
  });

  it('allows SUPER_ADMIN users to inspect another tenant', async () => {
    const req = createRequest({ role: 'SUPER_ADMIN' });

    await controller.findSignoffs(req, 'tenant-b');

    expect(productionReadinessService.findSignoffs).toHaveBeenCalledWith(
      'tenant-b',
    );
  });

  it('passes actor id and resolved tenant to signoff mutations', async () => {
    const req = createRequest({ id: 77 });
    const dto = {
      status: ProductionSignoffStatus.NO_GO,
      signerName: 'Direction',
      comment: 'Preuves manquantes',
    };

    await controller.upsertSignoff(
      req,
      { key: ProductionSignoffKey.DIRECTION },
      dto,
      'tenant-b',
    );

    expect(productionReadinessService.upsertSignoff).toHaveBeenCalledWith(
      'tenant-a',
      ProductionSignoffKey.DIRECTION,
      dto,
      77,
    );
  });

  it('passes actor id and resolved tenant to gate mutations', async () => {
    const req = createRequest({ id: 77 });
    const dto = {
      status: ProductionGateStatus.PASSED,
      source: 'CI',
      snapshot: { runId: 123 },
    };

    await controller.upsertGate(
      req,
      { key: ProductionGateKey.SMOKE },
      dto,
      'tenant-b',
    );

    expect(productionReadinessService.upsertGate).toHaveBeenCalledWith(
      'tenant-a',
      ProductionGateKey.SMOKE,
      dto,
      77,
    );
  });
});
