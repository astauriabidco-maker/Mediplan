import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import {
  OpsNotificationAttempt,
  OpsNotificationChannel,
  OpsNotificationEventType,
  OpsNotificationPayloadDto,
  OpsNotificationResult,
  OpsNotificationStatus,
} from './dto/ops-notification.dto';
import { OperationIncident } from './entities/operation-incident.entity';
import {
  OperationsJournalEntry,
  OperationsJournalEntrySeverity,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from './entities/operations-journal-entry.entity';

const SECRET_KEY_PATTERN = /(token|secret|password|authorization|apikey|api_key|webhook|url)/i;

@Injectable()
export class OpsNotificationService {
  private readonly logger = new Logger(OpsNotificationService.name);
  private readonly httpClient = axios;

  constructor(
    @InjectRepository(OperationsJournalEntry)
    private readonly journalRepository: Repository<OperationsJournalEntry>,
    private readonly configService: ConfigService,
  ) {}

  async notify(
    payload: OpsNotificationPayloadDto,
  ): Promise<OpsNotificationResult> {
    const normalizedPayload = {
      ...payload,
      status: payload.status ?? OpsNotificationStatus.PENDING,
    };
    const channels = this.resolveChannels(normalizedPayload.channels);
    const attempts: OpsNotificationAttempt[] = [];

    this.logger.log(
      `Ops notification attempt ${normalizedPayload.eventType}/${normalizedPayload.severity} for tenant ${normalizedPayload.tenant} via ${channels.join(',')}`,
    );

    for (const channel of channels) {
      attempts.push(await this.dispatch(channel, normalizedPayload));
    }

    const status = this.resolveStatus(attempts);
    const journalEntry = await this.writeJournalEntry(normalizedPayload, {
      status,
      channels,
      attempts,
      journalEntryId: null,
    });

    const result = {
      status,
      channels,
      attempts,
      journalEntryId: journalEntry?.id ?? null,
    };

    if (status === OpsNotificationStatus.FAILED) {
      this.logger.error(
        `Ops notification failed for tenant ${normalizedPayload.tenant}: ${normalizedPayload.title}`,
      );
    } else {
      this.logger.log(
        `Ops notification ${status} for tenant ${normalizedPayload.tenant}: ${normalizedPayload.title}`,
      );
    }

    return result;
  }

  notifyIncidentDeclared(incident: OperationIncident) {
    return this.notify({
      tenant: incident.tenantId,
      severity: incident.severity,
      eventType: OpsNotificationEventType.INCIDENT,
      title: incident.title,
      message: incident.description,
      metadata: {
        incidentId: incident.id,
        status: incident.status,
        impactedService: incident.impactedService,
      },
      recipients: [],
      status: OpsNotificationStatus.PENDING,
    });
  }

  notifyIncidentEscalated(incident: OperationIncident) {
    return this.notify({
      tenant: incident.tenantId,
      severity: incident.severity,
      eventType: OpsNotificationEventType.ESCALATION,
      title: incident.title,
      message: incident.escalationReason || incident.description,
      metadata: {
        incidentId: incident.id,
        status: incident.status,
        escalatedToId: incident.escalatedToId,
        impactedService: incident.impactedService,
      },
      recipients: incident.escalatedToId
        ? [`user:${incident.escalatedToId}`]
        : [],
      status: OpsNotificationStatus.PENDING,
    });
  }

  private resolveChannels(channels?: OpsNotificationChannel[]) {
    const requestedChannels =
      channels?.length && channels.length > 0
        ? channels
        : this.csvConfig('OPS_NOTIFICATION_CHANNELS');

    const enabled = (requestedChannels.length
      ? requestedChannels
      : [OpsNotificationChannel.DRY_RUN]
    ).filter((channel) => this.isChannelAllowed(channel));

    return enabled.length ? enabled : [OpsNotificationChannel.DRY_RUN];
  }

  private isChannelAllowed(channel: OpsNotificationChannel) {
    if (
      channel === OpsNotificationChannel.DRY_RUN ||
      channel === OpsNotificationChannel.LOG
    ) {
      return true;
    }

    return Boolean(this.channelEndpoint(channel));
  }

  private async dispatch(
    channel: OpsNotificationChannel,
    payload: OpsNotificationPayloadDto,
  ): Promise<OpsNotificationAttempt> {
    try {
      if (channel === OpsNotificationChannel.DRY_RUN) {
        return {
          channel,
          status: OpsNotificationStatus.DRY_RUN,
          message: 'Dry-run notification recorded',
        };
      }

      if (channel === OpsNotificationChannel.LOG) {
        this.logger.warn(
          JSON.stringify({
            eventType: payload.eventType,
            severity: payload.severity,
            tenant: payload.tenant,
            title: payload.title,
            recipients: payload.recipients ?? [],
          }),
        );
        return {
          channel,
          status: OpsNotificationStatus.SENT,
          message: 'Notification logged',
        };
      }

      const endpoint = this.channelEndpoint(channel);
      if (!endpoint) {
        return {
          channel,
          status: OpsNotificationStatus.DRY_RUN,
          message: 'Channel configuration missing; dry-run fallback used',
        };
      }

      await this.httpClient.post(endpoint, this.toTransportPayload(payload), {
        timeout: this.configService.get<number>(
          'OPS_NOTIFICATION_TIMEOUT_MS',
          3000,
        ),
        headers: this.channelHeaders(channel),
      });

      return {
        channel,
        status: OpsNotificationStatus.SENT,
        message: 'Notification delivered',
      };
    } catch (error) {
      return {
        channel,
        status: OpsNotificationStatus.FAILED,
        message: this.safeErrorMessage(error),
      };
    }
  }

  private async writeJournalEntry(
    payload: OpsNotificationPayloadDto,
    result: OpsNotificationResult,
  ) {
    const metadata = this.redactSecrets({
      eventType: payload.eventType,
      notificationStatus: result.status,
      channels: result.channels,
      attempts: result.attempts,
      recipients: payload.recipients ?? [],
      payloadMetadata: payload.metadata ?? {},
    }) as Record<string, unknown>;
    const entry = this.journalRepository.create({
      tenantId: payload.tenant,
      type: OperationsJournalEntryType.NOTIFICATION,
      status: this.toJournalStatus(result.status),
      severity: this.toJournalSeverity(payload.severity),
      title: `Notification ops: ${payload.title}`,
      description: payload.message,
      occurredAt: new Date(),
      resolvedAt:
        result.status === OpsNotificationStatus.SENT ||
        result.status === OpsNotificationStatus.DRY_RUN
          ? new Date()
          : null,
      ownerId: null,
      createdById: 0,
      updatedById: null,
      auditLogId: null,
      relatedAuditLogId: null,
      relatedReference:
        typeof payload.metadata?.incidentId === 'number'
          ? `operation-incident:${payload.metadata.incidentId}`
          : null,
      evidenceUrl: null,
      evidenceLabel: null,
      metadata,
    });

    return this.journalRepository.save(entry);
  }

  private resolveStatus(attempts: OpsNotificationAttempt[]) {
    if (attempts.every((attempt) => attempt.status === OpsNotificationStatus.DRY_RUN)) {
      return OpsNotificationStatus.DRY_RUN;
    }
    if (attempts.every((attempt) => attempt.status === OpsNotificationStatus.SENT)) {
      return OpsNotificationStatus.SENT;
    }
    if (attempts.some((attempt) => attempt.status === OpsNotificationStatus.SENT)) {
      return OpsNotificationStatus.PARTIAL;
    }
    return OpsNotificationStatus.FAILED;
  }

  private toTransportPayload(payload: OpsNotificationPayloadDto) {
    return this.redactSecrets({
      tenant: payload.tenant,
      severity: payload.severity,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata ?? {},
      recipients: payload.recipients ?? [],
      status: payload.status ?? OpsNotificationStatus.PENDING,
    });
  }

  private channelEndpoint(channel: OpsNotificationChannel) {
    const configKeyByChannel: Record<OpsNotificationChannel, string | null> = {
      [OpsNotificationChannel.DRY_RUN]: null,
      [OpsNotificationChannel.LOG]: null,
      [OpsNotificationChannel.EMAIL]: 'OPS_NOTIFICATION_EMAIL_WEBHOOK_URL',
      [OpsNotificationChannel.WEBHOOK]: 'OPS_NOTIFICATION_WEBHOOK_URL',
      [OpsNotificationChannel.SLACK]: 'OPS_NOTIFICATION_SLACK_WEBHOOK_URL',
      [OpsNotificationChannel.TEAMS]: 'OPS_NOTIFICATION_TEAMS_WEBHOOK_URL',
    };
    const key = configKeyByChannel[channel];
    return key ? this.configService.get<string>(key) : null;
  }

  private channelHeaders(channel: OpsNotificationChannel) {
    const token = this.configService.get<string>('OPS_NOTIFICATION_TOKEN');
    return token
      ? {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-ops-notification-channel': channel,
        }
      : {
          'content-type': 'application/json',
          'x-ops-notification-channel': channel,
        };
  }

  private csvConfig(key: string) {
    return (this.configService.get<string>(key) || '')
      .split(',')
      .map((channel) => channel.trim().toUpperCase())
      .filter((channel): channel is OpsNotificationChannel =>
        Object.values(OpsNotificationChannel).includes(
          channel as OpsNotificationChannel,
        ),
      );
  }

  private toJournalStatus(status: OpsNotificationStatus) {
    if (
      status === OpsNotificationStatus.SENT ||
      status === OpsNotificationStatus.DRY_RUN
    ) {
      return OperationsJournalEntryStatus.RESOLVED;
    }
    if (status === OpsNotificationStatus.FAILED) {
      return OperationsJournalEntryStatus.OPEN;
    }
    return OperationsJournalEntryStatus.IN_PROGRESS;
  }

  private toJournalSeverity(severity: string) {
    if (
      Object.values(OperationsJournalEntrySeverity).includes(
        severity as OperationsJournalEntrySeverity,
      )
    ) {
      return severity as OperationsJournalEntrySeverity;
    }
    return OperationsJournalEntrySeverity.MEDIUM;
  }

  private redactSecrets(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactSecrets(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : this.redactSecrets(item),
      ]),
    );
  }

  private safeErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return this.redactUrl(error.message);
    }
    return 'Notification transport failed';
  }

  private redactUrl(message: string) {
    return message.replace(/https?:\/\/\S+/g, '[REDACTED_URL]');
  }
}
