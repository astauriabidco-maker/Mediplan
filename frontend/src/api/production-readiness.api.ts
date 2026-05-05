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
export type ProductionGateStatusValue = 'PASSED' | 'FAILED' | 'UNKNOWN';

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
  key: string;
  status: ProductionGateStatusValue;
  source: string;
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

export interface UpsertProductionSignoffInput {
  status: ProductionSignoffStatus;
  signerName?: string;
  signerRole?: string;
  proofUrl?: string;
  proofLabel?: string;
  comment?: string;
}

export type UpsertProductionSignoffPayload = UpsertProductionSignoffInput;

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
};

export const fetchProductionDecision = productionReadinessApi.decision;
export const fetchProductionSignoffs = productionReadinessApi.signoffs;
export const upsertProductionSignoff = productionReadinessApi.updateSignoff;
