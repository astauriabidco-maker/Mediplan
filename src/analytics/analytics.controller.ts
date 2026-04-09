import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('kpis')
    async getKpis(@Query('tenantId') tenantId: string) {
        return this.analyticsService.getOverviewKpis(tenantId || 'HGD-DOUALA');
    }

    @Get('trends')
    async getTrends(@Query('tenantId') tenantId: string) {
        return this.analyticsService.getMonthlyTrends(tenantId || 'HGD-DOUALA');
    }

    @Get('services')
    async getServicesDistribution(@Query('tenantId') tenantId: string) {
        return this.analyticsService.getServicesDistribution(tenantId || 'HGD-DOUALA');
    }
}
