export type OperationsRunbookSourceType = 'ALERT' | 'INCIDENT' | 'JOURNAL';

export interface OperationsRunbookReference {
  sourceType: OperationsRunbookSourceType;
  id: number;
  tenantId: string;
  title: string;
  status: string;
  severity: string;
  occurredAt: string;
  source?: string;
  sourceReference?: string;
  relatedReference?: string | null;
  impactedService?: string | null;
}

export interface OperationsRunbookRequirement {
  role: string;
  permission: 'operations:read' | 'operations:write' | 'audit:read';
  reason: string;
}

export interface OperationsRunbookCheck {
  id: string;
  label: string;
  expected: string;
  blocking: boolean;
}

export interface OperationsRunbookAction {
  id: string;
  label: string;
  method: 'GET' | 'POST' | 'PATCH';
  endpoint: string;
  requiredPermission: 'operations:read' | 'operations:write';
  enabled: boolean;
  why: string;
}

export interface OperationsRunbookEvidence {
  label: string;
  expected: string;
  requiredFor: string[];
}

export interface OperationsRunbookStep {
  order: number;
  title: string;
  why: string;
  instruction: string;
  requiredRole: string;
  requiredPermission: 'operations:read' | 'operations:write' | 'audit:read';
  checks: OperationsRunbookCheck[];
  evidence: OperationsRunbookEvidence[];
  actions: OperationsRunbookAction[];
}

export interface OperationsRunbookNext {
  why: string;
  whatToDoNext: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedActionId: string | null;
  waitingOn: string[];
}

export interface OperationsRunbookDto {
  id: string;
  generatedAt: string;
  reference: OperationsRunbookReference;
  requiredPermissions: OperationsRunbookRequirement[];
  why: string;
  next: OperationsRunbookNext;
  steps: OperationsRunbookStep[];
  checks: OperationsRunbookCheck[];
  actions: OperationsRunbookAction[];
  expectedEvidence: OperationsRunbookEvidence[];
}
