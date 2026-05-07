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
  RunOperationalEscalationDto,
} from './dto/operation-incident.dto';
import { OperationRoutineRunQueryDto } from './dto/operation-routine-run.dto';
import {
  CreateOpsOnCallConfigDto,
  OpsOnCallConfigQueryDto,
  UpdateOpsOnCallConfigDto,
} from './dto/ops-on-call-config.dto';
import {
  OperationalAlertFiltersDto,
  OperationalAlertParamDto,
  ResolveOperationalAlertDto,
} from './dto/operational-alert.dto';
import {
  CreateOperationsJournalEntryDto,
  OperationsJournalQueryDto,
  UpdateOperationsJournalEntryDto,
} from './dto/operations-journal.dto';
import { OpsActionCenterQueryDto } from './dto/ops-action-center.dto';
import { RunOpsRoutineSchedulerDto } from './dto/ops-routine-scheduler.dto';
import {
  OpsPreAction,
  OpsPreActionValidationService,
} from './ops-pre-action-validation.service';
import { OpsOnCallConfigService } from './ops-on-call-config.service';
import { OpsObservabilityQueryDto } from './dto/ops-observability.dto';
import { OpsRoutineSchedulerService } from './ops-routine-scheduler.service';
import { OperationsService } from './operations.service';

@Controller('ops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(
    private readonly operationsService: OperationsService,
    private readonly preActionValidationService: OpsPreActionValidationService,
    private readonly onCallConfigService: OpsOnCallConfigService,
    private readonly routineSchedulerService: OpsRoutineSchedulerService,
  ) {}

  @Get('on-call-configs')
  @Permissions('operations:read', 'audit:read')
  findOnCallConfigs(
    @Request() req: AuthenticatedRequest,
    @Query() query: OpsOnCallConfigQueryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.onCallConfigService.findTenantConfigs(
      resolveTenantId(req, queryTenantId),
      query,
    );
  }

  @Post('on-call-configs')
  @Permissions('operations:write')
  createOnCallConfig(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateOpsOnCallConfigDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.onCallConfigService.createTenantConfig(
      resolveTenantId(req, queryTenantId),
      dto,
      req.user.id,
    );
  }

  @Patch('on-call-configs/:id')
  @Permissions('operations:write')
  updateOnCallConfig(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Body() dto: UpdateOpsOnCallConfigDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.onCallConfigService.updateTenantConfig(
      resolveTenantId(req, queryTenantId),
      Number(id),
      dto,
      req.user.id,
    );
  }

  @Get('action-center')
  @Permissions('operations:read', 'audit:read')
  getActionCenter(
    @Request() req: AuthenticatedRequest,
    @Query() filters: OpsActionCenterQueryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.getActionCenter(
      resolveTenantId(req, queryTenantId),
      filters,
    );
  }

  @Get('observability')
  @Permissions('operations:read', 'audit:read')
  getObservabilityMetrics(
    @Request() req: AuthenticatedRequest,
    @Query() filters: OpsObservabilityQueryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.getObservabilityMetrics(
      resolveTenantId(req, queryTenantId),
      filters,
    );
  }

  @Get('routine-runs')
  @Permissions('operations:read', 'audit:read')
  listRoutineRuns(
    @Request() req: AuthenticatedRequest,
    @Query() filters: OperationRoutineRunQueryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.listRoutineRuns(
      resolveTenantId(req, queryTenantId),
      filters,
    );
  }

  @Get('routine-runs/:id')
  @Permissions('operations:read', 'audit:read')
  getRoutineRun(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.getRoutineRun(
      resolveTenantId(req, queryTenantId),
      Number(id),
    );
  }

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

  @Get('alerts')
  @Permissions('operations:read', 'audit:read')
  findAlerts(
    @Request() req: AuthenticatedRequest,
    @Query() filters: OperationalAlertFiltersDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.findAlerts(
      resolveTenantId(req, queryTenantId),
      filters,
    );
  }

  @Get('alerts/:id')
  @Permissions('operations:read', 'audit:read')
  getAlert(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationalAlertParamDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.getAlert(
      resolveTenantId(req, queryTenantId),
      params.id,
    );
  }

  @Get('alerts/:id/runbook')
  @Permissions('operations:read', 'audit:read')
  generateAlertRunbook(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationalAlertParamDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.generateAlertRunbook(
      resolveTenantId(req, queryTenantId),
      params.id,
    );
  }

  @Patch('alerts/:id/resolve')
  @Permissions('operations:write')
  resolveAlert(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationalAlertParamDto,
    @Body() dto: ResolveOperationalAlertDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('RESOLVE_ALERT', req, tenantId, {
      hasRequiredEvidence: Boolean(dto.resolutionSummary),
    });
    return this.operationsService.resolveAlert(
      tenantId,
      params.id,
      dto,
      req.user.id,
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

  @Get('journal/:id/runbook')
  @Permissions('operations:read', 'audit:read')
  generateJournalRunbook(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.generateJournalRunbook(
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

  @Get('incidents/:id/runbook')
  @Permissions('operations:read', 'audit:read')
  generateIncidentRunbook(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.operationsService.generateIncidentRunbook(
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
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('DECLARE_INCIDENT', req, tenantId, {
      hasRequiredEvidence: Boolean(
        dto.title && dto.description && dto.severity,
      ),
    });
    return this.operationsService.declareIncident(tenantId, dto, req.user.id);
  }

  @Patch('incidents/:id/assign')
  @Permissions('operations:write')
  assignIncident(
    @Request() req: AuthenticatedRequest,
    @Param() params: OperationIncidentParamDto,
    @Body() dto: AssignOperationIncidentDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('ASSIGN_INCIDENT', req, tenantId, {
      hasRequiredEvidence: Boolean(dto.assignedToId),
    });
    return this.operationsService.assignIncident(
      tenantId,
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
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('ESCALATE_INCIDENT', req, tenantId, {
      hasRequiredEvidence: Boolean(dto.escalatedToId && dto.reason),
    });
    return this.operationsService.escalateIncident(
      tenantId,
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
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('RESOLVE_INCIDENT', req, tenantId, {
      hasRequiredEvidence: Boolean(dto.resolutionSummary && dto.evidenceUrl),
    });
    return this.operationsService.resolveIncident(
      tenantId,
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
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('CLOSE_INCIDENT', req, tenantId, {
      hasRequiredEvidence: Boolean(dto.closureSummary && dto.evidenceUrl),
    });
    return this.operationsService.closeIncident(
      tenantId,
      params.id,
      dto,
      req.user.id,
    );
  }

  @Post('escalations/run')
  @Permissions('operations:write')
  runOperationalEscalation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RunOperationalEscalationDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('RUN_OPERATIONAL_ESCALATION', req, tenantId);
    return this.operationsService.runOperationalEscalation(
      tenantId,
      dto,
      req.user.id,
    );
  }

  @Post('routines/run')
  @Permissions('operations:write')
  runOpsRoutines(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RunOpsRoutineSchedulerDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    this.validatePreAction('RUN_OPS_ROUTINES', req, tenantId);
    return this.routineSchedulerService.runManual(tenantId, dto, req.user.id);
  }

  private validatePreAction(
    action: OpsPreAction,
    req: AuthenticatedRequest,
    tenantId: string,
    options: { hasRequiredEvidence?: boolean } = {},
  ) {
    return this.preActionValidationService.assertAllowed({
      action,
      tenantId,
      actor: {
        tenantId: req.user.tenantId,
        role: req.user.role,
        permissions: req.user.permissions,
      },
      hasRequiredEvidence: options.hasRequiredEvidence,
    });
  }
}
