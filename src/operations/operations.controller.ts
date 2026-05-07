import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { resolveTenantId } from '../auth/tenant-context';
import {
  AssignOperationIncidentDto,
  CloseOperationIncidentDto,
  DeclareOperationIncidentDto,
  EscalateOperationIncidentDto,
  OperationIncidentFiltersDto,
  OperationIncidentParamDto,
  ResolveOperationIncidentDto,
} from './dto/operation-incident.dto';
import {
  CreateOperationsJournalEntryDto,
  OperationsJournalQueryDto,
  UpdateOperationsJournalEntryDto,
} from './dto/operations-journal.dto';
import { OperationsService } from './operations.service';

@Controller('ops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('journal')
  @Permissions('operations:read', 'audit:read')
  findJournalEntries(
    @Request() req: AuthenticatedRequest,
    @Query() filters: OperationsJournalQueryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.findJournalEntries(
      resolveTenantId(req, queryTenantId),
      filters,
    );
  }

  @Get('journal/:id')
  @Permissions('operations:read', 'audit:read')
  getJournalEntry(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.getJournalEntry(
      resolveTenantId(req, queryTenantId),
      Number(id),
    );
  }

  @Post('journal')
  @Permissions('operations:write')
  createJournalEntry(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateOperationsJournalEntryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.createJournalEntry(
      resolveTenantId(req, queryTenantId),
      dto,
      req.user.id,
    );
  }

  @Patch('journal/:id')
  @Permissions('operations:write')
  updateJournalEntry(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Body() dto: UpdateOperationsJournalEntryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.updateJournalEntry(
      resolveTenantId(req, queryTenantId),
      Number(id),
      dto,
      req.user.id,
    );
  }

  @Get('incidents')
  @Permissions('operations:read', 'audit:read')
  findIncidents(
    @Request() req: AuthenticatedRequest,
    @Query() filters: OperationIncidentFiltersDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.findIncidents(
      resolveTenantId(req, queryTenantId),
      filters,
    );
  }

  @Get('incidents/:id')
  @Permissions('operations:read', 'audit:read')
  findIncident(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.findIncident(
      resolveTenantId(req, queryTenantId),
      params.id,
    );
  }

  @Post('incidents')
  @Permissions('operations:write')
  declareIncident(
    @Request() req: AuthenticatedRequest,
    @Body() dto: DeclareOperationIncidentDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.declareIncident(
      resolveTenantId(req, queryTenantId),
      dto,
      req.user.id,
    );
  }

  @Patch('incidents/:id/assign')
  @Permissions('operations:write')
  assignIncident(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Body() dto: AssignOperationIncidentDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.assignIncident(
      resolveTenantId(req, queryTenantId),
      params.id,
      dto,
      req.user.id,
    );
  }

  @Patch('incidents/:id/escalate')
  @Permissions('operations:write')
  escalateIncident(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Body() dto: EscalateOperationIncidentDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.escalateIncident(
      resolveTenantId(req, queryTenantId),
      params.id,
      dto,
      req.user.id,
    );
  }

  @Patch('incidents/:id/resolve')
  @Permissions('operations:write')
  resolveIncident(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Body() dto: ResolveOperationIncidentDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.resolveIncident(
      resolveTenantId(req, queryTenantId),
      params.id,
      dto,
      req.user.id,
    );
  }

  @Patch('incidents/:id/close')
  @Permissions('operations:write')
  closeIncident(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Body() dto: CloseOperationIncidentDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.closeIncident(
      resolveTenantId(req, queryTenantId),
      params.id,
      dto,
      req.user.id,
    );
  }
}
