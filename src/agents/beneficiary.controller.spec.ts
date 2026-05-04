import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { BeneficiaryController } from './beneficiary.controller';
import { BeneficiaryService } from './beneficiary.service';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['agents:read', 'agents:write'],
    ...overrides,
  },
});

describe('BeneficiaryController', () => {
  let controller: BeneficiaryController;
  let beneficiaryService: jest.Mocked<
    Pick<BeneficiaryService, 'findAll' | 'create' | 'update' | 'remove'>
  >;

  beforeEach(() => {
    beneficiaryService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new BeneficiaryController(
      beneficiaryService as unknown as BeneficiaryService,
    );
  });

  it('keeps read/write permissions on sensitive beneficiary endpoints', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BeneficiaryController.prototype.findAllByAgent,
      ),
    ).toEqual(['agents:read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BeneficiaryController.prototype.create,
      ),
    ).toEqual(['agents:write']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BeneficiaryController.prototype.update,
      ),
    ).toEqual(['agents:write']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        BeneficiaryController.prototype.remove,
      ),
    ).toEqual(['agents:write']);
  });

  it('ignores tenantId query parameters for non-super-admin users', () => {
    controller.findAllByAgent(createRequest(), 12, 'tenant-b');
    controller.create(createRequest(), { name: 'Child' } as any, 'tenant-b');
    controller.update(
      createRequest(),
      5,
      { name: 'Updated' } as any,
      'tenant-b',
    );
    controller.remove(createRequest(), 5, 'tenant-b');

    expect(beneficiaryService.findAll).toHaveBeenCalledWith('tenant-a', 12);
    expect(beneficiaryService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Object),
    );
    expect(beneficiaryService.update).toHaveBeenCalledWith(
      'tenant-a',
      5,
      expect.any(Object),
    );
    expect(beneficiaryService.remove).toHaveBeenCalledWith('tenant-a', 5);
  });

  it('allows SUPER_ADMIN users to explicitly target another tenant', () => {
    controller.findAllByAgent(
      createRequest({ role: 'SUPER_ADMIN' }),
      12,
      'tenant-b',
    );

    expect(beneficiaryService.findAll).toHaveBeenCalledWith('tenant-b', 12);
  });
});
