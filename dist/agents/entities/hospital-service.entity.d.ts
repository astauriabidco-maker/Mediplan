import { Agent } from './agent.entity';
import { Facility } from './facility.entity';
export declare enum RiskLevel {
    NONE = "NONE",
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare class HospitalService {
    id: number;
    name: string;
    code: string;
    description: string;
    tenantId: string;
    facilityId: number;
    facility: Facility;
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
    is24x7: boolean;
    bedCapacity: number;
    contactNumber: string;
    riskLevel: RiskLevel;
    coverageRules: any;
    createdAt: Date;
    updatedAt: Date;
}
