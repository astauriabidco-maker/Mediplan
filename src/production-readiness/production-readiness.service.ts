import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
} from '../audit/entities/audit-log.entity';
import {
  UpsertProductionGateDto,
  UpsertProductionSignoffDto,
} from './dto/production-readiness.dto';
import {
  ProductionGate,
  ProductionGateKey,
  ProductionGateStatus as ProductionGateStatusValue,
} from './entities/production-gate.entity';
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
  ProductionGateKey.MIGRATION,
  ProductionGateKey.SEED,
  ProductionGateKey.SMOKE,
  ProductionGateKey.COMPLIANCE,
  ProductionGateKey.AUDIT,
  ProductionGateKey.BACKUP,
];

export const PRODUCTION_SIGNOFF_AUDIT_ACTIONS = [
  'CREATE_PRODUCTION_SIGNOFF',
  'UPDATE_PRODUCTION_SIGNOFF',
] as const;

export interface ProductionGateStatus {
  key: ProductionGateKey;
  status: ProductionGateStatusValue;
  source: string;
  evidenceUrl: string | null;
  comment: string | null;
  snapshot: Record<string, unknown> | null;
  checkedAt: string | null;
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

export interface ProductionSignoffHistoryEntry {
  auditLogId: number;
  chainSequence: number | null;
  eventHash: string | null;
  key: ProductionSignoffKey;
  action: string | null;
  decidedAt: string;
  actorId: number;
  actorName: string | null;
  status: ProductionSignoffStatus | null;
  signerName: string | null;
  signerRole: string | null;
  signedById: number | null;
  signedAt: string | null;
  proofUrl: string | null;
  proofLabel: string | null;
  comment: string | null;
}

export interface ProductionSignoffHistory {
  tenantId: string;
  generatedAt: string;
  decision: ProductionDecision;
  entries: ProductionSignoffHistoryEntry[];
  byRole: Record<ProductionSignoffKey, ProductionSignoffHistoryEntry[]>;
}

@Injectable()
export class ProductionReadinessService {
  constructor(
    @InjectRepository(ProductionSignoff)
    private readonly signoffRepository: Repository<ProductionSignoff>,
    @InjectRepository(ProductionGate)
    private readonly gateRepository: Repository<ProductionGate>,
    private readonly auditService: AuditService,
  ) {}

  findSignoffs(tenantId: string) {
    return this.signoffRepository.find({
      where: { tenantId },
      order: { key: 'ASC' },
    });
  }

  async findGates(tenantId: string): Promise<ProductionGateStatus[]> {
    const gates = await this.findPersistedGates(tenantId);

    return [
      this.resolveGateStatus(
        ProductionGateKey.FREEZE,
        gates.get(ProductionGateKey.FREEZE),
        'PROD_FREEZE_STATUS',
        'FREEZE_READY',
      ),
      ...REQUIRED_PRODUCTION_GATES.map((gate) =>
        this.resolveGateStatus(
          gate,
          gates.get(gate),
          `PROD_GATE_${gate}`,
          ProductionGateStatusValue.PASSED,
        ),
      ),
    ];
  }

  async upsertGate(
    tenantId: string,
    key: ProductionGateKey,
    dto: UpsertProductionGateDto,
    actorId: number,
  ) {
    const normalized = this.normalizeGateInput(dto);
    const existing = await this.gateRepository.findOne({
      where: { tenantId, key },
    });
    const before = existing ? this.toGateAuditSnapshot(existing) : null;
    const gate =
      existing ||
      this.gateRepository.create({
        tenantId,
        key,
      });

    Object.assign(gate, normalized, {
      updatedById: actorId,
    });

    const savedGate = await this.gateRepository.save(gate);

    await this.auditService.log(
      tenantId,
      actorId,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      AuditEntityType.PLANNING,
      `production-gate:${key}`,
      {
        action: existing ? 'UPDATE_PRODUCTION_GATE' : 'CREATE_PRODUCTION_GATE',
        gateKey: key,
        before,
        after: this.toGateAuditSnapshot(savedGate),
      },
    );

    return savedGate;
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
    const [signoffs, gates] = await Promise.all([
      this.findSignoffs(tenantId),
      this.findPersistedGates(tenantId),
    ]);
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
    const freeze = this.resolveGateStatus(
      ProductionGateKey.FREEZE,
      gates.get(ProductionGateKey.FREEZE),
      'PROD_FREEZE_STATUS',
      'FREEZE_READY',
    );
    const checks = REQUIRED_PRODUCTION_GATES.map((gate) =>
      this.resolveGateStatus(
        gate,
        gates.get(gate),
        `PROD_GATE_${gate}`,
        ProductionGateStatusValue.PASSED,
      ),
    );
    const failedGates = [freeze, ...checks].filter(
      (gate) => gate.status !== ProductionGateStatusValue.PASSED,
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

  async getSignoffHistory(tenantId: string): Promise<ProductionSignoffHistory> {
    const [decision, logs] = await Promise.all([
      this.getDecision(tenantId),
      this.auditService.getLogs(tenantId, {
        entityType: AuditEntityType.PLANNING,
        detailActions: [...PRODUCTION_SIGNOFF_AUDIT_ACTIONS],
        limit: 500,
      }),
    ]);
    const entries = logs
      .map((log) => this.toHistoryEntry(log))
      .filter((entry): entry is ProductionSignoffHistoryEntry => !!entry)
      .sort(
        (left, right) =>
          new Date(right.decidedAt).getTime() -
          new Date(left.decidedAt).getTime(),
      );
    const byRole = Object.fromEntries(
      REQUIRED_PRODUCTION_SIGNOFFS.map((key) => [
        key,
        entries.filter((entry) => entry.key === key),
      ]),
    ) as Record<ProductionSignoffKey, ProductionSignoffHistoryEntry[]>;

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      decision,
      entries,
      byRole,
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

  private normalizeGateInput(dto: UpsertProductionGateDto) {
    return {
      status: dto.status,
      source: this.cleanOptional(dto.source) || 'APPLICATION',
      evidenceUrl: this.cleanOptional(dto.evidenceUrl),
      comment: this.cleanOptional(dto.comment),
      snapshot: dto.snapshot ?? null,
      checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : new Date(),
    };
  }

  private async findPersistedGates(tenantId: string) {
    const gates = await this.gateRepository.find({
      where: { tenantId },
      order: { key: 'ASC' },
    });

    return new Map(gates.map((gate) => [gate.key, gate]));
  }

  private resolveGateStatus(
    key: ProductionGateKey,
    persistedGate: ProductionGate | undefined,
    envName: string,
    expectedValue: string,
  ): ProductionGateStatus {
    if (persistedGate) {
      return {
        key,
        status: persistedGate.status,
        source: persistedGate.source || 'APPLICATION',
        evidenceUrl: persistedGate.evidenceUrl,
        comment: persistedGate.comment,
        snapshot: persistedGate.snapshot,
        checkedAt: this.toIsoString(persistedGate.checkedAt),
      };
    }

    const value = process.env[envName];
    if (!value) {
      return {
        key,
        status: ProductionGateStatusValue.UNKNOWN,
        source: envName,
        evidenceUrl: null,
        comment: null,
        snapshot: null,
        checkedAt: null,
      };
    }

    return {
      key,
      status:
        value === expectedValue
          ? ProductionGateStatusValue.PASSED
          : ProductionGateStatusValue.FAILED,
      source: envName,
      evidenceUrl: null,
      comment: null,
      snapshot: null,
      checkedAt: null,
    };
  }

  private cleanOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toHistoryEntry(log: AuditLog): ProductionSignoffHistoryEntry | null {
    const details = log.details || {};
    const key = details.signoffKey as ProductionSignoffKey | undefined;
    const after = details.after || {};
    if (!key || !Object.values(ProductionSignoffKey).includes(key)) {
      return null;
    }

    return {
      auditLogId: log.id,
      chainSequence: log.chainSequence ?? null,
      eventHash: log.eventHash ?? null,
      key,
      action: details.action || null,
      decidedAt: this.toIsoString(log.timestamp) || new Date(0).toISOString(),
      actorId: log.actorId,
      actorName: this.resolveActorName(log.actor),
      status: after.status || null,
      signerName: after.signerName || null,
      signerRole: after.signerRole || null,
      signedById: after.signedById ?? null,
      signedAt: after.signedAt || null,
      proofUrl: after.proofUrl || null,
      proofLabel: after.proofLabel || null,
      comment: after.comment || null,
    };
  }

  private resolveActorName(actor?: AuditLog['actor']) {
    if (!actor) return null;
    return (
      actor.nom ||
      [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
      null
    );
  }

  private toIsoString(value?: Date | string | null) {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  }

  private toAuditSnapshot(signoff: ProductionSignoff) {
    return {
      key: signoff.key,
      status: signoff.status,
      signerName: signoff.signerName,
      signerRole: signoff.signerRole,
      proofUrl: signoff.proofUrl,
      proofLabel: signoff.proofLabel,
      comment: signoff.comment,
      signedById: signoff.signedById,
      signedAt: signoff.signedAt?.toISOString?.() || signoff.signedAt,
    };
  }

  private toGateAuditSnapshot(gate: ProductionGate) {
    return {
      key: gate.key,
      status: gate.status,
      source: gate.source,
      evidenceUrl: gate.evidenceUrl,
      comment: gate.comment,
      snapshot: gate.snapshot,
      updatedById: gate.updatedById,
      checkedAt: gate.checkedAt?.toISOString?.() || gate.checkedAt,
    };
  }
}
