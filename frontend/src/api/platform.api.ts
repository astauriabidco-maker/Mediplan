import type { AxiosRequestConfig } from 'axios';
import api from './axios';
import type { OpsMultiTenantSummaryResponse } from './ops.api';

export interface PlatformTenant {
  id: string;
  name: string;
  region: string | null;
  contactEmail: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string | null;
}

export interface PlatformTenantUser {
  id: number;
  email: string;
  nom: string;
  role: string;
  status: string;
  tenantId: string;
}

export interface PlatformUser {
  id: number;
  email: string;
  nom: string;
  tenantId: string | null;
  role: string;
  status: string;
  initialPassword?: string;
  temporaryPassword?: string;
}

export interface PlatformAuditLog {
  id: number;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string | null;
  tenantId: string;
  details?: Record<string, unknown>;
  actor?: {
    id: number;
    email?: string;
    nom?: string;
  };
}

export interface PlatformAuditEntry {
  id: number;
  timestamp: string | null;
  tenantId: string;
  actor: {
    id: number;
    email: string | null;
    name: string | null;
  };
  action: string;
  technicalAction: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  category: 'platform' | 'impersonation';
  details: Record<string, unknown>;
}

export interface PlatformSettings {
  sessionDurationMinutes: number;
  impersonationReasonRequired: boolean;
  impersonationMinimumReasonLength: number;
  tenantDefaults: {
    region: string;
    isActive: boolean;
    contactEmail: string | null;
  };
  adminCreationSecurity: {
    requireInvitationAcceptance: boolean;
    allowDirectPasswordProvisioning: boolean;
    minimumPasswordLength: number;
  };
  updatedAt: string | null;
}

export interface PlatformTenantDetail {
  tenant: PlatformTenant & {
    updatedAt: string | null;
  };
  admins: PlatformTenantUser[];
  counts: {
    agents: number;
    services: number;
    shifts: number;
    leaves: number;
    audits: number;
  };
  status: {
    isActive: boolean;
    label: 'ACTIVE' | 'SUSPENDED';
  };
  recentAudits: PlatformAuditEntry[];
  quickActions: Array<{
    id: string;
    label: string;
    enabled: boolean;
    reason?: string;
  }>;
}

export interface PlatformMonitoringResponse {
  generatedAt: string;
  backupFreshnessHours: number;
  totals: {
    tenants: number;
    healthy: number;
    degraded: number;
    critical: number;
    openAlerts: number;
    criticalAlerts: number;
  };
  tenants: Array<{
    tenant: PlatformTenant;
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    reasons: string[];
    alerts: {
      open: number;
      critical: number;
      high: number;
    };
    backup: {
      status: string;
      lastBackupAt: string | null;
    };
    compliance: {
      status: string;
      score: number | null;
    };
  }>;
}

export interface CreatePlatformTenantPayload {
  id?: string;
  name: string;
  region: string;
  contactEmail?: string;
  isActive?: boolean;
}

export interface UpdatePlatformTenantPayload {
  name?: string;
  region?: string;
  contactEmail?: string | null;
  isActive?: boolean;
}

export interface CreateTenantAdminPayload {
  email: string;
  fullName: string;
  password?: string;
  role?: 'ADMIN' | 'SUPER_ADMIN';
}

export interface CreatePlatformUserPayload {
  email: string;
  fullName: string;
  password?: string;
}

export interface UpdatePlatformSettingsPayload {
  sessionDurationMinutes?: number;
  impersonationReasonRequired?: boolean;
  impersonationMinimumReasonLength?: number;
  tenantDefaults?: Partial<PlatformSettings['tenantDefaults']>;
  adminCreationSecurity?: Partial<PlatformSettings['adminCreationSecurity']>;
}

type PlatformRequestConfig = AxiosRequestConfig & {
  skipTenantImpersonation: true;
};

const platformRequestConfig: PlatformRequestConfig = {
  skipTenantImpersonation: true,
};

export const platformApi = {
  tenants: async (): Promise<PlatformTenant[]> => {
    const response = await api.get('/api/platform/tenants', platformRequestConfig);
    return response.data;
  },
  createTenant: async (
    payload: CreatePlatformTenantPayload,
  ): Promise<PlatformTenant> => {
    const response = await api.post(
      '/api/platform/tenants',
      payload,
      platformRequestConfig,
    );
    return response.data;
  },
  updateTenant: async (
    tenantId: string,
    payload: UpdatePlatformTenantPayload,
  ): Promise<PlatformTenant> => {
    const response = await api.patch(
      `/api/platform/tenants/${tenantId}`,
      payload,
      platformRequestConfig,
    );
    return response.data;
  },
  suspendTenant: async (tenantId: string): Promise<PlatformTenant> => {
    const response = await api.post(
      `/api/platform/tenants/${tenantId}/suspend`,
      {},
      platformRequestConfig,
    );
    return response.data;
  },
  activateTenant: async (tenantId: string): Promise<PlatformTenant> => {
    const response = await api.post(
      `/api/platform/tenants/${tenantId}/activate`,
      {},
      platformRequestConfig,
    );
    return response.data;
  },
  tenantUsers: async (tenantId: string): Promise<PlatformTenantUser[]> => {
    const response = await api.get(
      `/api/platform/tenants/${tenantId}/users`,
      platformRequestConfig,
    );
    return response.data;
  },
  createTenantAdmin: async (
    tenantId: string,
    payload: CreateTenantAdminPayload,
  ): Promise<PlatformTenantUser> => {
    const response = await api.post(
      `/api/platform/tenants/${tenantId}/admins`,
      payload,
      platformRequestConfig,
    );
    return response.data;
  },
  tenantDetail: async (tenantId: string): Promise<PlatformTenantDetail> => {
    const response = await api.get(
      `/api/platform/tenants/${tenantId}/detail`,
      platformRequestConfig,
    );
    return response.data;
  },
  platformUsers: async (): Promise<PlatformUser[]> => {
    const response = await api.get('/api/platform/users', platformRequestConfig);
    return response.data;
  },
  createPlatformUser: async (
    payload: CreatePlatformUserPayload,
  ): Promise<PlatformUser> => {
    const response = await api.post(
      '/api/platform/users',
      payload,
      platformRequestConfig,
    );
    return response.data;
  },
  disablePlatformUser: async (userId: number): Promise<PlatformUser> => {
    const response = await api.post(
      `/api/platform/users/${userId}/disable`,
      {},
      platformRequestConfig,
    );
    return response.data;
  },
  reactivatePlatformUser: async (userId: number): Promise<PlatformUser> => {
    const response = await api.post(
      `/api/platform/users/${userId}/reactivate`,
      {},
      platformRequestConfig,
    );
    return response.data;
  },
  resetPlatformUserPassword: async (
    userId: number,
    password?: string,
  ): Promise<PlatformUser> => {
    const response = await api.post(
      `/api/platform/users/${userId}/password-reset`,
      { password },
      platformRequestConfig,
    );
    return response.data;
  },
  settings: async (): Promise<PlatformSettings> => {
    const response = await api.get('/api/platform/settings', platformRequestConfig);
    return response.data;
  },
  updateSettings: async (
    payload: UpdatePlatformSettingsPayload,
  ): Promise<PlatformSettings> => {
    const response = await api.patch(
      '/api/platform/settings',
      payload,
      platformRequestConfig,
    );
    return response.data;
  },
  monitoring: async (): Promise<PlatformMonitoringResponse> => {
    const response = await api.get(
      '/api/platform/monitoring/tenants',
      platformRequestConfig,
    );
    return response.data;
  },
  audit: async (): Promise<PlatformAuditLog[]> => {
    const response = await api.get('/api/platform/audit', platformRequestConfig);
    return response.data;
  },
  auditEntries: async (): Promise<PlatformAuditEntry[]> => {
    const response = await api.get('/api/platform/audit', platformRequestConfig);
    return response.data;
  },
  summary: async (): Promise<OpsMultiTenantSummaryResponse> => {
    const response = await api.get(
      '/api/ops/multi-tenant-summary',
      platformRequestConfig,
    );
    return response.data;
  },
};
