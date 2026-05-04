import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Patch,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutoSchedulerService, ShiftNeed } from './auto-scheduler.service';
import { DocumentsService } from '../documents/documents.service';
import { Shift } from './entities/shift.entity';
import { Leave, LeaveType, LeaveStatus } from './entities/leave.entity';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';
import {
  CompliancePeriodQueryDto,
  ComplianceReportResponseDto,
  ComplianceReportsQueryDto,
  ComplianceSummaryResponseDto,
  CorrectionGuidanceResponseDto,
  DecisionRecommendationsResponseDto,
  ApproveShiftExceptionResponseDto,
  ManagerCockpitResponseDto,
  ManagerWorklistResponseDto,
  PlanningComplianceTimelineQueryDto,
  PlanningComplianceTimelineResponseDto,
  ProductionObservabilityHealthResponseDto,
  PublishPlanningPreviewResponseDto,
  PublishPlanningResponseDto,
  ReassignShiftResponseDto,
  RevalidateShiftResponseDto,
  RequestReplacementResponseDto,
  ResolvePlanningAlertResponseDto,
  ServiceComplianceIndicatorsResponseDto,
  ShiftDecisionSuggestionsResponseDto,
  ShiftComplianceResponseDto,
} from './dto/compliance-api.dto';
import {
  ApproveShiftExceptionDto,
  CreateShiftDto,
  PublishPlanningDto,
  ReassignShiftDto,
  RequestReplacementDto,
  ResolvePlanningAlertDto,
  UpdateShiftDto,
} from './dto/shift-mutation.dto';

@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningController {
  constructor(
    private readonly planningService: PlanningService,
    private readonly optimizationService: OptimizationService,
    private readonly autoSchedulerService: AutoSchedulerService,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    private readonly documentsService: DocumentsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('leaves')
  @Permissions('leaves:request')
  async createLeave(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      agentId: number;
      start: string;
      end: string;
      type: LeaveType;
      reason?: string;
    },
  ) {
    const leave = this.leaveRepository.create({
      agent: { id: body.agentId },
      start: new Date(body.start),
      end: new Date(body.end),
      type: body.type || LeaveType.CONGE_ANNUEL,
      reason: body.reason,
      status: LeaveStatus.APPROVED, // Auto-approve for MVP
      tenantId: req.user.tenantId,
    });
    return this.leaveRepository.save(leave);
  }

  @UseGuards(JwtAuthGuard)
  @Get('replacements')
  @Permissions('planning:read')
  async getReplacements(
    @Request() req: AuthenticatedRequest,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('competency') competency: string, // Optional filter
    @Query('tenantId') queryTenantId?: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const tenantId = resolveTenantId(req, queryTenantId);

    return this.autoSchedulerService.findReplacements(
      tenantId,
      startDate,
      endDate,
      competency,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('leaves')
  @Permissions('planning:read')
  async getLeaves(
    @Request() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId = resolveTenantId(req, queryTenantId);
    return this.leaveRepository.find({
      where: { tenantId },
      relations: ['agent'],
    });
  }

  @Get('shifts')
  @Permissions('planning:read')
  async getShifts(
    @Request() req: AuthenticatedRequest,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('facilityId') facilityId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.planningService.getShifts(
      resolveTenantId(req, queryTenantId),
      new Date(start),
      new Date(end),
      facilityId ? parseInt(facilityId, 10) : undefined,
      serviceId ? parseInt(serviceId, 10) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  @Permissions('planning:read')
  async validate(
    @Request() req: AuthenticatedRequest,
    @Query('agentId', ParseIntPipe) agentId: number,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const validation = await this.planningService.validateShift(
      req.user.tenantId, // Pass tenantId from JWT
      agentId,
      new Date(start),
      new Date(end),
    );
    return validation;
  }

  @UseGuards(JwtAuthGuard)
  @Post('optimize')
  @Permissions('planning:manage')
  async optimize(
    @Request() req: AuthenticatedRequest,
    @Body('shifts')
    shifts: { id: string; start: string; end: string; requiredSkill: string }[],
  ) {
    // Fetch agents belonging to the tenant
    const agents = await this.agentRepository.find({
      where: { tenantId: req.user.tenantId },
      relations: ['agentCompetencies', 'agentCompetencies.competency'],
    });

    const parsedShifts = shifts.map((s) => ({
      ...s,
      start: new Date(s.start),
      end: new Date(s.end),
    }));

    // Pass tenantId to optimization service
    return this.optimizationService.compute(
      parsedShifts,
      agents,
      req.user.tenantId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('auto-schedule')
  @Permissions('planning:manage')
  async autoSchedule(
    @Request() req: AuthenticatedRequest,
    @Body() body: { start: string; end: string; needs: ShiftNeed[] },
  ) {
    const tenantId = req.user.tenantId;
    return this.autoSchedulerService.generateSchedule(
      tenantId,
      new Date(body.start),
      new Date(body.end),
      body.needs.map((n) => ({
        ...n,
        start: new Date(n.start),
        end: new Date(n.end),
      })),
    );
  }

  // TÂCHE 3 : Endpoint API qui déclenche la génération Intelligente de l'IA (Basée sur l'Arbre H24)
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @Permissions('planning:manage')
  async generate(
    @Request() req: AuthenticatedRequest,
    @Body() body: { start: string; end: string },
  ) {
    const tenantId = req.user.tenantId;
    const startDate = new Date(body.start);
    const endDate = new Date(body.end);

    // Appel direct au moteur intelligent (Deduction via HospitalServices)
    return this.autoSchedulerService.generateSmartSchedule(
      tenantId,
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('manager/cockpit')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ManagerCockpitResponseDto })
  async getManagerCockpit(
    @Request() req: AuthenticatedRequest,
    @Query() query: CompliancePeriodQueryDto,
  ): Promise<ManagerCockpitResponseDto> {
    return this.planningService.getManagerCockpit(
      resolveTenantId(req, query.tenantId),
      this.toCompliancePeriodFilters(query),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('observability/health')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ProductionObservabilityHealthResponseDto })
  async getProductionObservabilityHealth(
    @Request() req: AuthenticatedRequest,
    @Query() query: CompliancePeriodQueryDto,
  ): Promise<ProductionObservabilityHealthResponseDto> {
    return this.planningService.getProductionObservabilityHealth(
      resolveTenantId(req, query.tenantId),
      this.toCompliancePeriodFilters(query),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/service-indicators')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ServiceComplianceIndicatorsResponseDto })
  async getServiceComplianceIndicators(
    @Request() req: AuthenticatedRequest,
    @Query() query: CompliancePeriodQueryDto,
  ): Promise<ServiceComplianceIndicatorsResponseDto> {
    return this.planningService.getServiceComplianceIndicators(
      resolveTenantId(req, query.tenantId),
      this.toCompliancePeriodFilters(query),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/worklist')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ManagerWorklistResponseDto })
  async getManagerWorklist(
    @Request() req: AuthenticatedRequest,
    @Query() query: CompliancePeriodQueryDto,
  ): Promise<ManagerWorklistResponseDto> {
    return this.planningService.getManagerWorklist(
      resolveTenantId(req, query.tenantId),
      this.toCompliancePeriodFilters(query),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/recommendations')
  @Permissions('planning:read')
  @ApiOkResponse({ type: DecisionRecommendationsResponseDto })
  async getDecisionRecommendations(
    @Request() req: AuthenticatedRequest,
    @Query() query: CompliancePeriodQueryDto,
  ): Promise<DecisionRecommendationsResponseDto> {
    return this.planningService.getDecisionRecommendations(
      resolveTenantId(req, query.tenantId),
      this.toCompliancePeriodFilters(query),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/summary')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ComplianceSummaryResponseDto })
  async getComplianceSummary(
    @Request() req: AuthenticatedRequest,
    @Query() query: CompliancePeriodQueryDto,
  ): Promise<ComplianceSummaryResponseDto> {
    return this.planningService.getComplianceSummary(
      resolveTenantId(req, query.tenantId),
      this.toCompliancePeriodFilters(query),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/reports')
  @Permissions('audit:read')
  @ApiOkResponse({ type: [ComplianceReportResponseDto] })
  async getComplianceReports(
    @Request() req: AuthenticatedRequest,
    @Query() query: ComplianceReportsQueryDto,
  ): Promise<ComplianceReportResponseDto[]> {
    return this.planningService.getComplianceReports(
      resolveTenantId(req, query.tenantId),
      {
        ...this.toCompliancePeriodFilters(query),
        limit: this.toOptionalLimit(query.limit),
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('compliance/timeline')
  @Permissions('audit:read')
  @ApiOkResponse({ type: PlanningComplianceTimelineResponseDto })
  async getPlanningComplianceTimeline(
    @Request() req: AuthenticatedRequest,
    @Query() query: PlanningComplianceTimelineQueryDto,
  ): Promise<PlanningComplianceTimelineResponseDto> {
    return this.planningService.getPlanningComplianceTimeline(
      resolveTenantId(req, query.tenantId),
      {
        ...this.toCompliancePeriodFilters(query),
        limit: this.toOptionalLimit(query.limit),
        agentId: query.agentId,
        shiftId: query.shiftId,
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('shifts/:id/compliance')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ShiftComplianceResponseDto })
  async explainShiftCompliance(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ShiftComplianceResponseDto> {
    return this.planningService.explainShiftCompliance(req.user.tenantId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shifts/:id/correction-guidance')
  @Permissions('planning:read')
  @ApiOkResponse({ type: CorrectionGuidanceResponseDto })
  async getShiftCorrectionGuidance(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CorrectionGuidanceResponseDto> {
    return this.planningService.getShiftCorrectionGuidance(
      req.user.tenantId,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('shifts/:id/suggestions')
  @Permissions('planning:read')
  @ApiOkResponse({ type: ShiftDecisionSuggestionsResponseDto })
  async getShiftDecisionSuggestions(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ShiftDecisionSuggestionsResponseDto> {
    const shift = await this.planningService.getShiftSuggestionContext(
      req.user.tenantId,
      id,
    );
    const replacements = await this.autoSchedulerService.findReplacements(
      req.user.tenantId,
      shift.start,
      shift.end,
      shift.postId,
    );

    return this.planningService.getShiftDecisionSuggestions(
      req.user.tenantId,
      id,
      replacements,
    );
  }

  @Post('shifts/:id/revalidate')
  @Permissions('planning:write')
  @ApiOkResponse({ type: RevalidateShiftResponseDto })
  async revalidateShift(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RevalidateShiftResponseDto> {
    return this.planningService.revalidateShift(
      req.user.tenantId,
      req.user.id,
      id,
    );
  }

  @Post('shifts/:id/reassign')
  @Permissions('planning:write')
  @ApiOkResponse({ type: ReassignShiftResponseDto })
  async reassignShift(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ReassignShiftDto,
  ): Promise<ReassignShiftResponseDto> {
    return this.planningService.reassignShift(
      req.user.tenantId,
      req.user.id,
      id,
      data.agentId,
    );
  }

  @Post('shifts/:id/request-replacement')
  @Permissions('planning:write')
  @ApiOkResponse({ type: RequestReplacementResponseDto })
  async requestReplacement(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: RequestReplacementDto,
  ): Promise<RequestReplacementResponseDto> {
    return this.planningService.requestReplacement(
      req.user.tenantId,
      req.user.id,
      id,
      data.reason,
    );
  }

  @Patch('alerts/:id/resolve')
  @Permissions('planning:write', 'alerts:manage')
  @ApiOkResponse({ type: ResolvePlanningAlertResponseDto })
  async resolvePlanningAlert(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ResolvePlanningAlertDto,
  ): Promise<ResolvePlanningAlertResponseDto> {
    return this.planningService.resolvePlanningAlert(
      req.user.tenantId,
      req.user.id,
      id,
      data.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('alerts/:id/correction-guidance')
  @Permissions('planning:read')
  @ApiOkResponse({ type: CorrectionGuidanceResponseDto })
  async getAlertCorrectionGuidance(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CorrectionGuidanceResponseDto> {
    return this.planningService.getAlertCorrectionGuidance(
      req.user.tenantId,
      id,
    );
  }

  @Post('shifts/:id/exception')
  @Permissions('planning:exception')
  @ApiOkResponse({ type: ApproveShiftExceptionResponseDto })
  async approveShiftException(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ApproveShiftExceptionDto,
  ): Promise<ApproveShiftExceptionResponseDto> {
    return this.planningService.approveShiftException(
      req.user.tenantId,
      req.user.id,
      id,
      data.reason,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('publish/preview')
  @Permissions('planning:read')
  @ApiOkResponse({ type: PublishPlanningPreviewResponseDto })
  async previewPublish(
    @Request() req: AuthenticatedRequest,
    @Body() body: PublishPlanningDto,
  ): Promise<PublishPlanningPreviewResponseDto> {
    return this.planningService.previewPublishPlanning(
      req.user.tenantId,
      new Date(body.start),
      new Date(body.end),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('publish')
  @Permissions('planning:manage')
  async publish(
    @Request() req: AuthenticatedRequest,
    @Body() body: PublishPlanningDto,
  ): Promise<PublishPlanningResponseDto> {
    return this.planningService.publishPlanning(
      req.user.tenantId,
      req.user.id,
      new Date(body.start),
      new Date(body.end),
    );
  }

  @Get('shift-applications')
  @Permissions('planning:read')
  async getShiftApplications(@Request() req: AuthenticatedRequest) {
    return this.planningService.getShiftApplications(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('shift-applications/:id/approve')
  @Permissions('planning:write')
  async approveGhtApplication(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.planningService.approveGhtApplication(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  // --- BOURSE D'ÉCHANGE ---

  @Get('swaps/available')
  @Permissions('planning:read')
  async getAvailableSwaps(@Request() req: AuthenticatedRequest) {
    return this.planningService.getAvailableSwaps(
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post('shifts/:id/request-swap')
  @Permissions('planning:read')
  async requestSwap(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.planningService.requestSwap(req.user.tenantId, id, req.user.id);
  }

  @Post('shifts/:id/apply-swap')
  @Permissions('planning:read')
  async applyForSwap(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.planningService.applyForSwap(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('shift-applications/:id/reject')
  @Permissions('planning:write')
  async rejectGhtApplication(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.planningService.rejectGhtApplication(
      req.user.tenantId,
      id,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('shifts')
  @Permissions('planning:write')
  async createShift(
    @Request() req: AuthenticatedRequest,
    @Body() data: CreateShiftDto,
  ) {
    return this.planningService.createShift(req.user.tenantId, req.user.id, {
      agentId: data.agentId,
      start: new Date(data.start),
      end: new Date(data.end),
      postId: data.postId,
      type: data.type,
      facilityId: data.facilityId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('assign-replacement')
  @Permissions('planning:write')
  async assignReplacement(
    @Request() req: AuthenticatedRequest,
    @Body() data: CreateShiftDto,
  ) {
    return this.planningService.assignReplacement(
      req.user.tenantId,
      req.user.id,
      data.agentId,
      new Date(data.start),
      new Date(data.end),
      data.postId,
    );
  }

  @Patch('shifts/:id')
  @Permissions('planning:write')
  async updateShift(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: UpdateShiftDto,
  ) {
    return this.planningService.updateShift(
      req.user.tenantId,
      id,
      new Date(data.start),
      new Date(data.end),
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('shifts/:id/generate-contract')
  @Permissions('documents:write')
  async generateContract(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const shift = await this.shiftRepository.findOne({
      where: { id: parseInt(id, 10), tenantId: req.user.tenantId },
      relations: ['agent', 'hospitalService'],
    });

    if (!shift) {
      throw new BadRequestException('Shift not found');
    }

    if (!shift.agent) {
      throw new BadRequestException(
        'Cannot generate contract for an unassigned shift',
      );
    }

    return this.documentsService.generateContractForShift(
      req.user.tenantId,
      shift,
      shift.agent,
    );
  }

  private toCompliancePeriodFilters(query: CompliancePeriodQueryDto): {
    from?: Date;
    to?: Date;
  } {
    return {
      from: this.toOptionalDate(query.from, 'from'),
      to: this.toOptionalDate(query.to, 'to'),
    };
  }

  private toOptionalDate(value: string | undefined, field: string) {
    if (!value) return undefined;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }

    return date;
  }

  private toOptionalLimit(value: number | undefined): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      throw new BadRequestException('Invalid report limit');
    }

    return value;
  }
}
