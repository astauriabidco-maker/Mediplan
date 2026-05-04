import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';
import { AgentAlertsService } from './agent-alerts.service';

@Controller('agent-alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentAlertsController {
  constructor(private readonly agentAlertsService: AgentAlertsService) {}

  @Get()
  @Permissions('agents:read', 'alerts:read')
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId?: string,
    @Query('agentId') agentId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('isResolved') isResolved?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    const filters = this.agentAlertsService.validateFilters({
      agentId,
      type,
      severity,
      isResolved,
    });
    return this.agentAlertsService.findAll(tenantId, filters);
  }

  @Get(':id')
  @Permissions('agents:read', 'alerts:read')
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.agentAlertsService.findOne(
      resolveTenantId(req, queryTenantId),
      id,
    );
  }

  @Patch(':id/acknowledge')
  @Permissions('agents:write', 'alerts:manage')
  acknowledge(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    return this.agentAlertsService.acknowledge(tenantId, id, req.user.id);
  }

  @Patch(':id/resolve')
  @Permissions('agents:write', 'alerts:manage')
  resolve(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    return this.agentAlertsService.resolve(tenantId, id, req.user.id, reason);
  }
}
