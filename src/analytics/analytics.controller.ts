import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  @Permissions('analytics:read')
  async getKpis(
    @Req() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId: string,
    @Query('hospitalServiceId') hospitalServiceId?: number,
  ) {
    return this.analyticsService.getOverviewKpis(
      resolveTenantId(req, queryTenantId),
      hospitalServiceId,
    );
  }

  @Get('trends')
  @Permissions('analytics:read')
  async getTrends(
    @Req() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId: string,
  ) {
    return this.analyticsService.getMonthlyTrends(
      resolveTenantId(req, queryTenantId),
    );
  }

  @Get('services')
  @Permissions('analytics:read')
  async getServicesDistribution(
    @Req() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId: string,
  ) {
    return this.analyticsService.getServicesDistribution(
      resolveTenantId(req, queryTenantId),
    );
  }

  @Get('insight')
  @Permissions('analytics:read')
  async getInsight(
    @Req() req: AuthenticatedRequest,
    @Query('query') query: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    return this.analyticsService.searchInsight(
      query || '',
      resolveTenantId(req, queryTenantId),
    );
  }
}
