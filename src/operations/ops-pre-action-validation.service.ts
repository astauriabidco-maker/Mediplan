import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../agents/entities/agent.entity';
import { hasAnyPermission, Permission } from '../auth/permissions';
import { OperationIncidentStatus } from './entities/operation-incident.entity';
import { OperationalAlertStatus } from './entities/operational-alert.entity';

export type OpsPreAction =
  | 'RESOLVE_ALERT'
  | 'DECLARE_INCIDENT'
  | 'ASSIGN_INCIDENT'
  | 'ESCALATE_INCIDENT'
  | 'RESOLVE_INCIDENT'
  | 'CLOSE_INCIDENT'
  | 'RUN_OPERATIONAL_ESCALATION'
  | 'RUN_OPS_ROUTINES';

export interface OpsPreActionActor {
  tenantId: string;
  role?: string;
  permissions?: string[];
}

export interface OpsPreActionValidationInput {
  action: OpsPreAction;
  tenantId: string;
  actor?: OpsPreActionActor;
  resourceTenantId?: string | null;
  currentState?: string | null;
  hasRequiredEvidence?: boolean;
}

export interface OpsPreActionValidationResult {
  allowed: boolean;
  blockers: string[];
  requiredPermission: string;
  requiredEvidence: string[];
  currentState: string | null;
  expectedState: string;
}

const ACTION_RULES: Record<
  OpsPreAction,
  {
    requiredPermission: string;
    requiredEvidence: string[];
    expectedState: string;
    allowedStates?: string[];
    blockedStateMessages?: Partial<Record<string, string>>;
    missingEvidenceMessage?: string;
  }
> = {
  RESOLVE_ALERT: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['resolutionSummary'],
    expectedState: OperationalAlertStatus.RESOLVED,
    allowedStates: [OperationalAlertStatus.OPEN],
    blockedStateMessages: {
      [OperationalAlertStatus.RESOLVED]:
        'Operational alert is already resolved',
    },
  },
  DECLARE_INCIDENT: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['title', 'description', 'severity'],
    expectedState: OperationIncidentStatus.DECLARED,
  },
  ASSIGN_INCIDENT: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['assignedToId'],
    expectedState: OperationIncidentStatus.ASSIGNED,
    allowedStates: [
      OperationIncidentStatus.OPEN,
      OperationIncidentStatus.DECLARED,
      OperationIncidentStatus.ASSIGNED,
      OperationIncidentStatus.ESCALATED,
    ],
    blockedStateMessages: {
      [OperationIncidentStatus.RESOLVED]:
        'A resolved incident cannot be assigned',
      [OperationIncidentStatus.CLOSED]: 'A closed incident cannot be changed',
    },
  },
  ESCALATE_INCIDENT: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['escalatedToId', 'reason'],
    expectedState: OperationIncidentStatus.ESCALATED,
    allowedStates: [
      OperationIncidentStatus.OPEN,
      OperationIncidentStatus.DECLARED,
      OperationIncidentStatus.ASSIGNED,
      OperationIncidentStatus.ESCALATED,
    ],
    blockedStateMessages: {
      [OperationIncidentStatus.RESOLVED]:
        'A resolved incident cannot be escalated',
      [OperationIncidentStatus.CLOSED]: 'A closed incident cannot be changed',
    },
  },
  RESOLVE_INCIDENT: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['resolutionSummary', 'evidenceUrl'],
    expectedState: OperationIncidentStatus.RESOLVED,
    allowedStates: [
      OperationIncidentStatus.ASSIGNED,
      OperationIncidentStatus.ESCALATED,
    ],
    blockedStateMessages: {
      [OperationIncidentStatus.OPEN]:
        'Incident must be assigned or escalated before resolution',
      [OperationIncidentStatus.DECLARED]:
        'Incident must be assigned or escalated before resolution',
      [OperationIncidentStatus.RESOLVED]: 'Incident is already resolved',
      [OperationIncidentStatus.CLOSED]: 'A closed incident cannot be changed',
    },
    missingEvidenceMessage: 'Incident resolution requires evidence',
  },
  CLOSE_INCIDENT: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['closureSummary', 'evidenceUrl'],
    expectedState: OperationIncidentStatus.CLOSED,
    allowedStates: [OperationIncidentStatus.RESOLVED],
    blockedStateMessages: {
      [OperationIncidentStatus.OPEN]: 'Only a resolved incident can be closed',
      [OperationIncidentStatus.DECLARED]:
        'Only a resolved incident can be closed',
      [OperationIncidentStatus.ASSIGNED]:
        'Only a resolved incident can be closed',
      [OperationIncidentStatus.ESCALATED]:
        'Only a resolved incident can be closed',
      [OperationIncidentStatus.CLOSED]:
        'Only a resolved incident can be closed',
    },
    missingEvidenceMessage: 'Incident closure requires evidence',
  },
  RUN_OPERATIONAL_ESCALATION: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: ['tenantId', 'rules'],
    expectedState: 'ESCALATED_ELIGIBLE_ITEMS',
  },
  RUN_OPS_ROUTINES: {
    requiredPermission: Permission.OperationsWrite,
    requiredEvidence: [],
    expectedState: 'OPS_ROUTINES_TRIGGERED',
  },
};

@Injectable()
export class OpsPreActionValidationService {
  validate(input: OpsPreActionValidationInput): OpsPreActionValidationResult {
    const rule = ACTION_RULES[input.action];
    const blockers: string[] = [];

    if (
      input.actor &&
      !this.actorCanAccessTenant(input.actor, input.tenantId)
    ) {
      blockers.push('Actor cannot operate on another tenant');
    }

    if (input.resourceTenantId && input.resourceTenantId !== input.tenantId) {
      blockers.push('Resource does not belong to the requested tenant');
    }

    if (
      input.actor &&
      !this.actorHasPermission(input.actor, rule.requiredPermission)
    ) {
      blockers.push(`Missing permission: ${rule.requiredPermission}`);
    }

    if (rule.allowedStates && input.currentState) {
      const isAllowedState = rule.allowedStates.includes(input.currentState);
      if (!isAllowedState) {
        blockers.push(
          rule.blockedStateMessages?.[input.currentState] ??
            `Invalid current state: ${input.currentState}`,
        );
      }
    }

    if (input.hasRequiredEvidence === false) {
      blockers.push(
        rule.missingEvidenceMessage ??
          `Missing required evidence: ${rule.requiredEvidence.join(', ')}`,
      );
    }

    return {
      allowed: blockers.length === 0,
      blockers,
      requiredPermission: rule.requiredPermission,
      requiredEvidence: rule.requiredEvidence,
      currentState: input.currentState ?? null,
      expectedState: rule.expectedState,
    };
  }

  assertAllowed(
    input: OpsPreActionValidationInput,
  ): OpsPreActionValidationResult {
    const result = this.validate(input);
    if (result.allowed) return result;

    const permissionOrTenantBlocker = result.blockers.find(
      (blocker) =>
        blocker.startsWith('Missing permission') || blocker.includes('tenant'),
    );
    if (permissionOrTenantBlocker) {
      throw new ForbiddenException(permissionOrTenantBlocker);
    }

    throw new BadRequestException(result.blockers[0]);
  }

  private actorHasPermission(
    actor: OpsPreActionActor,
    requiredPermission: string,
  ) {
    if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) {
      return true;
    }

    return hasAnyPermission(actor.permissions ?? [], [requiredPermission]);
  }

  private actorCanAccessTenant(actor: OpsPreActionActor, tenantId: string) {
    return actor.role === UserRole.SUPER_ADMIN || actor.tenantId === tenantId;
  }
}
