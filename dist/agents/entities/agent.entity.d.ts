import { Contract } from './contract.entity';
import { AgentCompetency } from '../../competencies/entities/agent-competency.entity';
import { Shift } from '../../planning/entities/shift.entity';
import { Leave } from '../../planning/entities/leave.entity';
import { HospitalService } from './hospital-service.entity';
import { Role } from '../../auth/entities/role.entity';
import { Grade } from './grade.entity';
export declare enum UserRole {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    AGENT = "AGENT"
}
export declare enum UserStatus {
    INVITED = "INVITED",
    ACTIVE = "ACTIVE",
    DISABLED = "DISABLED"
}
export declare class Agent {
    id: number;
    role: UserRole;
    roleId: number;
    dbRole: Role;
    status: UserStatus;
    invitationToken: string | null;
    nom: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    placeOfBirth: string;
    nationality: string;
    address: string;
    department: string;
    hospitalServiceId: number;
    hospitalService: HospitalService;
    jobTitle: string;
    hiringDate: string;
    contractType: string;
    birthName: string;
    nir: string;
    maritalStatus: string;
    childrenCount: number;
    street: string;
    zipCode: string;
    city: string;
    personalEmail: string;
    workTimePercentage: number;
    gradeLegacy: string;
    step: string;
    index: string;
    gradeId: number;
    grade: Grade;
    contractEndDate: string;
    iban: string;
    bic: string;
    mainDiploma: string;
    diplomaYear: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    email: string;
    matricule: string;
    telephone: string;
    password?: string;
    tenantId: string;
    managerId: number;
    manager: Agent;
    subordinates: Agent[];
    contracts: Contract[];
    agentCompetencies: AgentCompetency[];
    shifts: Shift[];
    leaves: Leave[];
}
