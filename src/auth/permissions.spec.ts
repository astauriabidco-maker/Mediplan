import {
  Permission,
  expandPermissions,
  getDefaultPermissionsForRole,
  hasAnyPermission,
} from './permissions';

describe('permissions matrix', () => {
  it('expands compatibility aliases without granting publication by manage', () => {
    expect(expandPermissions(['planning:exception'])).toContain(
      Permission.PlanningExceptionApprove,
    );
    expect(hasAnyPermission(['planning:manage'], [Permission.PlanningWrite])).toBe(
      true,
    );
    expect(
      hasAnyPermission(['planning:manage'], [Permission.PlanningPublish]),
    ).toBe(false);
  });

  it('supports exact, module wildcard and module all permissions', () => {
    expect(hasAnyPermission(['audit:*'], [Permission.AuditRead])).toBe(true);
    expect(hasAnyPermission(['settings:all'], [Permission.SettingsWrite])).toBe(
      true,
    );
    expect(hasAnyPermission(['services:read'], [Permission.AgentsRead])).toBe(
      false,
    );
  });

  it('provides default hospital permissions for historical enum roles', () => {
    expect(getDefaultPermissionsForRole('MANAGER')).toEqual(
      expect.arrayContaining([
        Permission.PlanningRead,
        Permission.PlanningWrite,
        Permission.PlanningPublish,
        Permission.HrPoliciesManage,
      ]),
    );
    expect(getDefaultPermissionsForRole('AGENT')).toEqual(
      expect.arrayContaining([
        Permission.PlanningRead,
        Permission.LeavesRequest,
      ]),
    );
  });
});
