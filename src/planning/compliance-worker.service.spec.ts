import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AgentAlert,
  AlertSeverity,
  AlertType,
} from '../agents/entities/agent-alert.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { Shift } from './entities/shift.entity';
import { ComplianceWorkerService } from './compliance-worker.service';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (data) => ({ id: data.id ?? 1, ...data })),
});

describe('ComplianceWorkerService', () => {
  let service: ComplianceWorkerService;
  let serviceRepository: ReturnType<typeof createRepositoryMock>;
  let shiftRepository: ReturnType<typeof createRepositoryMock>;
  let alertRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    serviceRepository = createRepositoryMock();
    shiftRepository = createRepositoryMock();
    alertRepository = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceWorkerService,
        {
          provide: getRepositoryToken(HospitalService),
          useValue: serviceRepository,
        },
        { provide: getRepositoryToken(Shift), useValue: shiftRepository },
        { provide: getRepositoryToken(AgentAlert), useValue: alertRepository },
        {
          provide: getRepositoryToken(AgentCompetency),
          useValue: createRepositoryMock(),
        },
      ],
    }).compile();

    service = module.get<ComplianceWorkerService>(ComplianceWorkerService);
    alertRepository.findOne.mockResolvedValue(null);
  });

  it('continues scanning other services when one service fails', async () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
    };
    Object.defineProperty(service, 'logger', { value: logger });

    serviceRepository.find.mockResolvedValue([
      {
        id: 1,
        tenantId: 'tenant-a',
        name: 'Urgences',
        chiefId: 101,
        coverageRules: { minStaffing: [{ jobTitle: 'IDE', minCount: 1 }] },
      },
      {
        id: 2,
        tenantId: 'tenant-a',
        name: 'Réanimation',
        chiefId: 102,
        coverageRules: { minStaffing: [{ jobTitle: 'IDE', minCount: 2 }] },
      },
    ]);
    shiftRepository.find
      .mockRejectedValueOnce(new Error('database timeout'))
      .mockResolvedValueOnce([]);

    await service.runDailyComplianceScan();

    expect(shiftRepository.find).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Compliance scan failed for service 1'),
      expect.stringContaining('database timeout'),
    );
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agentId: 102,
        type: AlertType.COMPLIANCE,
        severity: AlertSeverity.HIGH,
        isAcknowledged: false,
        isResolved: false,
        metadata: expect.objectContaining({
          serviceId: 2,
          lastDetectedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('refreshes an existing service coverage alert instead of duplicating it', async () => {
    const existingAlert = {
      id: 31,
      tenantId: 'tenant-a',
      agentId: 102,
      type: AlertType.COMPLIANCE,
      severity: AlertSeverity.HIGH,
      message:
        '⚠️ ALERTE CONFORMITÉ LÉGALE : Le service Réanimation ne respecte pas les règles de couverture minimum (IDE).',
      metadata: { serviceId: 2 },
      isAcknowledged: false,
      isResolved: false,
    };

    serviceRepository.find.mockResolvedValue([
      {
        id: 2,
        tenantId: 'tenant-a',
        name: 'Réanimation',
        chiefId: 102,
        coverageRules: { minStaffing: [{ jobTitle: 'IDE', minCount: 2 }] },
      },
    ]);
    shiftRepository.find.mockResolvedValue([]);
    alertRepository.findOne.mockResolvedValue(existingAlert);

    await service.runDailyComplianceScan();

    expect(alertRepository.save).toHaveBeenCalledTimes(1);
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 31,
        isAcknowledged: false,
        isResolved: false,
        metadata: expect.objectContaining({
          serviceId: 2,
          rule: expect.objectContaining({ jobTitle: 'IDE', minCount: 2 }),
          lastDetectedAt: expect.any(Date),
        }),
      }),
    );
  });
});
