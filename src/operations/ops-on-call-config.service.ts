import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import {
  CreateOpsOnCallConfigDto,
  OpsOnCallConfigQueryDto,
  UpdateOpsOnCallConfigDto,
} from './dto/ops-on-call-config.dto';
import { OpsOnCallConfig } from './entities/ops-on-call-config.entity';

@Injectable()
export class OpsOnCallConfigService {
  constructor(
    @InjectRepository(OpsOnCallConfig)
    private readonly onCallConfigRepository: Repository<OpsOnCallConfig>,
    private readonly auditService: AuditService,
  ) {}

  findTenantConfigs(tenantId: string, query: OpsOnCallConfigQueryDto = {}) {
    const activeAt = query.activeAt ? new Date(query.activeAt) : undefined;
    const qb = this.onCallConfigRepository
      .createQueryBuilder('config')
      .where('config.tenantId = :tenantId', { tenantId })
      .orderBy('config.priority', 'ASC')
      .addOrderBy('config.activeFrom', 'ASC', 'NULLS FIRST')
      .addOrderBy('config.id', 'ASC');

    if (query.role) {
      qb.andWhere('LOWER(config.role) = LOWER(:role)', { role: query.role });
    }

    if (activeAt) {
      this.addActiveWindowClause(qb, activeAt);
    }

    return qb.getMany();
  }

  async createTenantConfig(
    tenantId: string,
    dto: CreateOpsOnCallConfigDto,
    actorId: number,
  ) {
    const config = this.onCallConfigRepository.create({
      tenantId,
      role: this.normalizeRole(dto.role),
      recipients: this.normalizeRecipients(dto.recipients),
      activeFrom: this.toDateOrNull(dto.activeFrom),
      activeUntil: this.toDateOrNull(dto.activeUntil),
      priority: dto.priority ?? 100,
      enabled: dto.enabled ?? true,
      createdById: actorId,
      updatedById: null,
    });

    const savedConfig = await this.onCallConfigRepository.save(config);
    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.CREATE,
      AuditEntityType.PLANNING,
      `ops-on-call-config:${savedConfig.id}`,
      {
        action: 'CREATE_OPS_ON_CALL_CONFIG',
        onCallConfigId: savedConfig.id,
        before: null,
        after: this.toAuditSnapshot(savedConfig),
      },
    );

    return savedConfig;
  }

  async updateTenantConfig(
    tenantId: string,
    id: number,
    dto: UpdateOpsOnCallConfigDto,
    actorId: number,
  ) {
    const config = await this.onCallConfigRepository.findOne({
      where: { id, tenantId },
    });

    if (!config) {
      throw new NotFoundException('Ops on-call config not found');
    }

    const before = this.toAuditSnapshot(config);

    if (dto.role !== undefined) {
      config.role = this.normalizeRole(dto.role);
    }
    if (dto.recipients !== undefined) {
      config.recipients = this.normalizeRecipients(dto.recipients);
    }
    if (dto.activeFrom !== undefined) {
      config.activeFrom = this.toDateOrNull(dto.activeFrom);
    }
    if (dto.activeUntil !== undefined) {
      config.activeUntil = this.toDateOrNull(dto.activeUntil);
    }
    if (dto.priority !== undefined) {
      config.priority = dto.priority;
    }
    if (dto.enabled !== undefined) {
      config.enabled = dto.enabled;
    }
    config.updatedById = actorId;

    const savedConfig = await this.onCallConfigRepository.save(config);
    await this.auditService.log(
      tenantId,
      actorId,
      AuditAction.UPDATE,
      AuditEntityType.PLANNING,
      `ops-on-call-config:${savedConfig.id}`,
      {
        action: 'UPDATE_OPS_ON_CALL_CONFIG',
        onCallConfigId: savedConfig.id,
        before,
        after: this.toAuditSnapshot(savedConfig),
      },
    );

    return savedConfig;
  }

  async resolveRecipients(
    tenantId: string,
    roles: string[],
    activeAt = new Date(),
  ) {
    const normalizedRoles = Array.from(
      new Set(roles.map((role) => this.normalizeRole(role)).filter(Boolean)),
    );

    if (!normalizedRoles.length) {
      return [];
    }

    const configs = await this.onCallConfigRepository
      .createQueryBuilder('config')
      .where('config.tenantId = :tenantId', { tenantId })
      .andWhere('config.enabled = :enabled', { enabled: true })
      .andWhere('config.role IN (:...roles)', { roles: normalizedRoles })
      .orderBy('config.priority', 'ASC')
      .addOrderBy('config.activeFrom', 'ASC', 'NULLS FIRST')
      .addOrderBy('config.id', 'ASC');
    this.addActiveWindowClause(configs, activeAt);

    return Array.from(
      new Set(
        (await configs.getMany()).flatMap((config) =>
          this.normalizeRecipients(config.recipients),
        ),
      ),
    );
  }

  private addActiveWindowClause(
    qb: ReturnType<Repository<OpsOnCallConfig>['createQueryBuilder']>,
    activeAt: Date,
  ) {
    qb.andWhere(
      new Brackets((windowQb) => {
        windowQb
          .where('config.activeFrom IS NULL')
          .orWhere('config.activeFrom <= :activeAt', { activeAt });
      }),
    ).andWhere(
      new Brackets((windowQb) => {
        windowQb
          .where('config.activeUntil IS NULL')
          .orWhere('config.activeUntil > :activeAt', { activeAt });
      }),
    );
  }

  private normalizeRole(role: string) {
    return role.trim().toUpperCase();
  }

  private normalizeRecipients(recipients: string[]) {
    return Array.from(
      new Set(
        recipients
          .map((recipient) => recipient.trim())
          .filter((recipient) => recipient.length > 0),
      ),
    );
  }

  private toDateOrNull(value?: string | null) {
    return value ? new Date(value) : null;
  }

  private toAuditSnapshot(config: Partial<OpsOnCallConfig>) {
    return {
      id: config.id,
      role: config.role,
      priority: config.priority,
      enabled: config.enabled,
      activeFrom: config.activeFrom?.toISOString?.() ?? config.activeFrom ?? null,
      activeUntil:
        config.activeUntil?.toISOString?.() ?? config.activeUntil ?? null,
      recipientCount: config.recipients?.length ?? 0,
      createdById: config.createdById ?? null,
      updatedById: config.updatedById ?? null,
    };
  }
}
