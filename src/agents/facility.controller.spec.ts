import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { FacilityController } from './facility.controller';
import { FacilityService } from './facility.service';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['services:read', 'services:write'],
    ...overrides,
  },
});

describe('FacilityController', () => {
  let controller: FacilityController;
  let facilityService: jest.Mocked<
    Pick<FacilityService, 'findAll' | 'create' | 'update' | 'remove'>
  >;

  beforeEach(() => {
    facilityService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new FacilityController(
      facilityService as unknown as FacilityService,
    );
  });

  it('keeps service read/write permissions on facility endpoints', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        FacilityController.prototype.findAll,
      ),
    ).toEqual(['services:read']);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, FacilityController.prototype.create),
    ).toEqual(['services:write']);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, FacilityController.prototype.update),
    ).toEqual(['services:write']);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, FacilityController.prototype.remove),
    ).toEqual(['services:write']);
  });

  it('ignores tenantId query parameters for non-super-admin users', () => {
    controller.findAll(createRequest(), 'tenant-b');
    controller.create(createRequest(), { name: 'Site A' }, 'tenant-b');
    controller.update(createRequest(), 5, { name: 'Site B' }, 'tenant-b');
    controller.remove(createRequest(), 5, 'tenant-b');

    expect(facilityService.findAll).toHaveBeenCalledWith('tenant-a');
    expect(facilityService.create).toHaveBeenCalledWith(
      'tenant-a',
      expect.any(Object),
    );
    expect(facilityService.update).toHaveBeenCalledWith(
      'tenant-a',
      5,
      expect.any(Object),
    );
    expect(facilityService.remove).toHaveBeenCalledWith('tenant-a', 5);
  });

  it('allows SUPER_ADMIN users to explicitly target another tenant', () => {
    controller.findAll(createRequest({ role: 'SUPER_ADMIN' }), 'tenant-b');

    expect(facilityService.findAll).toHaveBeenCalledWith('tenant-b');
  });
});
