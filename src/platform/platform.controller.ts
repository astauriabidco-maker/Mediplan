import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import type {
  CreatePlatformTenantDto,
  CreateTenantAdminDto,
  UpdatePlatformTenantDto,
} from './dto/platform.dto';
import { PlatformAuditService } from './platform-audit.service';
import type * as PlatformAuditTypes from './platform-audit.service';
import { PlatformMonitoringQueryDto } from './platform-monitoring.dto';
import { PlatformMonitoringService } from './platform-monitoring.service';
import type { UpdatePlatformSettingsDto } from './platform-settings.dto';
import { PlatformRoleGuard } from './platform-role.guard';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformTenantDetailService } from './platform-tenant-detail.service';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly platformTenantDetailService: PlatformTenantDetailService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly platformMonitoringService: PlatformMonitoringService,
    private readonly platformAuditService: PlatformAuditService,
  ) {}

  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    const profile = await this.platformService.getPlatformUser(req.user.id);

    return {
      id: req.user.id,
      email: req.user.email,
      tenantId: req.user.tenantId,
      role: req.user.role,
      permissions: req.user.permissions ?? [],
      profile,
    };
  }

  @Get('tenants')
  tenants() {
    return this.platformService.getTenantSummaries();
  }

  @Get('tenants/:tenantId/detail')
  tenantDetail(@Param('tenantId') tenantId: string) {
    return this.platformTenantDetailService.getTenantDetail(tenantId);
  }

  @Get('monitoring/tenants')
  tenantMonitoring(@Query() query: PlatformMonitoringQueryDto) {
    return this.platformMonitoringService.getTenantMonitoring({
      tenantId: query.tenantId,
      backupFreshnessHours: query.backupFreshnessHours
        ? Number(query.backupFreshnessHours)
        : undefined,
    });
  }

  @Get('settings')
  settings(@Req() req: AuthenticatedRequest) {
    return this.platformSettingsService.getSettings(req.user);
  }

  @Patch('settings')
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdatePlatformSettingsDto,
  ) {
    return this.platformSettingsService.updateSettings(body, req.user);
  }

  @Post('tenants')
  createTenant(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreatePlatformTenantDto,
  ) {
    return this.platformService.createTenant(body, req.user);
  }

  @Patch('tenants/:tenantId')
  updateTenant(
    @Req() req: AuthenticatedRequest,
    @Param('tenantId') tenantId: string,
    @Body() body: UpdatePlatformTenantDto,
  ) {
    return this.platformService.updateTenant(tenantId, body, req.user);
  }

  @Post('tenants/:tenantId/suspend')
  suspendTenant(
    @Req() req: AuthenticatedRequest,
    @Param('tenantId') tenantId: string,
  ) {
    return this.platformService.suspendTenant(tenantId, req.user);
  }

  @Post('tenants/:tenantId/activate')
  activateTenant(
    @Req() req: AuthenticatedRequest,
    @Param('tenantId') tenantId: string,
  ) {
    return this.platformService.activateTenant(tenantId, req.user);
  }

  @Get('tenants/:tenantId/users')
  listTenantUsers(@Param('tenantId') tenantId: string) {
    return this.platformService.listTenantUsers(tenantId);
  }

  @Post('tenants/:tenantId/admins')
  createTenantAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('tenantId') tenantId: string,
    @Body() body: CreateTenantAdminDto,
  ) {
    return this.platformService.createTenantAdmin(tenantId, body, req.user);
  }

  @Get('audit')
  audit(@Query() query: PlatformAuditTypes.PlatformAuditQuery) {
    return this.platformAuditService.list(query);
  }

  @Get('audit/export')
  exportAudit(
    @Query()
    query: PlatformAuditTypes.PlatformAuditQuery & {
      format?: PlatformAuditTypes.PlatformAuditExportFormat;
    },
  ) {
    return this.platformAuditService.export(query, query.format ?? 'json');
  }
}
