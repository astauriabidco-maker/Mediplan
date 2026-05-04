jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn(),
}));

import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['analytics:read'],
    ...overrides,
  },
});

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<
    Pick<
      AnalyticsService,
      | 'getOverviewKpis'
      | 'getMonthlyTrends'
      | 'getServicesDistribution'
      | 'searchInsight'
    >
  >;

  beforeEach(() => {
    analyticsService = {
      getOverviewKpis: jest.fn(),
      getMonthlyTrends: jest.fn(),
      getServicesDistribution: jest.fn(),
      searchInsight: jest.fn(),
    };

    controller = new AnalyticsController(
      analyticsService as unknown as AnalyticsService,
    );
  });

  it('requires analytics:read on every analytics endpoint', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AnalyticsController.prototype.getKpis,
      ),
    ).toEqual(['analytics:read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AnalyticsController.prototype.getTrends,
      ),
    ).toEqual(['analytics:read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AnalyticsController.prototype.getServicesDistribution,
      ),
    ).toEqual(['analytics:read']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AnalyticsController.prototype.getInsight,
      ),
    ).toEqual(['analytics:read']);
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    await controller.getKpis(createRequest(), 'tenant-b', 7);
    await controller.getTrends(createRequest(), 'tenant-b');
    await controller.getServicesDistribution(createRequest(), 'tenant-b');
    await controller.getInsight(createRequest(), 'risk', 'tenant-b');

    expect(analyticsService.getOverviewKpis).toHaveBeenCalledWith(
      'tenant-a',
      7,
    );
    expect(analyticsService.getMonthlyTrends).toHaveBeenCalledWith('tenant-a');
    expect(analyticsService.getServicesDistribution).toHaveBeenCalledWith(
      'tenant-a',
    );
    expect(analyticsService.searchInsight).toHaveBeenCalledWith(
      'risk',
      'tenant-a',
    );
  });

  it('allows SUPER_ADMIN users to explicitly inspect another tenant', async () => {
    await controller.getKpis(
      createRequest({ role: 'SUPER_ADMIN' }),
      'tenant-b',
    );

    expect(analyticsService.getOverviewKpis).toHaveBeenCalledWith(
      'tenant-b',
      undefined,
    );
  });
});
