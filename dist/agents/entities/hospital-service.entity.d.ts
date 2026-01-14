import { Agent } from './agent.entity';
export declare class HospitalService {
    id: number;
    name: string;
    code: string;
    description: string;
    tenantId: string;
    parentService: HospitalService;
    parentServiceId: number | null;
    subServices: HospitalService[];
    level: number;
    chief: Agent;
    chiefId: number | null;
    deputyChief: Agent;
    deputyChiefId: number | null;
    major: Agent;
    majorId: number | null;
    nursingManager: Agent;
    nursingManagerId: number | null;
    maxAgents: number | null;
    minAgents: number | null;
    agents: Agent[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
