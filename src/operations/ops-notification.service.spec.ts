import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios from 'axios';
import {
  OpsNotificationChannel,
  OpsNotificationEventType,
  OpsNotificationStatus,
} from './dto/ops-notification.dto';
import {
  OperationIncident,
  OperationIncidentSeverity,
  OperationIncidentStatus,
} from './entities/operation-incident.entity';
import {
  OperationsJournalEntry,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from './entities/operations-journal-entry.entity';
import { OpsNotificationService } from './ops-notification.service';

jest.mock('axios', () => ({
  post: jest.fn(),
}));

type RepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
};

const createRepositoryMock = (): RepositoryMock => ({
  create: jest.fn((entity: Partial<OperationsJournalEntry>) => entity),
  save: jest.fn((entity: Partial<OperationsJournalEntry>) =>
    Promise.resolve({ id: entity.id ?? 21, ...entity }),
  ),
});

const createConfigService = (values: Record<string, unknown> = {}) => ({
  get: jest.fn((key: string, defaultValue?: unknown) =>
    key in values ? values[key] : defaultValue,
  ),
});

describe('OpsNotificationService', () => {
  let service: OpsNotificationService;
  let journalRepository: RepositoryMock;
  let configService: ReturnType<typeof createConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    journalRepository = createRepositoryMock();
    configService = createConfigService();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpsNotificationService,
        {
          provide: getRepositoryToken(OperationsJournalEntry),
          useValue: journalRepository,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(OpsNotificationService);
  });

  it('defaults to dry-run and records a sanitized operations journal trace', async () => {
    const result = await service.notify({
      tenant: 'tenant-a',
      severity: OperationIncidentSeverity.CRITICAL,
      eventType: OpsNotificationEventType.ALERT,
      title: 'Erreur publication planning',
      message: 'Panne post-prod detectee',
      metadata: {
        alertId: 77,
        webhookUrl: 'https://hooks.example.test/secret-token',
        nested: { apiToken: 'sensitive' },
      },
      recipients: ['ops@mediplan.test'],
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: OpsNotificationStatus.DRY_RUN,
        channels: [OpsNotificationChannel.DRY_RUN],
        journalEntryId: 21,
      }),
    );
    expect(axios.post).not.toHaveBeenCalled();
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        type: OperationsJournalEntryType.NOTIFICATION,
        status: OperationsJournalEntryStatus.RESOLVED,
        metadata: expect.objectContaining({
          notificationStatus: OpsNotificationStatus.DRY_RUN,
          payloadMetadata: expect.objectContaining({
            webhookUrl: '[REDACTED]',
            nested: { apiToken: '[REDACTED]' },
          }),
        }),
      }),
    );
  });

  it('uses configured webhook channels without exposing transport secrets', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ status: 200 });
    configService = createConfigService({
      OPS_NOTIFICATION_CHANNELS: 'webhook,slack',
      OPS_NOTIFICATION_WEBHOOK_URL: 'https://ops.example.test/hook',
      OPS_NOTIFICATION_SLACK_WEBHOOK_URL: 'https://slack.example.test/hook',
      OPS_NOTIFICATION_TOKEN: 'super-secret',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpsNotificationService,
        {
          provide: getRepositoryToken(OperationsJournalEntry),
          useValue: journalRepository,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = moduleRef.get(OpsNotificationService);

    const result = await service.notify({
      tenant: 'tenant-a',
      severity: OperationIncidentSeverity.HIGH,
      eventType: OpsNotificationEventType.ESCALATION,
      title: 'Escalade incident planning',
      message: 'Escalade astreinte L2',
      metadata: { incidentId: 12 },
      recipients: ['user:88'],
    });

    expect(result.status).toBe(OpsNotificationStatus.SENT);
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledWith(
      'https://ops.example.test/hook',
      expect.objectContaining({
        metadata: { incidentId: 12 },
        recipients: ['user:88'],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer super-secret',
        }),
      }),
    );
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        relatedReference: 'operation-incident:12',
        metadata: expect.not.stringContaining('super-secret'),
      }),
    );
  });

  it('returns partial status when one configured channel fails', async () => {
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ status: 200 })
      .mockRejectedValueOnce(
        new Error('connect ECONNREFUSED https://teams.example.test/secret'),
      );
    configService = createConfigService({
      OPS_NOTIFICATION_CHANNELS: 'webhook,teams',
      OPS_NOTIFICATION_WEBHOOK_URL: 'https://ops.example.test/hook',
      OPS_NOTIFICATION_TEAMS_WEBHOOK_URL: 'https://teams.example.test/hook',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpsNotificationService,
        {
          provide: getRepositoryToken(OperationsJournalEntry),
          useValue: journalRepository,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = moduleRef.get(OpsNotificationService);

    const result = await service.notify({
      tenant: 'tenant-a',
      severity: OperationIncidentSeverity.HIGH,
      eventType: OpsNotificationEventType.INCIDENT,
      title: 'Incident API',
      message: 'API degradee',
    });

    expect(result.status).toBe(OpsNotificationStatus.PARTIAL);
    expect(result.attempts).toEqual([
      expect.objectContaining({ status: OpsNotificationStatus.SENT }),
      expect.objectContaining({
        status: OpsNotificationStatus.FAILED,
        message: 'connect ECONNREFUSED [REDACTED_URL]',
      }),
    ]);
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OperationsJournalEntryStatus.IN_PROGRESS,
      }),
    );
  });

  it('builds incident escalation payloads for reuse by incident flows', async () => {
    const incident = {
      id: 12,
      tenantId: 'tenant-a',
      title: 'API planning indisponible',
      description: 'Erreur 500',
      severity: OperationIncidentSeverity.CRITICAL,
      status: OperationIncidentStatus.ESCALATED,
      impactedService: 'planning',
      escalatedToId: 88,
      escalationReason: 'Impact patient potentiel',
    } as OperationIncident;

    const result = await service.notifyIncidentEscalated(incident);

    expect(result.status).toBe(OpsNotificationStatus.DRY_RUN);
    expect(journalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        relatedReference: 'operation-incident:12',
        metadata: expect.objectContaining({
          eventType: OpsNotificationEventType.ESCALATION,
          recipients: ['user:88'],
          payloadMetadata: expect.objectContaining({
            incidentId: 12,
            escalatedToId: 88,
          }),
        }),
      }),
    );
  });
});
