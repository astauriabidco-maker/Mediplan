import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { DocumentsService } from '../documents/documents.service';
import { AutoSchedulerService } from './auto-scheduler.service';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { Leave } from './entities/leave.entity';
import { Shift, ShiftType } from './entities/shift.entity';
import { OptimizationService } from './optimization.service';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('PlanningController shift mutations', () => {
  let controller: PlanningController;
  let planningService: {
    createShift: jest.Mock;
    assignReplacement: jest.Mock;
    updateShift: jest.Mock;
    revalidateShift: jest.Mock;
    reassignShift: jest.Mock;
    requestReplacement: jest.Mock;
    resolvePlanningAlert: jest.Mock;
    approveShiftException: jest.Mock;
    publishPlanning: jest.Mock;
    previewPublishPlanning: jest.Mock;
    getManagerWorklist: jest.Mock;
    getManagerCockpit: jest.Mock;
    getDecisionRecommendations: jest.Mock;
    getShiftSuggestionContext: jest.Mock;
    getShiftDecisionSuggestions: jest.Mock;
    getServiceComplianceIndicators: jest.Mock;
    getProductionObservabilityHealth: jest.Mock;
    getComplianceSummary: jest.Mock;
    getComplianceReports: jest.Mock;
    getPlanningComplianceTimeline: jest.Mock;
    explainShiftCompliance: jest.Mock;
    getShiftCorrectionGuidance: jest.Mock;
    getAlertCorrectionGuidance: jest.Mock;
  };
  let autoSchedulerService: { findReplacements: jest.Mock };

  const req = {
    user: {
      id: 99,
      userId: 99,
      sub: 99,
      email: 'manager@tenant-a.test',
      tenantId: 'tenant-a',
      tenant: 'tenant-a',
      role: 'MANAGER',
      permissions: ['planning:write'],
    },
  } as any;

  beforeEach(async () => {
    planningService = {
      createShift: jest.fn(),
      assignReplacement: jest.fn(),
      updateShift: jest.fn(),
      revalidateShift: jest.fn(),
      reassignShift: jest.fn(),
      requestReplacement: jest.fn(),
      resolvePlanningAlert: jest.fn(),
      approveShiftException: jest.fn(),
      publishPlanning: jest.fn(),
      previewPublishPlanning: jest.fn(),
      getManagerWorklist: jest.fn(),
      getManagerCockpit: jest.fn(),
      getDecisionRecommendations: jest.fn(),
      getShiftSuggestionContext: jest.fn(),
      getShiftDecisionSuggestions: jest.fn(),
      getServiceComplianceIndicators: jest.fn(),
      getProductionObservabilityHealth: jest.fn(),
      getComplianceSummary: jest.fn(),
      getComplianceReports: jest.fn(),
      getPlanningComplianceTimeline: jest.fn(),
      explainShiftCompliance: jest.fn(),
      getShiftCorrectionGuidance: jest.fn(),
      getAlertCorrectionGuidance: jest.fn(),
    };
    autoSchedulerService = {
      findReplacements: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        { provide: PlanningService, useValue: planningService },
        { provide: OptimizationService, useValue: { compute: jest.fn() } },
        {
          provide: AutoSchedulerService,
          useValue: {
            generateSchedule: jest.fn(),
            generateSmartSchedule: jest.fn(),
            findReplacements: autoSchedulerService.findReplacements,
          },
        },
        {
          provide: getRepositoryToken(Agent),
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(Leave),
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: createRepositoryMock(),
        },
        {
          provide: DocumentsService,
          useValue: { generateContractForShift: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<PlanningController>(PlanningController);
  });

  it('creates shifts with tenant, actor and parsed dates', async () => {
    planningService.createShift.mockResolvedValue({ id: 1 });

    await controller.createShift(req, {
      agentId: 10,
      start: '2026-01-12T08:00:00.000Z',
      end: '2026-01-12T16:00:00.000Z',
      postId: 'URG-1',
      type: ShiftType.NORMAL,
      facilityId: 3,
    });

    expect(planningService.createShift).toHaveBeenCalledWith(
      'tenant-a',
      99,
      expect.objectContaining({
        agentId: 10,
        start: new Date('2026-01-12T08:00:00.000Z'),
        end: new Date('2026-01-12T16:00:00.000Z'),
        postId: 'URG-1',
        type: ShiftType.NORMAL,
        facilityId: 3,
      }),
    );
  });

  it('assigns replacements with requester actor audit context', async () => {
    planningService.assignReplacement.mockResolvedValue({ id: 2 });

    await controller.assignReplacement(req, {
      agentId: 10,
      start: '2026-01-12T08:00:00.000Z',
      end: '2026-01-12T16:00:00.000Z',
      postId: 'URG-2',
    });

    expect(planningService.assignReplacement).toHaveBeenCalledWith(
      'tenant-a',
      99,
      10,
      new Date('2026-01-12T08:00:00.000Z'),
      new Date('2026-01-12T16:00:00.000Z'),
      'URG-2',
    );
  });

  it('keeps service HTTP exceptions intact for shift updates', async () => {
    planningService.updateShift.mockRejectedValue(
      new BadRequestException('Shift validation failed: SHIFT_OVERLAP'),
    );

    await expect(
      controller.updateShift(req, '5', {
        start: '2026-01-12T08:00:00.000Z',
        end: '2026-01-12T16:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('publishes planning through the service mutation path', async () => {
    planningService.publishPlanning.mockResolvedValue({
      message: 'Planning publié avec succès',
      affected: 4,
    });

    await controller.publish(req, {
      start: '2026-01-12T00:00:00.000Z',
      end: '2026-01-19T00:00:00.000Z',
    });

    expect(planningService.publishPlanning).toHaveBeenCalledWith(
      'tenant-a',
      99,
      new Date('2026-01-12T00:00:00.000Z'),
      new Date('2026-01-19T00:00:00.000Z'),
    );
  });

  it('previews planning publication without actor mutation context', async () => {
    planningService.previewPublishPlanning.mockResolvedValue({
      publishable: false,
      report: { violations: [{ shiftId: 7 }] },
    });

    const result = await controller.previewPublish(req, {
      start: '2026-01-12T00:00:00.000Z',
      end: '2026-01-19T00:00:00.000Z',
    });

    expect(result.publishable).toBe(false);
    expect(planningService.previewPublishPlanning).toHaveBeenCalledWith(
      'tenant-a',
      new Date('2026-01-12T00:00:00.000Z'),
      new Date('2026-01-19T00:00:00.000Z'),
    );
  });

  it('reads compliance reports with resolved tenant and date filters', async () => {
    planningService.getComplianceReports.mockResolvedValue([]);

    await controller.getComplianceReports(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
      limit: 20,
    });

    expect(planningService.getComplianceReports).toHaveBeenCalledWith(
      'tenant-a',
      {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
        limit: 20,
      },
    );
  });

  it('reads planning compliance timeline with resolved tenant and filters', async () => {
    planningService.getPlanningComplianceTimeline.mockResolvedValue({
      items: [],
    });

    await controller.getPlanningComplianceTimeline(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
      agentId: 10,
      shiftId: 80,
      limit: 25,
    });

    expect(planningService.getPlanningComplianceTimeline).toHaveBeenCalledWith(
      'tenant-a',
      {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
        limit: 25,
        agentId: 10,
        shiftId: 80,
      },
    );
  });

  it('protects planning compliance timeline with audit read permission', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      PlanningController.prototype.getPlanningComplianceTimeline,
    );

    expect(permissions).toEqual(['audit:read']);
  });

  it('reads compliance summary with resolved tenant and date filters', async () => {
    planningService.getComplianceSummary.mockResolvedValue({ counters: {} });

    await controller.getComplianceSummary(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(planningService.getComplianceSummary).toHaveBeenCalledWith(
      'tenant-a',
      {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
      },
    );
  });

  it('reads manager worklist with resolved tenant and date filters', async () => {
    planningService.getManagerWorklist.mockResolvedValue({ items: [] });

    await controller.getManagerWorklist(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(planningService.getManagerWorklist).toHaveBeenCalledWith(
      'tenant-a',
      {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
      },
    );
  });

  it('reads manager cockpit with resolved tenant and date filters', async () => {
    planningService.getManagerCockpit.mockResolvedValue({ counters: {} });

    await controller.getManagerCockpit(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(planningService.getManagerCockpit).toHaveBeenCalledWith('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    });
  });

  it('reads decision recommendations with resolved tenant and date filters', async () => {
    planningService.getDecisionRecommendations.mockResolvedValue({
      recommendations: [],
    });

    await controller.getDecisionRecommendations(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(planningService.getDecisionRecommendations).toHaveBeenCalledWith(
      'tenant-a',
      {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
      },
    );
  });

  it('reads production observability health with resolved tenant and date filters', async () => {
    planningService.getProductionObservabilityHealth.mockResolvedValue({
      status: 'HEALTHY',
    });

    await controller.getProductionObservabilityHealth(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(
      planningService.getProductionObservabilityHealth,
    ).toHaveBeenCalledWith('tenant-a', {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    });
  });

  it('reads service indicators with resolved tenant and date filters', async () => {
    planningService.getServiceComplianceIndicators.mockResolvedValue({
      services: [],
    });

    await controller.getServiceComplianceIndicators(req, {
      tenantId: 'tenant-b',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
    });

    expect(planningService.getServiceComplianceIndicators).toHaveBeenCalledWith(
      'tenant-a',
      {
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-01-31T23:59:59.000Z'),
      },
    );
  });

  it('rejects malformed compliance report dates before hitting the service', async () => {
    await expect(
      controller.getComplianceReports(req, {
        from: 'not-a-date',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(planningService.getComplianceReports).not.toHaveBeenCalled();
  });

  it('rejects out-of-range compliance report limits before hitting the service', async () => {
    await expect(
      controller.getComplianceReports(req, {
        limit: 1001,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(planningService.getComplianceReports).not.toHaveBeenCalled();
  });

  it('explains shift compliance in the authenticated tenant', async () => {
    planningService.explainShiftCompliance.mockResolvedValue({
      validation: { isValid: true },
    });

    await controller.explainShiftCompliance(req, 5);

    expect(planningService.explainShiftCompliance).toHaveBeenCalledWith(
      'tenant-a',
      5,
    );
  });

  it('reads shift correction guidance in the authenticated tenant', async () => {
    planningService.getShiftCorrectionGuidance.mockResolvedValue({
      availableActions: [],
    });

    await controller.getShiftCorrectionGuidance(req, 5);

    expect(planningService.getShiftCorrectionGuidance).toHaveBeenCalledWith(
      'tenant-a',
      5,
    );
  });

  it('reads alert correction guidance in the authenticated tenant', async () => {
    planningService.getAlertCorrectionGuidance.mockResolvedValue({
      availableActions: [],
    });

    await controller.getAlertCorrectionGuidance(req, 8);

    expect(planningService.getAlertCorrectionGuidance).toHaveBeenCalledWith(
      'tenant-a',
      8,
    );
  });

  it('suggests shift replacements through the auto scheduler', async () => {
    const shift = {
      id: 5,
      start: new Date('2026-01-12T08:00:00.000Z'),
      end: new Date('2026-01-12T16:00:00.000Z'),
      postId: 'URG',
    };
    const candidates = [{ id: 20, nom: 'Agent remplaçant' }];
    planningService.getShiftSuggestionContext.mockResolvedValue(shift);
    autoSchedulerService.findReplacements.mockResolvedValue(candidates);
    planningService.getShiftDecisionSuggestions.mockResolvedValue({
      replacements: [{ agentId: 20 }],
    });

    await controller.getShiftDecisionSuggestions(req, 5);

    expect(planningService.getShiftSuggestionContext).toHaveBeenCalledWith(
      'tenant-a',
      5,
    );
    expect(autoSchedulerService.findReplacements).toHaveBeenCalledWith(
      'tenant-a',
      shift.start,
      shift.end,
      'URG',
    );
    expect(planningService.getShiftDecisionSuggestions).toHaveBeenCalledWith(
      'tenant-a',
      5,
      candidates,
    );
  });

  it('revalidates a shift from the manager action path', async () => {
    planningService.revalidateShift.mockResolvedValue({
      validation: { isValid: true },
    });

    await controller.revalidateShift(req, 12);

    expect(planningService.revalidateShift).toHaveBeenCalledWith(
      'tenant-a',
      99,
      12,
    );
  });

  it('reassigns a shift from the manager action path', async () => {
    planningService.reassignShift.mockResolvedValue({ id: 12 });

    await controller.reassignShift(req, 12, { agentId: 77 });

    expect(planningService.reassignShift).toHaveBeenCalledWith(
      'tenant-a',
      99,
      12,
      77,
    );
  });

  it('requests a replacement from the manager action path', async () => {
    planningService.requestReplacement.mockResolvedValue({ id: 12 });

    await controller.requestReplacement(req, 12, {
      reason: 'Repos insuffisant',
    });

    expect(planningService.requestReplacement).toHaveBeenCalledWith(
      'tenant-a',
      99,
      12,
      'Repos insuffisant',
    );
  });

  it('resolves a planning alert from the manager action path', async () => {
    planningService.resolvePlanningAlert.mockResolvedValue({ id: 5 });

    await controller.resolvePlanningAlert(req, 5, { reason: 'Corrigé' });

    expect(planningService.resolvePlanningAlert).toHaveBeenCalledWith(
      'tenant-a',
      99,
      5,
      'Corrigé',
    );
  });

  it('approves a compliance exception with dedicated action path', async () => {
    planningService.approveShiftException.mockResolvedValue({ id: 12 });

    await controller.approveShiftException(req, 12, {
      reason: 'Continuité de service critique',
    });

    expect(planningService.approveShiftException).toHaveBeenCalledWith(
      'tenant-a',
      99,
      12,
      'Continuité de service critique',
    );
  });
});
