import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AgentAlertsService } from './agent-alerts.service';
import {
  AgentAlert,
  AlertSeverity,
  AlertType,
} from './entities/agent-alert.entity';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { Agent } from './entities/agent.entity';

type AlertRepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock<Promise<AgentAlert>, [AgentAlert]>;
};

describe('AgentAlertsService', () => {
  let service: AgentAlertsService;
  let alertRepository: AlertRepositoryMock;
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    alertRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((alert: AgentAlert) => Promise.resolve(alert)),
    };
    auditService = { log: jest.fn() };
    service = new AgentAlertsService(
      alertRepository as unknown as Repository<AgentAlert>,
      auditService as unknown as AuditService,
    );
  });

  it('lists alerts inside the requested tenant with optional filters', async () => {
    alertRepository.find.mockResolvedValue([]);

    await service.findAll('tenant-a', {
      agentId: 12,
      type: AlertType.COMPLIANCE,
      severity: AlertSeverity.HIGH,
      isResolved: false,
    });

    expect(alertRepository.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-a',
        agentId: 12,
        type: AlertType.COMPLIANCE,
        severity: AlertSeverity.HIGH,
        isResolved: false,
      },
      relations: ['agent'],
      order: { createdAt: 'DESC' },
    });
  });

  it('loads one alert by id and tenant only', async () => {
    alertRepository.findOne.mockResolvedValue({ id: 7, tenantId: 'tenant-a' });

    await expect(service.findOne('tenant-a', 7)).resolves.toMatchObject({
      id: 7,
    });

    expect(alertRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7, tenantId: 'tenant-a' },
      relations: ['agent'],
    });
  });

  it('throws when an alert does not belong to the tenant', async () => {
    alertRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('tenant-a', 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('acknowledges an alert and audits the action', async () => {
    const alert = createAlert({ id: 5, agentId: 99 });
    alertRepository.findOne.mockResolvedValue(alert);

    await service.acknowledge('tenant-a', 5, 42);

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        isAcknowledged: true,
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      '99',
      expect.objectContaining({
        action: 'ACKNOWLEDGE_AGENT_ALERT',
        alertId: 5,
      }),
    );
  });

  it('resolves an alert, closes it and audits the reason', async () => {
    const alert = createAlert({ id: 6, agentId: 88 });
    alertRepository.findOne.mockResolvedValue(alert);

    const saved = await service.resolve(
      'tenant-a',
      6,
      43,
      'Situation régularisée',
    );

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 6,
        isAcknowledged: true,
        isResolved: true,
        resolutionReason: 'Situation régularisée',
      }),
    );
    expect(saved.resolvedAt).toBeInstanceOf(Date);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      43,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      '88',
      expect.objectContaining({
        action: 'RESOLVE_AGENT_ALERT',
        resolutionReason: 'Situation régularisée',
      }),
    );
  });

  it('validates supported filters', () => {
    expect(
      service.validateFilters({
        agentId: '3',
        type: AlertType.GPEC,
        severity: AlertSeverity.MEDIUM,
        isResolved: 'true',
      }),
    ).toEqual({
      agentId: 3,
      type: AlertType.GPEC,
      severity: AlertSeverity.MEDIUM,
      isResolved: true,
    });
  });

  it('rejects invalid filters', () => {
    expect(() => service.validateFilters({ agentId: 'bad' })).toThrow(
      BadRequestException,
    );
    expect(() => service.validateFilters({ type: 'UNKNOWN' })).toThrow(
      BadRequestException,
    );
    expect(() => service.validateFilters({ severity: 'CRITICAL' })).toThrow(
      BadRequestException,
    );
    expect(() => service.validateFilters({ isResolved: 'yes' })).toThrow(
      BadRequestException,
    );
  });
});

function createAlert(overrides: Partial<AgentAlert> = {}): AgentAlert {
  return {
    id: 1,
    tenantId: 'tenant-a',
    agentId: 10,
    type: AlertType.COMPLIANCE,
    severity: AlertSeverity.HIGH,
    message: 'Non-conformité planning',
    metadata: {},
    isAcknowledged: false,
    isResolved: false,
    resolvedAt: null,
    resolutionReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    agent: undefined as unknown as Agent,
    ...overrides,
  };
}
