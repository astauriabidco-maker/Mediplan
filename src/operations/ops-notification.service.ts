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
  OpsNotificationResolvedPolicy,
  OpsNotificationResult,
  OpsNotificationStatus,
} from './dto/ops-notification.dto';
import {
  OperationIncident,
  OperationIncidentSeverity,
} from './entities/operation-incident.entity';
import {
  OperationsJournalEntry,
  OperationsJournalEntrySeverity,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from './entities/operations-journal-entry.entity';
import { OpsOnCallConfigService } from './ops-on-call-config.service';

const SECRET_KEY_PATTERN =
  /(token|secret|password|authorization|apikey|api_key|webhook|url)/i;
const SECRET_VALUE_PATTERN =
  /(bearer\s+[a-z0-9._~+/=-]+|basic\s+[a-z0-9+/=-]+|api[_-]?key=|token=|password=|secret=|https?:\/\/\S*(token|secret|password|api[_-]?key)\S*)/i;
const DEFAULT_RECIPIENT_ROLE = 'OPS';
const DEFAULT_NOTIFICATION_POLICY: Record<
  OperationIncidentSeverity,
  Omit<OpsNotificationResolvedPolicy, 'severity' | 'tenant'>
> = {
  [OperationIncidentSeverity.LOW]: {
    channels: [OpsNotificationChannel.DRY_RUN],
    recipientRoles: [DEFAULT_RECIPIENT_ROLE],
    throttleWindowMs: 15 * 60 * 1000,
    dedupeWindowMs: 15 * 60 * 1000,
    repeatDelayMs: 6 * 60 * 60 * 1000,
  },
  [OperationIncidentSeverity.MEDIUM]: {
    channels: [OpsNotificationChannel.DRY_RUN],
    recipientRoles: [DEFAULT_RECIPIENT_ROLE],
    throttleWindowMs: 10 * 60 * 1000,
    dedupeWindowMs: 10 * 60 * 1000,
    repeatDelayMs: 2 * 60 * 60 * 1000,
  },
  [OperationIncidentSeverity.HIGH]: {
    channels: [OpsNotificationChannel.DRY_RUN],
    recipientRoles: [DEFAULT_RECIPIENT_ROLE, 'MANAGER'],
    throttleWindowMs: 5 * 60 * 1000,
    dedupeWindowMs: 5 * 60 * 1000,
    repeatDelayMs: 30 * 60 * 1000,
  },
  [OperationIncidentSeverity.CRITICAL]: {
    channels: [OpsNotificationChannel.DRY_RUN],
    recipientRoles: [DEFAULT_RECIPIENT_ROLE, 'MANAGER', 'ON_CALL'],
    throttleWindowMs: 60 * 1000,
    dedupeWindowMs: 60 * 1000,
    repeatDelayMs: 10 * 60 * 1000,
  },
};

type NotificationSuppression = {
  suppressedUntil: Date;
};

type NotificationWindowState = {
  lastSentAt: number;
  nextRepeatAt: number;
};

@Injectable()
export class OpsNotificationService {
  private readonly logger = new Logger(OpsNotificationService.name);
  private readonly httpClient = axios;
  private readonly notificationWindows = new Map<
    string,
    NotificationWindowState
  >();

  constructor(
    @InjectRepository(OperationsJournalEntry)
    private readonly journalRepository: Repository<OperationsJournalEntry>,
    private readonly configService: ConfigService,
    private readonly onCallConfigService: OpsOnCallConfigService,
  ) {}

  async notify(
    payload: OpsNotificationPayloadDto,
  ): Promise<OpsNotificationResult> {
    const normalizedPayload = {
      ...payload,
      status: payload.status ?? OpsNotificationStatus.PENDING,
    };
    const policy = this.resolvePolicy(normalizedPayload);
    const channels = this.resolveChannels(normalizedPayload.channels, policy);
    normalizedPayload.recipients = await this.resolveRecipients(
      normalizedPayload,
      policy,
    );
    const attempts: OpsNotificationAttempt[] = [];
    const suppression = this.resolveSuppression(normalizedPayload, policy);

    this.logger.log(
      `Ops notification attempt ${normalizedPayload.eventType}/${normalizedPayload.severity} for tenant ${normalizedPayload.tenant} via ${channels.join(',')}`,
    );

    if (suppression) {
      attempts.push(
        ...channels.map((channel) => ({
          channel,
          status: OpsNotificationStatus.THROTTLED,
          message: `Notification suppressed until ${suppression.suppressedUntil.toISOString()}`,
        })),
      );
    } else {
      for (const channel of channels) {
        attempts.push(await this.dispatch(channel, normalizedPayload));
      }
    }

    const status = this.resolveStatus(attempts);
    const journalEntry = await this.writeJournalEntry(normalizedPayload, {
      status,
      channels,
      attempts,
      journalEntryId: null,
      suppressedUntil: suppression?.suppressedUntil.toISOString(),
      policy,
    });

    const result = {
      status,
      channels,
      attempts,
      journalEntryId: journalEntry?.id ?? null,
      suppressedUntil: suppression?.suppressedUntil.toISOString(),
      policy,
    };

    if (!suppression && this.shouldTrackNotificationWindow(status)) {
      this.trackNotificationWindow(normalizedPayload, policy);
    }

    if (status === OpsNotificationStatus.FAILED) {
      this.logger.error(
        `Ops notification failed for tenant ${normalizedPayload.tenant}: ${normalizedPayload.title}`,
      );
    } else if (status === OpsNotificationStatus.THROTTLED) {
      this.logger.warn(
        `Ops notification throttled for tenant ${normalizedPayload.tenant}: ${normalizedPayload.title}`,
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
      reference: `operation-incident:${incident.id}`,
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
      reference: `operation-incident:${incident.id}`,
      status: OpsNotificationStatus.PENDING,
    });
  }

  private resolvePolicy(
    payload: OpsNotificationPayloadDto,
  ): OpsNotificationResolvedPolicy {
    const tenantKey = this.toEnvKey(payload.tenant);
    const severityKey = payload.severity;
    const base = DEFAULT_NOTIFICATION_POLICY[payload.severity];
    const legacyChannels = this.csvConfig('OPS_NOTIFICATION_CHANNELS');
    const globalChannels = this.csvConfig(
      `OPS_NOTIFICATION_${severityKey}_CHANNELS`,
    );
    const tenantChannels = this.csvConfig(
      `OPS_NOTIFICATION_TENANT_${tenantKey}_${severityKey}_CHANNELS`,
    );
    const globalRoles = this.stringListConfig(
      `OPS_NOTIFICATION_${severityKey}_RECIPIENT_ROLES`,
    );
    const tenantRoles = this.stringListConfig(
      `OPS_NOTIFICATION_TENANT_${tenantKey}_${severityKey}_RECIPIENT_ROLES`,
    );

    return {
      severity: payload.severity,
      tenant: payload.tenant,
      channels: tenantChannels.length
        ? tenantChannels
        : globalChannels.length
          ? globalChannels
          : legacyChannels.length
            ? legacyChannels
            : base.channels,
      recipientRoles: tenantRoles.length
        ? tenantRoles
        : globalRoles.length
          ? globalRoles
          : base.recipientRoles,
      throttleWindowMs: this.numberConfig(
        `OPS_NOTIFICATION_TENANT_${tenantKey}_${severityKey}_THROTTLE_WINDOW_MS`,
        this.numberConfig(
          `OPS_NOTIFICATION_${severityKey}_THROTTLE_WINDOW_MS`,
          base.throttleWindowMs,
        ),
      ),
      dedupeWindowMs: this.numberConfig(
        `OPS_NOTIFICATION_TENANT_${tenantKey}_${severityKey}_DEDUPE_WINDOW_MS`,
        this.numberConfig(
          `OPS_NOTIFICATION_${severityKey}_DEDUPE_WINDOW_MS`,
          base.dedupeWindowMs,
        ),
      ),
      repeatDelayMs: this.numberConfig(
        `OPS_NOTIFICATION_TENANT_${tenantKey}_${severityKey}_REPEAT_DELAY_MS`,
        this.numberConfig(
          `OPS_NOTIFICATION_${severityKey}_REPEAT_DELAY_MS`,
          base.repeatDelayMs,
        ),
      ),
    };
  }

  private resolveChannels(
    channels: OpsNotificationChannel[] | undefined,
    policy: OpsNotificationResolvedPolicy,
  ) {
    const requestedChannels =
      channels?.length && channels.length > 0 ? channels : policy.channels;

    const enabled = (
      requestedChannels.length
        ? requestedChannels
        : [OpsNotificationChannel.DRY_RUN]
    ).filter((channel) => this.isChannelAllowed(channel));

    return enabled.length ? enabled : [OpsNotificationChannel.DRY_RUN];
  }

  private async resolveRecipients(
    payload: OpsNotificationPayloadDto,
    policy: OpsNotificationResolvedPolicy,
  ) {
    const policyRoles = [
      ...policy.recipientRoles,
      ...(payload.recipientRoles ?? []),
    ];
    const configuredRecipients =
      await this.onCallConfigService.resolveRecipients(
        payload.tenant,
        policyRoles,
      );

    return Array.from(
      new Set([
        ...(payload.recipients ?? []),
        ...configuredRecipients,
        ...this.resolveEnvRecipientsByRole(payload.tenant, policyRoles),
      ]),
    );
  }

  private resolveEnvRecipientsByRole(tenant: string, roles: string[]) {
    const tenantKey = this.toEnvKey(tenant);
    return roles.flatMap((role) => {
      const roleKey = this.toEnvKey(role);
      return [
        ...this.stringListConfig(`OPS_NOTIFICATION_RECIPIENTS_${roleKey}`),
        ...this.stringListConfig(
          `OPS_NOTIFICATION_TENANT_${tenantKey}_RECIPIENTS_${roleKey}`,
        ),
      ];
    });
  }

  private resolveSuppression(
    payload: OpsNotificationPayloadDto,
    policy: OpsNotificationResolvedPolicy,
  ): NotificationSuppression | null {
    const key = this.notificationKey(payload);
    const state = this.notificationWindows.get(key);

    if (!state) {
      return null;
    }

    const now = Date.now();
    const throttleUntil = state.lastSentAt + policy.throttleWindowMs;
    const dedupeUntil = state.lastSentAt + policy.dedupeWindowMs;
    const suppressedUntil = Math.max(
      throttleUntil,
      dedupeUntil,
      state.nextRepeatAt,
    );

    if (now < suppressedUntil) {
      return {
        suppressedUntil: new Date(suppressedUntil),
      };
    }

    return null;
  }

  private shouldTrackNotificationWindow(status: OpsNotificationStatus) {
    return [
      OpsNotificationStatus.DRY_RUN,
      OpsNotificationStatus.SENT,
      OpsNotificationStatus.PARTIAL,
    ].includes(status);
  }

  private trackNotificationWindow(
    payload: OpsNotificationPayloadDto,
    policy: OpsNotificationResolvedPolicy,
  ) {
    const now = Date.now();
    this.notificationWindows.set(this.notificationKey(payload), {
      lastSentAt: now,
      nextRepeatAt: now + policy.repeatDelayMs,
    });
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
      recipientRoles: payload.recipientRoles ?? [],
      notificationPolicy: result.policy,
      suppressedUntil: result.suppressedUntil ?? null,
      payloadMetadata: payload.metadata ?? {},
    }) as Record<string, unknown>;
    const entry = this.journalRepository.create({
      tenantId: payload.tenant,
      type: OperationsJournalEntryType.NOTIFICATION,
      status: this.toJournalStatus(result.status),
      severity: this.toJournalSeverity(payload.severity),
      title: `Notification ops: ${this.safeJournalText(payload.title)}`,
      description: this.safeJournalText(payload.message),
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
      relatedReference: this.safeJournalReference(
        payload.reference ??
          (typeof payload.metadata?.incidentId === 'number'
            ? `operation-incident:${payload.metadata.incidentId}`
            : null),
      ),
      evidenceUrl: null,
      evidenceLabel: null,
      metadata,
    });

    return this.journalRepository.save(entry);
  }

  private resolveStatus(attempts: OpsNotificationAttempt[]) {
    if (
      attempts.every(
        (attempt) => attempt.status === OpsNotificationStatus.THROTTLED,
      )
    ) {
      return OpsNotificationStatus.THROTTLED;
    }
    if (
      attempts.every(
        (attempt) => attempt.status === OpsNotificationStatus.DRY_RUN,
      )
    ) {
      return OpsNotificationStatus.DRY_RUN;
    }
    if (
      attempts.every((attempt) => attempt.status === OpsNotificationStatus.SENT)
    ) {
      return OpsNotificationStatus.SENT;
    }
    if (
      attempts.some((attempt) => attempt.status === OpsNotificationStatus.SENT)
    ) {
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
      recipientRoles: payload.recipientRoles ?? [],
      source: payload.source,
      reference: payload.reference,
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

  private stringListConfig(key: string) {
    return (this.configService.get<string>(key) || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private numberConfig(key: string, fallback: number) {
    const value = this.configService.get<string | number>(key);
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN;

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private notificationKey(payload: OpsNotificationPayloadDto) {
    const metadataReference =
      payload.metadata?.reference ??
      payload.metadata?.source ??
      payload.metadata?.incidentId ??
      payload.metadata?.alertId;

    return [
      payload.tenant,
      payload.eventType,
      payload.severity,
      payload.source ?? payload.metadata?.source ?? 'ops',
      payload.reference ?? metadataReference ?? payload.title,
    ]
      .map((part) => this.notificationKeyPart(part))
      .join('|');
  }

  private notificationKeyPart(value: unknown) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value).trim().toLowerCase();
    }

    return JSON.stringify(this.redactSecrets(value) ?? 'unknown').toLowerCase();
  }

  private toEnvKey(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private toJournalStatus(status: OpsNotificationStatus) {
    if (
      status === OpsNotificationStatus.SENT ||
      status === OpsNotificationStatus.DRY_RUN ||
      status === OpsNotificationStatus.THROTTLED
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

  private safeJournalText(value: string) {
    const redacted = this.redactSecrets(value);
    return typeof redacted === 'string' ? redacted : '[REDACTED]';
  }

  private safeJournalReference(value: string | null) {
    if (!value) {
      return null;
    }

    return this.safeJournalText(value);
  }

  private redactSecrets(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactSecrets(item));
    }
    if (typeof value === 'string') {
      return SECRET_VALUE_PATTERN.test(value) ? '[REDACTED]' : value;
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
