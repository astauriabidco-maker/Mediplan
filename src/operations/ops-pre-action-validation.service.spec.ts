import { ForbiddenException } from '@nestjs/common';
import { OperationIncidentStatus } from './entities/operation-incident.entity';
import { OperationalAlertStatus } from './entities/operational-alert.entity';
import { OpsPreActionValidationService } from './ops-pre-action-validation.service';

describe('OpsPreActionValidationService', () => {
  let service: OpsPreActionValidationService;

  beforeEach(() => {
    service = new OpsPreActionValidationService();
  });

  it('returns a structured allow decision with required permission, evidence and expected state', () => {
    const result = service.validate({
      action: 'RESOLVE_INCIDENT',
      tenantId: 'tenant-a',
      actor: {
        tenantId: 'tenant-a',
        role: 'MANAGER',
        permissions: ['operations:write'],
      },
      resourceTenantId: 'tenant-a',
      currentState: OperationIncidentStatus.ESCALATED,
      hasRequiredEvidence: true,
    });

    expect(result).toEqual({
      allowed: true,
      blockers: [],
      requiredPermission: 'operations:write',
      requiredEvidence: ['resolutionSummary', 'evidenceUrl'],
      currentState: OperationIncidentStatus.ESCALATED,
      expectedState: OperationIncidentStatus.RESOLVED,
    });
  });

  it('blocks missing operation permission before a sensitive action', () => {
    expect(() =>
      service.assertAllowed({
        action: 'RUN_OPERATIONAL_ESCALATION',
        tenantId: 'tenant-a',
        actor: {
          tenantId: 'tenant-a',
          role: 'AUDITOR',
          permissions: ['operations:read'],
        },
        hasRequiredEvidence: true,
      }),
    ).toThrow(ForbiddenException);
  });

  it('blocks cross-tenant actions for non-super-admin actors', () => {
    const result = service.validate({
      action: 'DECLARE_INCIDENT',
      tenantId: 'tenant-b',
      actor: {
        tenantId: 'tenant-a',
        role: 'MANAGER',
        permissions: ['operations:write'],
      },
      hasRequiredEvidence: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain('Actor cannot operate on another tenant');
  });

  it('blocks invalid incident state transitions with the existing user-facing reason', () => {
    expect(() =>
      service.assertAllowed({
        action: 'RESOLVE_INCIDENT',
        tenantId: 'tenant-a',
        resourceTenantId: 'tenant-a',
        currentState: OperationIncidentStatus.DECLARED,
        hasRequiredEvidence: true,
      }),
    ).toThrow('Incident must be assigned or escalated before resolution');
  });

  it('blocks missing incident proof before resolve and close actions', () => {
    const result = service.validate({
      action: 'CLOSE_INCIDENT',
      tenantId: 'tenant-a',
      resourceTenantId: 'tenant-a',
      currentState: OperationIncidentStatus.RESOLVED,
      hasRequiredEvidence: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        allowed: false,
        requiredEvidence: ['closureSummary', 'evidenceUrl'],
        expectedState: OperationIncidentStatus.CLOSED,
      }),
    );
    expect(result.blockers).toContain('Incident closure requires evidence');
  });

  it('allows super-admin validation across tenants while still checking alert state', () => {
    const result = service.validate({
      action: 'RESOLVE_ALERT',
      tenantId: 'tenant-b',
      actor: {
        tenantId: 'tenant-a',
        role: 'SUPER_ADMIN',
        permissions: [],
      },
      resourceTenantId: 'tenant-b',
      currentState: OperationalAlertStatus.RESOLVED,
      hasRequiredEvidence: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(['Operational alert is already resolved']);
  });
});
