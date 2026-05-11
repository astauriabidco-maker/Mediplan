import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('shifts')
  async getAvailableShifts(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.getAvailableShifts(tenantId);
  }

  @Get('shifts/:id')
  async getShiftDetails(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.getShiftDetails(tenantId, req.user.sub, parseInt(id));
  }

  @Post('apply/:id')
  async applyToShift(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.applyToShift(tenantId, req.user.sub, parseInt(id));
  }

  @Get('applications')
  async getMyApplications(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.getMyApplications(tenantId, req.user.sub);
  }

  @Get('applications/pending')
  async getPendingApplications(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.getPendingApplications(tenantId);
  }

  @Patch('applications/:id/approve')
  async approveApplication(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { action: 'APPROVE' | 'REJECT' }) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.approveApplication(tenantId, parseInt(id), body.action);
  }

  @Get('analytics')
  async getAnalytics(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId || 'DEFAULT_TENANT';
    return this.marketplaceService.getAnalytics(tenantId);
  }
}
