import api from './axios';

export const PRODUCTION_SIGNOFF_KEYS = [
  'HR',
  'SECURITY',
  'OPERATIONS',
  'TECHNICAL',
  'DIRECTION',
] as const;

export type ProductionSignoffKey = (typeof PRODUCTION_SIGNOFF_KEYS)[number];

export type ProductionSignoffStatus = 'PENDING' | 'GO' | 'NO_GO';
export type ProductionDecisionStatus = 'PROD_READY' | 'PROD_NO_GO';
export type ProductionReadinessStatus = ProductionDecisionStatus;
export type ProductionGateKey =
  | 'FREEZE'
  | 'MIGRATION'
  | 'SEED'
  | 'SMOKE'
  | 'COMPLIANCE'
  | 'AUDIT'
  | 'BACKUP';
export type ProductionGateStatusValue = 'PASSED' | 'FAILED' | 'UNKNOWN';
export type ProductionSignoffAuditAction =
  | 'CREATE_PRODUCTION_SIGNOFF'
  | 'UPDATE_PRODUCTION_SIGNOFF';

export interface ProductionReadinessTenantParams {
  tenantId?: string;
}

export interface ProductionSignoff {
  id?: number;
  tenantId: string;
  key: ProductionSignoffKey;
  status: ProductionSignoffStatus;
  signerName?: string | null;
  signerRole?: string | null;
  proofUrl?: string | null;
  proofLabel?: string | null;
  comment?: string | null;
  signedById?: number | null;
  signedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionGateStatus {
  key: ProductionGateKey;
  status: ProductionGateStatusValue;
  source: string;
  evidenceUrl?: string | null;
  checkedAt?: string | null;
}

export interface ProductionDecision {
  tenantId: string;
  generatedAt: string;
  status: ProductionDecisionStatus;
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
  action: ProductionSignoffAuditAction | string | null;
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

export interface UpsertProductionSignoffInput {
  status: ProductionSignoffStatus;
  signerName?: string;
  signerRole?: string;
  proofUrl?: string;
  proofLabel?: string;
  comment?: string;
}

export type UpsertProductionSignoffPayload = UpsertProductionSignoffInput;

export interface UpsertProductionGateInput {
  status: ProductionGateStatusValue;
  source?: string;
  evidenceUrl?: string;
  comment?: string;
  snapshot?: Record<string, unknown>;
  checkedAt?: string;
}

export type UpsertProductionGatePayload = UpsertProductionGateInput;

const asParams = (params?: ProductionReadinessTenantParams) => ({
  params,
});

export const productionReadinessApi = {
  decision: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionDecision> => {
    const response = await api.get<ProductionDecision>(
      '/api/production-readiness/decision',
      asParams(params),
    );
    return response.data;
  },

  getDecision: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionDecision> => {
    const response = await api.get<ProductionDecision>(
      '/api/production-readiness/decision',
      asParams(params),
    );
    return response.data;
  },

  signoffs: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionSignoff[]> => {
    const response = await api.get<ProductionSignoff[]>(
      '/api/production-readiness/signoffs',
      asParams(params),
    );
    return response.data;
  },

  getSignoffs: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionSignoff[]> => {
    const response = await api.get<ProductionSignoff[]>(
      '/api/production-readiness/signoffs',
      asParams(params),
    );
    return response.data;
  },

  signoffHistory: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionSignoffHistory> => {
    const response = await api.get<ProductionSignoffHistory>(
      '/api/production-readiness/signoffs/history',
      asParams(params),
    );
    return response.data;
  },

  getSignoffHistory: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionSignoffHistory> => {
    const response = await api.get<ProductionSignoffHistory>(
      '/api/production-readiness/signoffs/history',
      asParams(params),
    );
    return response.data;
  },

  gates: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionGateStatus[]> => {
    const response = await api.get<ProductionGateStatus[]>(
      '/api/production-readiness/gates',
      asParams(params),
    );
    return response.data;
  },

  getGates: async (
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionGateStatus[]> => {
    const response = await api.get<ProductionGateStatus[]>(
      '/api/production-readiness/gates',
      asParams(params),
    );
    return response.data;
  },

  updateSignoff: async (
    key: ProductionSignoffKey,
    payload: UpsertProductionSignoffPayload,
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionSignoff> => {
    const response = await api.patch<ProductionSignoff>(
      `/api/production-readiness/signoffs/${key}`,
      payload,
      asParams(params),
    );
    return response.data;
  },

  upsertSignoff: async (
    key: ProductionSignoffKey,
    payload: UpsertProductionSignoffPayload,
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionSignoff> => {
    const response = await api.patch<ProductionSignoff>(
      `/api/production-readiness/signoffs/${key}`,
      payload,
      asParams(params),
    );
    return response.data;
  },

  updateGate: async (
    key: ProductionGateKey,
    payload: UpsertProductionGatePayload,
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionGateStatus> => {
    const response = await api.patch<ProductionGateStatus>(
      `/api/production-readiness/gates/${key}`,
      payload,
      asParams(params),
    );
    return response.data;
  },

  upsertGate: async (
    key: ProductionGateKey,
    payload: UpsertProductionGatePayload,
    params?: ProductionReadinessTenantParams,
  ): Promise<ProductionGateStatus> => {
    const response = await api.patch<ProductionGateStatus>(
      `/api/production-readiness/gates/${key}`,
      payload,
      asParams(params),
    );
    return response.data;
  },
};

export const fetchProductionDecision = productionReadinessApi.decision;
export const fetchProductionSignoffs = productionReadinessApi.signoffs;
export const fetchProductionSignoffHistory =
  productionReadinessApi.signoffHistory;
export const upsertProductionSignoff = productionReadinessApi.updateSignoff;
export const fetchProductionGates = productionReadinessApi.gates;
export const upsertProductionGate = productionReadinessApi.updateGate;
