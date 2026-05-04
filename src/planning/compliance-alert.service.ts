import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgentAlert,
  AlertSeverity,
  AlertType,
} from '../agents/entities/agent-alert.entity';
import {
  ComplianceRuleCode,
  ShiftValidationResult,
} from './compliance-validation.types';

const MANAGED_ALERT_RULES = [
  ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED,
  ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED,
  ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED,
  ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT,
  ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT,
] as const;

type ManagedAlertRuleCode = (typeof MANAGED_ALERT_RULES)[number];

const ALERT_DEFINITIONS: Record<
  ManagedAlertRuleCode,
  { type: AlertType; severity: AlertSeverity; message: string }
> = {
  [ComplianceRuleCode.MANDATORY_HEALTH_RECORD_EXPIRED]: {
    type: AlertType.COMPLIANCE,
    severity: AlertSeverity.HIGH,
    message: 'Certificat ou dossier de santé obligatoire expiré',
  },
  [ComplianceRuleCode.MANDATORY_COMPETENCY_EXPIRED]: {
    type: AlertType.GPEC,
    severity: AlertSeverity.HIGH,
    message: 'Compétence obligatoire expirée ou manquante',
  },
  [ComplianceRuleCode.WEEKLY_HOURS_LIMIT_EXCEEDED]: {
    type: AlertType.QVT_FATIGUE,
    severity: AlertSeverity.HIGH,
    message: 'Surcharge hebdomadaire détectée',
  },
  [ComplianceRuleCode.REST_TIME_BEFORE_SHIFT_TOO_SHORT]: {
    type: AlertType.QVT_FATIGUE,
    severity: AlertSeverity.HIGH,
    message: 'Repos minimum insuffisant avant garde',
  },
  [ComplianceRuleCode.REST_TIME_AFTER_SHIFT_TOO_SHORT]: {
    type: AlertType.QVT_FATIGUE,
    severity: AlertSeverity.HIGH,
    message: 'Repos minimum insuffisant après garde',
  },
};

@Injectable()
export class ComplianceAlertService {
  constructor(
    @InjectRepository(AgentAlert)
    private alertRepository: Repository<AgentAlert>,
  ) {}

  async syncShiftAlerts(
    tenantId: string,
    agentId: number,
    validation: ShiftValidationResult,
  ): Promise<void> {
    const activeRules = new Set(
      validation.blockingReasons.filter(
        (reason): reason is ManagedAlertRuleCode => this.isManagedRule(reason),
      ),
    );

    for (const ruleCode of activeRules) {
      await this.createOrRefreshAlert(
        tenantId,
        agentId,
        ruleCode,
        validation.metadata[ruleCode],
      );
    }

    await this.resolveRecoveredAlerts(tenantId, agentId, activeRules);
  }

  private async createOrRefreshAlert(
    tenantId: string,
    agentId: number,
    ruleCode: ManagedAlertRuleCode,
    details: unknown,
  ): Promise<void> {
    const definition = ALERT_DEFINITIONS[ruleCode];
    const message = this.getMessage(ruleCode);
    const candidates =
      (await this.alertRepository.find({
        where: {
          tenantId,
          agentId,
          type: definition.type,
          message,
        },
        order: { updatedAt: 'DESC', id: 'DESC' },
      })) ?? [];

    const metadata = {
      ruleCode,
      details,
      lastDetectedAt: new Date(),
    };

    const openAlerts = candidates.filter(
      (alert) => !alert.isAcknowledged && !alert.isResolved,
    );
    const existing = openAlerts[0] || candidates[0];

    if (existing) {
      const existingMetadata = this.getAlertMetadata(existing);
      existing.severity = definition.severity;
      existing.isAcknowledged = false;
      existing.isResolved = false;
      existing.resolvedAt = null;
      existing.resolutionReason = null;
      existing.metadata = {
        ...existingMetadata,
        ...metadata,
        reopenedAt:
          openAlerts.length === 0 && candidates.length > 0
            ? metadata.lastDetectedAt
            : existingMetadata.reopenedAt,
      };
      await this.alertRepository.save(existing);
      await this.resolveDuplicateOpenAlerts(
        openAlerts.slice(1),
        ruleCode,
        existing.id,
      );
      return;
    }

    await this.alertRepository.save({
      tenantId,
      agentId,
      type: definition.type,
      severity: definition.severity,
      message,
      metadata,
      isAcknowledged: false,
      isResolved: false,
    });
  }

  private async resolveRecoveredAlerts(
    tenantId: string,
    agentId: number,
    activeRules: Set<ManagedAlertRuleCode>,
  ): Promise<void> {
    for (const ruleCode of MANAGED_ALERT_RULES) {
      if (activeRules.has(ruleCode)) continue;

      const definition = ALERT_DEFINITIONS[ruleCode];
      const message = this.getMessage(ruleCode);
      const openAlerts =
        (await this.alertRepository.find({
          where: {
            tenantId,
            agentId,
            type: definition.type,
            message,
            isAcknowledged: false,
            isResolved: false,
          },
          order: { updatedAt: 'DESC', id: 'DESC' },
        })) ?? [];

      if (openAlerts.length === 0) continue;

      for (const existing of openAlerts) {
        const existingMetadata = this.getAlertMetadata(existing);
        existing.isResolved = true;
        existing.isAcknowledged = true;
        existing.resolvedAt = new Date();
        existing.resolutionReason = 'Compliance rule recovered';
        existing.metadata = {
          ...existingMetadata,
          resolvedRuleCode: ruleCode,
        };
        await this.alertRepository.save(existing);
      }
    }
  }

  private async resolveDuplicateOpenAlerts(
    alerts: AgentAlert[],
    ruleCode: ManagedAlertRuleCode,
    canonicalAlertId: number,
  ): Promise<void> {
    for (const duplicate of alerts) {
      const duplicateMetadata = this.getAlertMetadata(duplicate);
      duplicate.isResolved = true;
      duplicate.isAcknowledged = true;
      duplicate.resolvedAt = new Date();
      duplicate.resolutionReason = 'Duplicate compliance alert closed';
      duplicate.metadata = {
        ...duplicateMetadata,
        resolvedRuleCode: ruleCode,
        duplicateOfAlertId: canonicalAlertId,
      };
      await this.alertRepository.save(duplicate);
    }
  }

  private isManagedRule(
    ruleCode: ComplianceRuleCode,
  ): ruleCode is ManagedAlertRuleCode {
    return MANAGED_ALERT_RULES.includes(ruleCode as ManagedAlertRuleCode);
  }

  private getMessage(ruleCode: ManagedAlertRuleCode): string {
    return `Non-conformité planning: ${ALERT_DEFINITIONS[ruleCode].message}`;
  }

  private getAlertMetadata(alert: AgentAlert): Record<string, unknown> {
    const metadata = alert.metadata as unknown;
    return metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : {};
  }
}
