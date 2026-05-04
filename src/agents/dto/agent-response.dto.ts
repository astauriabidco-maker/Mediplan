import { UserRole, type Agent } from '../entities/agent.entity';
import type { AuthenticatedUser } from '../../auth/authenticated-request';

export type AgentResponse = Omit<Partial<Agent>, 'password' | 'invitationToken'>;

const HR_SENSITIVE_AGENT_FIELDS: Array<keyof Agent> = [
    'address',
    'birthName',
    'cnpsNumber',
    'dateOfBirth',
    'emergencyContactName',
    'emergencyContactPhone',
    'iban',
    'bic',
    'idExpiryDate',
    'idNumber',
    'maritalStatus',
    'childrenCount',
    'mobileMoneyNumber',
    'nationality',
    'nir',
    'niu',
    'personalEmail',
    'placeOfBirth',
    'street',
    'zipCode',
    'city',
    'contracts',
    'healthRecords',
    'beneficiaries',
];

const isPrivilegedHrViewer = (viewer: Pick<AuthenticatedUser, 'role'>): boolean =>
    viewer.role === UserRole.SUPER_ADMIN || viewer.role === UserRole.ADMIN;

const canViewSensitiveHrFields = (
    agent: Pick<Agent, 'id'>,
    viewer: Pick<AuthenticatedUser, 'id' | 'role'>,
): boolean => isPrivilegedHrViewer(viewer) || agent.id === viewer.id;

export const serializeAgentForViewer = (
    agent: Agent,
    viewer: Pick<AuthenticatedUser, 'id' | 'role'>,
    seen = new WeakSet<object>(),
): AgentResponse => {
    if (seen.has(agent)) {
        return { id: agent.id, nom: agent.nom };
    }
    seen.add(agent);

    const response = { ...agent } as AgentResponse;
    delete (response as Partial<Agent>).password;
    delete (response as Partial<Agent>).invitationToken;

    if (!canViewSensitiveHrFields(agent, viewer)) {
        for (const field of HR_SENSITIVE_AGENT_FIELDS) {
            if (field in response) {
                response[field as keyof AgentResponse] = null as never;
            }
        }
    }

    if (agent.manager) {
        response.manager = serializeAgentForViewer(agent.manager, viewer, seen) as Agent;
    }

    return response;
};

export const serializeAgentsForViewer = (
    agents: Agent[],
    viewer: Pick<AuthenticatedUser, 'id' | 'role'>,
): AgentResponse[] => agents.map((agent) => serializeAgentForViewer(agent, viewer));
