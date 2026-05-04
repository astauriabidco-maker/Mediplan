import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AgentAlert,
  AlertSeverity,
  AlertType,
} from '../agents/entities/agent-alert.entity';
import { ComplianceAlertService } from './compliance-alert.service';
import { ComplianceRuleCode } from './compliance-validation.types';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (data) => ({ id: data.id ?? 1, ...data })),
});

describe('ComplianceAlertService', () => {
  let service: ComplianceAlertService;
  let alertRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    alertRepository = createRepositoryMock();
    alertRepository.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAlertService,
        { provide: getRepositoryToken(AgentAlert), useValue: alertRepository },
      ],
    }).compile();

    service = module.get<ComplianceAlertService>(ComplianceAlertService);
    alertRepository.find.mockResolvedValue([]);
  });

  it('creates one open alert per managed compliance violation', async () => {
    await service.syncShiftAlerts('tenant-a', 10, {
      isValid: false,
      blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
      warnings: [],
      metadata: {
        [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
          current: 44,
          shift: 8,
          projected: 52,
          limit: 48,
        },
      },
    });

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agentId: 10,
        type: AlertType.QVT_FATIGUE,
        severity: AlertSeverity.HIGH,
        message: 'Non-conformité planning: Surcharge hebdomadaire détectée',
        isAcknowledged: false,
        isResolved: false,
        metadata: expect.objectContaining({
          ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          details: expect.objectContaining({ projected: 52, limit: 48 }),
        }),
      }),
    );
  });

  it('refreshes an existing open alert instead of duplicating it', async () => {
    const existingAlert = {
      id: 5,
      tenantId: 'tenant-a',
      agentId: 10,
      type: AlertType.COMPLIANCE,
      severity: AlertSeverity.HIGH,
      message:
        'Non-conformité planning: Certificat ou dossier de santé obligatoire expiré',
      metadata: {
        ruleCode: ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED,
      },
      isAcknowledged: false,
      isResolved: false,
    };
    alertRepository.find
      .mockResolvedValueOnce([existingAlert])
      .mockResolvedValue([]);

    await service.syncShiftAlerts('tenant-a', 10, {
      isValid: false,
      blockingReasons: [ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED],
      warnings: [],
      metadata: {
        [ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED]: {
          count: 1,
          recordIds: [12],
        },
      },
    });

    expect(alertRepository.save).toHaveBeenCalledTimes(1);
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        metadata: expect.objectContaining({
          ruleCode: ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED,
          details: { count: 1, recordIds: [12] },
        }),
      }),
    );
  });

  it('resolves open managed alerts when the validation no longer reports the rule', async () => {
    const existingAlert = {
      id: 8,
      tenantId: 'tenant-a',
      agentId: 10,
      type: AlertType.QVT_FATIGUE,
      severity: AlertSeverity.HIGH,
      message: 'Non-conformité planning: Repos minimum insuffisant avant garde',
      metadata: {
        ruleCode: ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
      },
      isAcknowledged: false,
      isResolved: false,
      resolvedAt: null,
      resolutionReason: null,
    };
    alertRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([existingAlert])
      .mockResolvedValue([]);

    await service.syncShiftAlerts('tenant-a', 10, {
      isValid: true,
      blockingReasons: [],
      warnings: [],
      metadata: {},
    });

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 8,
        isResolved: true,
        isAcknowledged: true,
        resolutionReason: 'Compliance rule recovered',
        resolvedAt: expect.any(Date),
      }),
    );
  });

  it('reopens a resolved managed alert when the violation returns', async () => {
    const resolvedAlert = {
      id: 13,
      tenantId: 'tenant-a',
      agentId: 10,
      type: AlertType.QVT_FATIGUE,
      severity: AlertSeverity.HIGH,
      message: 'Non-conformité planning: Surcharge hebdomadaire détectée',
      metadata: { ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED },
      isAcknowledged: true,
      isResolved: true,
      resolvedAt: new Date('2026-05-01T08:00:00.000Z'),
      resolutionReason: 'Compliance rule recovered',
    };
    alertRepository.find
      .mockResolvedValueOnce([resolvedAlert])
      .mockResolvedValue([]);

    await service.syncShiftAlerts('tenant-a', 10, {
      isValid: false,
      blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
      warnings: [],
      metadata: {
        [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
          projected: 52,
          limit: 48,
        },
      },
    });

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 13,
        isAcknowledged: false,
        isResolved: false,
        resolvedAt: null,
        resolutionReason: null,
        metadata: expect.objectContaining({
          ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
          reopenedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('closes duplicate open alerts while keeping one canonical alert active', async () => {
    const canonicalAlert = {
      id: 21,
      tenantId: 'tenant-a',
      agentId: 10,
      type: AlertType.QVT_FATIGUE,
      severity: AlertSeverity.HIGH,
      message: 'Non-conformité planning: Surcharge hebdomadaire détectée',
      metadata: { ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED },
      isAcknowledged: false,
      isResolved: false,
    };
    const duplicateAlert = {
      ...canonicalAlert,
      id: 22,
      metadata: {
        ruleCode: ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
        source: 'legacy-duplicate',
      },
    };
    alertRepository.find
      .mockResolvedValueOnce([canonicalAlert, duplicateAlert])
      .mockResolvedValue([]);

    await service.syncShiftAlerts('tenant-a', 10, {
      isValid: false,
      blockingReasons: [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED],
      warnings: [],
      metadata: {
        [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
          projected: 52,
          limit: 48,
        },
      },
    });

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 21,
        isAcknowledged: false,
        isResolved: false,
      }),
    );
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 22,
        isAcknowledged: true,
        isResolved: true,
        resolutionReason: 'Duplicate compliance alert closed',
        metadata: expect.objectContaining({
          duplicateOfAlertId: 21,
        }),
      }),
    );
  });
});
