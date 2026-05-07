import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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

  createTenantConfig(
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

    return this.onCallConfigRepository.save(config);
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

    return this.onCallConfigRepository.save(config);
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
}
