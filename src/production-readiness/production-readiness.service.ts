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

const DEFAULT_SLO_TARGETS = {
  availabilityPercent: 99.5,
  responseTimeP95Ms: 800,
  apiErrorRatePercent: 1,
  backupFreshnessHours: 24,
  planningCompliancePercent: 100,
};

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

export type SlaSloObjectiveKey =
  | 'availability'
  | 'responseTime'
  | 'apiErrors'
  | 'backupFreshness'
  | 'planningCompliance';

export type SlaSloObjectiveStatus = 'MET' | 'AT_RISK' | 'BREACHED' | 'UNKNOWN';

export type SlaSloContractStatus = 'SLO_MET' | 'SLO_AT_RISK' | 'SLO_BREACHED';

export interface SlaSloObjectiveTarget {
  operator: '>=' | '<=';
  value: number;
  unit: 'percent' | 'ms' | 'hours';
}

export interface SlaSloObjectiveSignal {
  value: number | null;
  unit: SlaSloObjectiveTarget['unit'];
  observedAt: string | null;
  source: string;
  evidenceUrl: string | null;
  details: Record<string, unknown>;
}

export interface SlaSloObjective {
  key: SlaSloObjectiveKey;
  label: string;
  target: SlaSloObjectiveTarget;
  actual: SlaSloObjectiveSignal;
  status: SlaSloObjectiveStatus;
  delta: number | null;
  breachReason: string | null;
}

export interface SlaSloContract {
  tenantId: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  status: SlaSloContractStatus;
  summary: {
    total: number;
    met: number;
    atRisk: number;
    breached: number;
    unknown: number;
    score: number;
  };
  objectives: Record<SlaSloObjectiveKey, SlaSloObjective>;
  blockers: string[];
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

  async getSlaSloContract(
    tenantId: string,
    period: { from?: Date; to?: Date } = {},
  ): Promise<SlaSloContract> {
    const window = this.resolveSlaWindow(period);
    const gates = await this.findPersistedGates(tenantId);

    const objectives = {
      availability: this.buildObjective(
        'availability',
        'Disponibilite applicative',
        {
          operator: '>=',
          value: this.readTargetNumber(
            'SLO_AVAILABILITY_TARGET_PERCENT',
            DEFAULT_SLO_TARGETS.availabilityPercent,
          ),
          unit: 'percent',
        },
        this.resolveMetricSignal(gates, {
          unit: 'percent',
          gateKeys: [ProductionGateKey.SMOKE, ProductionGateKey.AUDIT],
          snapshotFields: ['availabilityPercent', 'uptimePercent'],
          envNames: ['SLO_AVAILABILITY_PERCENT', 'API_AVAILABILITY_PERCENT'],
        }),
      ),
      responseTime: this.buildObjective(
        'responseTime',
        'Temps de reponse API p95',
        {
          operator: '<=',
          value: this.readTargetNumber(
            'SLO_RESPONSE_TIME_P95_TARGET_MS',
            DEFAULT_SLO_TARGETS.responseTimeP95Ms,
          ),
          unit: 'ms',
        },
        this.resolveMetricSignal(gates, {
          unit: 'ms',
          gateKeys: [ProductionGateKey.SMOKE],
          snapshotFields: [
            'responseTimeP95Ms',
            'p95ResponseMs',
            'apiP95ResponseMs',
          ],
          envNames: ['SLO_RESPONSE_TIME_P95_MS', 'API_RESPONSE_TIME_P95_MS'],
        }),
      ),
      apiErrors: this.buildObjective(
        'apiErrors',
        'Taux erreurs API',
        {
          operator: '<=',
          value: this.readTargetNumber(
            'SLO_API_ERROR_RATE_TARGET_PERCENT',
            DEFAULT_SLO_TARGETS.apiErrorRatePercent,
          ),
          unit: 'percent',
        },
        this.resolveMetricSignal(gates, {
          unit: 'percent',
          gateKeys: [ProductionGateKey.SMOKE, ProductionGateKey.AUDIT],
          snapshotFields: [
            'apiErrorRatePercent',
            'errorRatePercent',
            'http5xxRatePercent',
          ],
          envNames: ['SLO_API_ERROR_RATE_PERCENT', 'API_ERROR_RATE_PERCENT'],
        }),
      ),
      backupFreshness: this.buildObjective(
        'backupFreshness',
        'Fraicheur backup',
        {
          operator: '<=',
          value: this.readTargetNumber(
            'SLO_BACKUP_FRESHNESS_TARGET_HOURS',
            DEFAULT_SLO_TARGETS.backupFreshnessHours,
          ),
          unit: 'hours',
        },
        this.resolveBackupFreshnessSignal(gates, window.to),
      ),
      planningCompliance: this.buildObjective(
        'planningCompliance',
        'Conformite planning publie',
        {
          operator: '>=',
          value: this.readTargetNumber(
            'SLO_PLANNING_COMPLIANCE_TARGET_PERCENT',
            DEFAULT_SLO_TARGETS.planningCompliancePercent,
          ),
          unit: 'percent',
        },
        await this.resolvePlanningComplianceSignal(tenantId, window, gates),
      ),
    } satisfies Record<SlaSloObjectiveKey, SlaSloObjective>;
    const values = Object.values(objectives);
    const summary = {
      total: values.length,
      met: values.filter((objective) => objective.status === 'MET').length,
      atRisk: values.filter((objective) => objective.status === 'AT_RISK')
        .length,
      breached: values.filter((objective) => objective.status === 'BREACHED')
        .length,
      unknown: values.filter((objective) => objective.status === 'UNKNOWN')
        .length,
      score: Math.round(
        (values.filter((objective) => objective.status === 'MET').length /
          values.length) *
          100,
      ),
    };
    const blockers = values
      .filter((objective) => ['BREACHED', 'UNKNOWN'].includes(objective.status))
      .map(
        (objective) =>
          objective.breachReason || `${objective.label} is ${objective.status}`,
      );

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      period: {
        from: window.from.toISOString(),
        to: window.to.toISOString(),
      },
      status:
        summary.breached > 0
          ? 'SLO_BREACHED'
          : summary.atRisk > 0 || summary.unknown > 0
            ? 'SLO_AT_RISK'
            : 'SLO_MET',
      summary,
      objectives,
      blockers,
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

  private resolveSlaWindow(period: { from?: Date; to?: Date }) {
    const to = period.to || new Date();
    const from = period.from || new Date(to.getTime() - 24 * 60 * 60 * 1000);

    return { from, to };
  }

  private buildObjective(
    key: SlaSloObjectiveKey,
    label: string,
    target: SlaSloObjectiveTarget,
    actual: SlaSloObjectiveSignal,
  ): SlaSloObjective {
    if (actual.value === null) {
      return {
        key,
        label,
        target,
        actual,
        status: 'UNKNOWN',
        delta: null,
        breachReason: `${label}: signal indisponible`,
      };
    }

    const delta =
      target.operator === '>='
        ? actual.value - target.value
        : target.value - actual.value;
    const status = this.resolveObjectiveStatus(target, actual.value);

    return {
      key,
      label,
      target,
      actual,
      status,
      delta: this.roundMetric(delta),
      breachReason:
        status === 'BREACHED'
          ? `${label}: ${actual.value} ${target.unit} pour objectif ${target.operator} ${target.value} ${target.unit}`
          : null,
    };
  }

  private resolveObjectiveStatus(
    target: SlaSloObjectiveTarget,
    value: number,
  ): SlaSloObjectiveStatus {
    if (target.operator === '>=') {
      if (value >= target.value) return 'MET';
      if (value >= target.value * 0.98) return 'AT_RISK';
      return 'BREACHED';
    }

    if (value <= target.value) return 'MET';
    if (value <= target.value * 1.1) return 'AT_RISK';
    return 'BREACHED';
  }

  private resolveMetricSignal(
    gates: Map<ProductionGateKey, ProductionGate>,
    options: {
      unit: SlaSloObjectiveTarget['unit'];
      gateKeys: ProductionGateKey[];
      snapshotFields: string[];
      envNames: string[];
    },
  ): SlaSloObjectiveSignal {
    for (const gateKey of options.gateKeys) {
      const gate = gates.get(gateKey);
      const snapshot = gate?.snapshot;
      if (!snapshot) continue;

      for (const field of options.snapshotFields) {
        const value = this.toNumber(snapshot[field]);
        if (value === null) continue;

        return {
          value: this.roundMetric(value),
          unit: options.unit,
          observedAt: this.toIsoString(gate?.checkedAt),
          source: `production-gate:${gateKey}.snapshot.${field}`,
          evidenceUrl: gate?.evidenceUrl || null,
          details: { gateStatus: gate?.status },
        };
      }
    }

    for (const envName of options.envNames) {
      const value = this.toNumber(process.env[envName]);
      if (value === null) continue;

      return {
        value: this.roundMetric(value),
        unit: options.unit,
        observedAt: null,
        source: envName,
        evidenceUrl: null,
        details: {},
      };
    }

    return this.emptySignal(options.unit);
  }

  private resolveBackupFreshnessSignal(
    gates: Map<ProductionGateKey, ProductionGate>,
    observedTo: Date,
  ): SlaSloObjectiveSignal {
    const backupGate = gates.get(ProductionGateKey.BACKUP);
    const snapshot = backupGate?.snapshot;
    const snapshotFields = [
      'lastBackupAt',
      'lastSuccessfulBackupAt',
      'exportedAt',
      'generatedAt',
    ];

    if (snapshot) {
      for (const field of snapshotFields) {
        const lastBackupAt = this.toDate(snapshot[field]);
        if (!lastBackupAt) continue;

        return this.toBackupFreshnessSignal(
          lastBackupAt,
          observedTo,
          `production-gate:BACKUP.snapshot.${field}`,
          backupGate,
        );
      }
    }

    for (const envName of [
      'SLO_LAST_BACKUP_AT',
      'LAST_BACKUP_AT',
      'BACKUP_LAST_SUCCESS_AT',
    ]) {
      const lastBackupAt = this.toDate(process.env[envName]);
      if (!lastBackupAt) continue;

      return this.toBackupFreshnessSignal(lastBackupAt, observedTo, envName);
    }

    if (backupGate?.checkedAt) {
      return this.toBackupFreshnessSignal(
        backupGate.checkedAt,
        observedTo,
        'production-gate:BACKUP.checkedAt',
        backupGate,
      );
    }

    return this.emptySignal('hours');
  }

  private toBackupFreshnessSignal(
    lastBackupAt: Date,
    observedTo: Date,
    source: string,
    gate?: ProductionGate,
  ): SlaSloObjectiveSignal {
    const ageHours =
      (observedTo.getTime() - lastBackupAt.getTime()) / (60 * 60 * 1000);

    return {
      value: this.roundMetric(Math.max(ageHours, 0)),
      unit: 'hours',
      observedAt: lastBackupAt.toISOString(),
      source,
      evidenceUrl: gate?.evidenceUrl || null,
      details: {
        lastBackupAt: lastBackupAt.toISOString(),
        gateStatus: gate?.status,
      },
    };
  }

  private async resolvePlanningComplianceSignal(
    tenantId: string,
    period: { from: Date; to: Date },
    gates: Map<ProductionGateKey, ProductionGate>,
  ): Promise<SlaSloObjectiveSignal> {
    const publicationLogs = await this.auditService.getLogs(tenantId, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PLANNING,
      detailAction: 'PUBLISH_PLANNING',
      from: period.from,
      to: period.to,
      limit: 20,
    });
    const latestPublication = publicationLogs[0];
    if (latestPublication) {
      const details = this.toRecord(latestPublication.details);
      const report = this.toRecord(details.report);
      const totalPending = this.toNumber(report.totalPending);
      const rawViolations = report.violations;
      const violations = Array.isArray(rawViolations)
        ? rawViolations.length
        : 0;
      const blocked = Boolean(details.blocked);
      const complianceRate =
        totalPending && totalPending > 0
          ? ((totalPending - violations) / totalPending) * 100
          : blocked
            ? 0
            : 100;

      return {
        value: this.roundMetric(Math.max(0, complianceRate)),
        unit: 'percent',
        observedAt: this.toIsoString(latestPublication.timestamp),
        source: 'audit:PUBLISH_PLANNING',
        evidenceUrl: null,
        details: {
          auditLogId: latestPublication.id,
          blocked,
          totalPending,
          violations,
          affected: this.toNumber(details.affected) ?? 0,
        },
      };
    }

    return this.resolveMetricSignal(gates, {
      unit: 'percent',
      gateKeys: [ProductionGateKey.COMPLIANCE],
      snapshotFields: [
        'planningCompliancePercent',
        'publishedComplianceRate',
        'complianceRatePercent',
      ],
      envNames: [
        'SLO_PLANNING_COMPLIANCE_PERCENT',
        'PLANNING_COMPLIANCE_PERCENT',
      ],
    });
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

  private emptySignal(
    unit: SlaSloObjectiveTarget['unit'],
  ): SlaSloObjectiveSignal {
    return {
      value: null,
      unit,
      observedAt: null,
      source: 'UNAVAILABLE',
      evidenceUrl: null,
      details: {},
    };
  }

  private readTargetNumber(envName: string, fallback: number) {
    return this.toNumber(process.env[envName]) ?? fallback;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value !== 'string') {
      return null;
    }

    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value !== 'string') {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private toStringValue(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
  }

  private roundMetric(value: number) {
    return Math.round(value * 100) / 100;
  }

  private toHistoryEntry(log: AuditLog): ProductionSignoffHistoryEntry | null {
    const details = this.toRecord(log.details);
    const key = details.signoffKey as ProductionSignoffKey | undefined;
    const after = this.toRecord(details.after);
    if (!key || !Object.values(ProductionSignoffKey).includes(key)) {
      return null;
    }
    const status = after.status as ProductionSignoffStatus | undefined;

    return {
      auditLogId: log.id,
      chainSequence: log.chainSequence ?? null,
      eventHash: log.eventHash ?? null,
      key,
      action: this.toStringValue(details.action),
      decidedAt: this.toIsoString(log.timestamp) || new Date(0).toISOString(),
      actorId: log.actorId,
      actorName: this.resolveActorName(log.actor),
      status:
        status && Object.values(ProductionSignoffStatus).includes(status)
          ? status
          : null,
      signerName: this.toStringValue(after.signerName),
      signerRole: this.toStringValue(after.signerRole),
      signedById: this.toNumber(after.signedById),
      signedAt: this.toStringValue(after.signedAt),
      proofUrl: this.toStringValue(after.proofUrl),
      proofLabel: this.toStringValue(after.proofLabel),
      comment: this.toStringValue(after.comment),
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
