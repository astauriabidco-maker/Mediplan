import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit/entities/audit-log.entity';
import { UpsertProductionSignoffDto } from './dto/production-readiness.dto';
import {
  ProductionSignoff,
  ProductionSignoffKey,
  ProductionSignoffStatus,
} from './entities/production-signoff.entity';

export const REQUIRED_PRODUCTION_SIGNOFFS = [
  ProductionSignoffKey.HR,
  ProductionSignoffKey.SECURITY,
  ProductionSignoffKey.OPERATIONS,
  ProductionSignoffKey.TECHNICAL,
  ProductionSignoffKey.DIRECTION,
];

const REQUIRED_PRODUCTION_GATES = [
  'MIGRATION',
  'SEED',
  'SMOKE',
  'COMPLIANCE',
  'AUDIT',
  'BACKUP',
];

export interface ProductionGateStatus {
  key: string;
  status: 'PASSED' | 'FAILED' | 'UNKNOWN';
  source: string;
}

export interface ProductionDecision {
  tenantId: string;
  generatedAt: string;
  status: 'PROD_READY' | 'PROD_NO_GO';
  blockers: string[];
  signoffs: ProductionSignoff[];
  signoffSummary: {
    required: ProductionSignoffKey[];
    missing: ProductionSignoffKey[];
    pending: ProductionSignoffKey[];
    noGo: ProductionSignoffKey[];
    proofMissing: ProductionSignoffKey[];
  };
  gates: {
    freeze: ProductionGateStatus;
    checks: ProductionGateStatus[];
  };
}

@Injectable()
export class ProductionReadinessService {
  constructor(
    @InjectRepository(ProductionSignoff)
    private readonly signoffRepository: Repository<ProductionSignoff>,
    private readonly auditService: AuditService,
  ) {}

  findSignoffs(tenantId: string) {
    return this.signoffRepository.find({
      where: { tenantId },
      order: { key: 'ASC' },
    });
  }

  async upsertSignoff(
    tenantId: string,
    key: ProductionSignoffKey,
    dto: UpsertProductionSignoffDto,
    actorId: number,
  ) {
    const normalized = this.normalizeSignoffInput(dto);
    const existing = await this.signoffRepository.findOne({
      where: { tenantId, key },
    });
    const before = existing ? this.toAuditSnapshot(existing) : null;
    const signoff =
      existing ||
      this.signoffRepository.create({
        tenantId,
        key,
      });

    Object.assign(signoff, normalized, {
      signedById:
        normalized.status === ProductionSignoffStatus.PENDING ? null : actorId,
      signedAt:
        normalized.status === ProductionSignoffStatus.PENDING
          ? null
          : new Date(),
    });

    const savedSignoff = await this.signoffRepository.save(signoff);

    await this.auditService.log(
      tenantId,
      actorId,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      AuditEntityType.PLANNING,
      `production-signoff:${key}`,
      {
        action: existing
          ? 'UPDATE_PRODUCTION_SIGNOFF'
          : 'CREATE_PRODUCTION_SIGNOFF',
        signoffKey: key,
        before,
        after: this.toAuditSnapshot(savedSignoff),
      },
    );

    return savedSignoff;
  }

  async getDecision(tenantId: string): Promise<ProductionDecision> {
    const signoffs = await this.findSignoffs(tenantId);
    const byKey = new Map(signoffs.map((signoff) => [signoff.key, signoff]));
    const missing = REQUIRED_PRODUCTION_SIGNOFFS.filter(
      (key) => !byKey.has(key),
    );
    const pending = REQUIRED_PRODUCTION_SIGNOFFS.filter(
      (key) => byKey.get(key)?.status === ProductionSignoffStatus.PENDING,
    );
    const noGo = REQUIRED_PRODUCTION_SIGNOFFS.filter(
      (key) => byKey.get(key)?.status === ProductionSignoffStatus.NO_GO,
    );
    const proofMissing = REQUIRED_PRODUCTION_SIGNOFFS.filter((key) => {
      const signoff = byKey.get(key);
      return (
        signoff?.status === ProductionSignoffStatus.GO && !signoff.proofUrl
      );
    });
    const freeze = this.readGateStatus(
      'FREEZE',
      'PROD_FREEZE_STATUS',
      'FREEZE_READY',
    );
    const checks = REQUIRED_PRODUCTION_GATES.map((gate) =>
      this.readGateStatus(gate, `PROD_GATE_${gate}`, 'PASSED'),
    );
    const failedGates = [freeze, ...checks].filter(
      (gate) => gate.status !== 'PASSED',
    );
    const blockers = [
      ...missing.map((key) => `Missing ${key} signoff`),
      ...pending.map((key) => `Pending ${key} signoff`),
      ...noGo.map((key) => `${key} signoff is NO_GO`),
      ...proofMissing.map((key) => `${key} signoff has no proof URL`),
      ...failedGates.map((gate) => `${gate.key} gate is ${gate.status}`),
    ];

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      status: blockers.length === 0 ? 'PROD_READY' : 'PROD_NO_GO',
      blockers,
      signoffs,
      signoffSummary: {
        required: REQUIRED_PRODUCTION_SIGNOFFS,
        missing,
        pending,
        noGo,
        proofMissing,
      },
      gates: {
        freeze,
        checks,
      },
    };
  }

  private normalizeSignoffInput(dto: UpsertProductionSignoffDto) {
    const normalized = {
      status: dto.status,
      signerName: this.cleanOptional(dto.signerName),
      signerRole: this.cleanOptional(dto.signerRole),
      proofUrl: this.cleanOptional(dto.proofUrl),
      proofLabel: this.cleanOptional(dto.proofLabel),
      comment: this.cleanOptional(dto.comment),
    };

    if (
      normalized.status !== ProductionSignoffStatus.PENDING &&
      !normalized.signerName
    ) {
      throw new BadRequestException('signerName is required for GO/NO_GO');
    }

    if (
      normalized.status === ProductionSignoffStatus.GO &&
      !normalized.proofUrl
    ) {
      throw new BadRequestException('proofUrl is required for GO');
    }

    if (normalized.status === ProductionSignoffStatus.PENDING) {
      return {
        ...normalized,
        signerName: null,
        signerRole: null,
        proofUrl: null,
        proofLabel: null,
      };
    }

    return normalized;
  }

  private readGateStatus(
    key: string,
    envName: string,
    expectedValue: string,
  ): ProductionGateStatus {
    const value = process.env[envName];
    if (!value) {
      return { key, status: 'UNKNOWN', source: envName };
    }

    return {
      key,
      status: value === expectedValue ? 'PASSED' : 'FAILED',
      source: envName,
    };
  }

  private cleanOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toAuditSnapshot(signoff: ProductionSignoff) {
    return {
      key: signoff.key,
      status: signoff.status,
      signerName: signoff.signerName,
      signerRole: signoff.signerRole,
      proofUrl: signoff.proofUrl,
      proofLabel: signoff.proofLabel,
      signedById: signoff.signedById,
      signedAt: signoff.signedAt?.toISOString?.() || signoff.signedAt,
    };
  }
}
