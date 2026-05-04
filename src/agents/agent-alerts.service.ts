import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import {
  AgentAlert,
  AlertSeverity,
  AlertType,
} from './entities/agent-alert.entity';

export interface AgentAlertFilters {
  agentId?: number;
  type?: AlertType;
  severity?: AlertSeverity;
  isResolved?: boolean;
}

@Injectable()
export class AgentAlertsService {
  constructor(
    @InjectRepository(AgentAlert)
    private readonly alertRepository: Repository<AgentAlert>,
    private readonly auditService: AuditService,
  ) {}

  findAll(tenantId: string, filters: AgentAlertFilters = {}) {
    const where: FindOptionsWhere<AgentAlert> = { tenantId };

    if (filters.agentId !== undefined) where.agentId = filters.agentId;
    if (filters.type !== undefined) where.type = filters.type;
    if (filters.severity !== undefined) where.severity = filters.severity;
    if (filters.isResolved !== undefined) where.isResolved = filters.isResolved;

    return this.alertRepository.find({
      where,
      relations: ['agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: number) {
    const alert = await this.alertRepository.findOne({
      where: { id, tenantId },
      relations: ['agent'],
    });

    if (!alert) {
      throw new NotFoundException('Agent alert not found');
    }

    return alert;
  }

  async acknowledge(tenantId: string, id: number, actorId: number) {
    const alert = await this.findOne(tenantId, id);
    alert.isAcknowledged = true;

    const saved = await this.alertRepository.save(alert);
    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      alert.agentId.toString(),
      {
        action: 'ACKNOWLEDGE_AGENT_ALERT',
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
      },
    );

    return saved;
  }

  async resolve(
    tenantId: string,
    id: number,
    actorId: number,
    reason?: string,
  ) {
    const alert = await this.findOne(tenantId, id);
    alert.isResolved = true;
    alert.isAcknowledged = true;
    alert.resolvedAt = new Date();
    alert.resolutionReason = reason?.trim() || 'Resolved manually';

    const saved = await this.alertRepository.save(alert);
    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.AGENT,
      alert.agentId.toString(),
      {
        action: 'RESOLVE_AGENT_ALERT',
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        resolutionReason: alert.resolutionReason,
      },
    );

    return saved;
  }

  validateFilters(
    filters: Partial<Record<keyof AgentAlertFilters, unknown>>,
  ): AgentAlertFilters {
    const validated: AgentAlertFilters = {};

    if (filters.agentId !== undefined) {
      const agentId = Number(filters.agentId);
      if (!Number.isInteger(agentId) || agentId <= 0) {
        throw new BadRequestException('agentId must be a positive integer');
      }
      validated.agentId = agentId;
    }

    if (filters.type !== undefined) {
      if (!Object.values(AlertType).includes(filters.type as AlertType)) {
        throw new BadRequestException('Invalid alert type');
      }
      validated.type = filters.type as AlertType;
    }

    if (filters.severity !== undefined) {
      if (
        !Object.values(AlertSeverity).includes(
          filters.severity as AlertSeverity,
        )
      ) {
        throw new BadRequestException('Invalid alert severity');
      }
      validated.severity = filters.severity as AlertSeverity;
    }

    if (filters.isResolved !== undefined) {
      if (
        filters.isResolved !== true &&
        filters.isResolved !== false &&
        filters.isResolved !== 'true' &&
        filters.isResolved !== 'false'
      ) {
        throw new BadRequestException('isResolved must be true or false');
      }
      validated.isResolved =
        filters.isResolved === true || filters.isResolved === 'true';
    }

    return validated;
  }
}
