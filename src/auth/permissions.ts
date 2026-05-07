import { UserRole } from '../agents/entities/agent.entity';

export const Permission = {
  All: '*',
  AgentsRead: 'agents:read',
  AgentsWrite: 'agents:write',
  AnalyticsRead: 'analytics:read',
  AuditRead: 'audit:read',
  AuditExport: 'audit:export',
  BackupRead: 'backup:read',
  BackupWrite: 'backup:write',
  CompetenciesRead: 'competencies:read',
  CompetenciesWrite: 'competencies:write',
  DocumentsRead: 'documents:read',
  DocumentsWrite: 'documents:write',
  HrPoliciesRead: 'hr-policies:read',
  HrPoliciesWrite: 'hr-policies:write',
  HrPoliciesManage: 'hr-policies:manage',
  LeavesRead: 'leaves:read',
  LeavesRequest: 'leaves:request',
  LeavesValidate: 'leaves:validate',
  LeavesManage: 'leaves:manage',
  OperationsRead: 'operations:read',
  OperationsWrite: 'operations:write',
  PayrollRead: 'payroll:read',
  PayrollWrite: 'payroll:write',
  PlanningRead: 'planning:read',
  PlanningWrite: 'planning:write',
  PlanningManage: 'planning:manage',
  PlanningPublish: 'planning:publish',
  PlanningExceptionApprove: 'planning:exceptions:approve',
  ReleaseRead: 'release:read',
  ReleaseWrite: 'release:write',
  QvtRead: 'qvt:read',
  RolesManage: 'roles:manage',
  ServicesRead: 'services:read',
  ServicesWrite: 'services:write',
  ServicesManageStaff: 'services:manage_staff',
  SettingsRead: 'settings:read',
  SettingsWrite: 'settings:write',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export interface SystemRoleDefinition {
  name: string;
  description: string;
  permissions: string[];
}

export const HOSPITAL_ROLE_PERMISSIONS: Record<string, SystemRoleDefinition> = {
  [UserRole.SUPER_ADMIN]: {
    name: UserRole.SUPER_ADMIN,
    description: 'Super administrateur plateforme avec accès multi-tenant',
    permissions: [Permission.All],
  },
  [UserRole.ADMIN]: {
    name: UserRole.ADMIN,
    description: 'Administrateur établissement avec accès total',
    permissions: [Permission.All],
  },
  DIRECTION: {
    name: 'DIRECTION',
    description:
      'Direction établissement: pilotage, analytics, audit et organisation',
    permissions: [
      Permission.AgentsRead,
      Permission.AnalyticsRead,
      Permission.AuditRead,
      Permission.DocumentsRead,
      Permission.PayrollRead,
      Permission.PlanningRead,
      Permission.QvtRead,
      Permission.ReleaseRead,
      Permission.OperationsRead,
      Permission.ServicesRead,
      Permission.SettingsRead,
    ],
  },
  [UserRole.MANAGER]: {
    name: UserRole.MANAGER,
    description: 'Cadre de service: équipes, planning, congés et politiques RH',
    permissions: [
      Permission.AgentsRead,
      Permission.ServicesRead,
      Permission.ServicesManageStaff,
      Permission.PlanningRead,
      Permission.PlanningWrite,
      Permission.PlanningPublish,
      Permission.HrPoliciesRead,
      Permission.HrPoliciesWrite,
      Permission.HrPoliciesManage,
      Permission.LeavesRead,
      Permission.LeavesValidate,
      Permission.QvtRead,
      Permission.ReleaseRead,
      Permission.OperationsRead,
      Permission.OperationsWrite,
    ],
  },
  [UserRole.AGENT]: {
    name: UserRole.AGENT,
    description:
      'Agent hospitalier: accès personnel planning, congés et profil',
    permissions: [
      'profile:read',
      Permission.PlanningRead,
      Permission.LeavesRead,
      Permission.LeavesRequest,
    ],
  },
  HR_MANAGER: {
    name: 'HR_MANAGER',
    description:
      'Responsable RH: agents, contrats, paie, congés et politiques RH',
    permissions: [
      Permission.AgentsRead,
      Permission.AgentsWrite,
      Permission.DocumentsRead,
      Permission.DocumentsWrite,
      Permission.BackupRead,
      Permission.BackupWrite,
      Permission.HrPoliciesRead,
      Permission.HrPoliciesWrite,
      Permission.HrPoliciesManage,
      Permission.LeavesRead,
      Permission.LeavesManage,
      Permission.PayrollRead,
      Permission.PayrollWrite,
      Permission.ReleaseRead,
      Permission.ReleaseWrite,
      Permission.OperationsRead,
      Permission.OperationsWrite,
      Permission.ServicesRead,
    ],
  },
  PLANNING_COORDINATOR: {
    name: 'PLANNING_COORDINATOR',
    description:
      'Coordinateur planning: corrections, publication et suivi conformité',
    permissions: [
      Permission.AgentsRead,
      Permission.ServicesRead,
      Permission.PlanningRead,
      Permission.PlanningWrite,
      Permission.PlanningPublish,
      Permission.LeavesRead,
      Permission.ReleaseRead,
      Permission.OperationsRead,
      Permission.OperationsWrite,
    ],
  },
  EXCEPTION_APPROVER: {
    name: 'EXCEPTION_APPROVER',
    description: 'Approbateur des exceptions de conformité planning',
    permissions: [
      Permission.AgentsRead,
      Permission.ServicesRead,
      Permission.PlanningRead,
      Permission.PlanningExceptionApprove,
      Permission.AuditRead,
      Permission.ReleaseRead,
      Permission.OperationsRead,
    ],
  },
  AUDITOR: {
    name: 'AUDITOR',
    description:
      'Auditeur: consultation des journaux et rapports de conformité',
    permissions: [
      Permission.AuditRead,
      Permission.AuditExport,
      Permission.PlanningRead,
      Permission.ReleaseRead,
      Permission.OperationsRead,
      Permission.ServicesRead,
    ],
  },
};

export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'planning:exception': [Permission.PlanningExceptionApprove],
};

export const IMPLIED_PERMISSIONS: Record<string, string[]> = {
  [Permission.PlanningManage]: [
    Permission.PlanningRead,
    Permission.PlanningWrite,
    Permission.HrPoliciesRead,
    Permission.HrPoliciesWrite,
  ],
  [Permission.HrPoliciesManage]: [
    Permission.HrPoliciesRead,
    Permission.HrPoliciesWrite,
  ],
  [Permission.LeavesManage]: [Permission.LeavesRead, Permission.LeavesValidate],
  [Permission.ReleaseWrite]: [Permission.ReleaseRead, Permission.AuditRead],
  [Permission.OperationsWrite]: [
    Permission.OperationsRead,
    Permission.AuditRead,
  ],
  'services:write': [Permission.ServicesRead],
  'agents:write': [Permission.AgentsRead],
};

export const expandPermissions = (permissions: string[] = []): string[] => {
  const expanded = new Set(permissions);
  const queue = [...permissions];

  while (queue.length > 0) {
    const permission = queue.shift();
    if (!permission) continue;

    const nextPermissions = [
      ...(LEGACY_PERMISSION_ALIASES[permission] || []),
      ...(IMPLIED_PERMISSIONS[permission] || []),
    ];

    for (const next of nextPermissions) {
      if (!expanded.has(next)) {
        expanded.add(next);
        queue.push(next);
      }
    }
  }

  return [...expanded];
};

export const permissionMatches = (
  grantedPermission: string,
  requiredPermission: string,
): boolean => {
  if (grantedPermission === Permission.All) return true;
  if (grantedPermission === requiredPermission) return true;

  const [grantedModule, grantedAction] = grantedPermission.split(':');
  const [requiredModule] = requiredPermission.split(':');

  if (!grantedModule || grantedModule !== requiredModule) return false;

  return grantedAction === '*' || grantedAction === 'all';
};

export const hasAnyPermission = (
  userPermissions: string[] = [],
  requiredPermissions: string[] = [],
): boolean => {
  const expandedPermissions = expandPermissions(userPermissions);

  return requiredPermissions.some((requiredPermission) =>
    expandedPermissions.some((grantedPermission) =>
      permissionMatches(grantedPermission, requiredPermission),
    ),
  );
};

export const getDefaultPermissionsForRole = (roleName?: string): string[] => {
  if (!roleName) return [];
  return HOSPITAL_ROLE_PERMISSIONS[roleName]?.permissions || [];
};
