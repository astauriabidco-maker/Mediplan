import { Contract } from './contract.entity';
import { AgentCompetency } from '../../competencies/entities/agent-competency.entity';
import { Shift } from '../../planning/entities/shift.entity';
import { Leave } from '../../planning/entities/leave.entity';
import { HospitalService } from './hospital-service.entity';
import { Role } from '../../auth/entities/role.entity';
import { Grade } from './grade.entity';
import { Facility } from './facility.entity';
import { AgentBeneficiary } from './beneficiary.entity';
export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    AGENT = "AGENT"
}
export declare enum UserStatus {
    INVITED = "INVITED",
    ACTIVE = "ACTIVE",
    DISABLED = "DISABLED"
}
export declare enum IdType {
    CNI = "CNI",
    PASSPORT = "PASSPORT",
    ATTESTATION = "ATTESTATION",
    RESIDENCE_PERMIT = "RESIDENCE_PERMIT"
}
export declare enum MobileMoneyProvider {
    ORANGE_MONEY = "ORANGE_MONEY",
    MTN_MOMO = "MTN_MOMO",
    WAVE = "WAVE",
    MOOV_MONEY = "MOOV_MONEY",
    AIRTEL_MONEY = "AIRTEL_MONEY",
    TELMA_MONEY = "TELMA_MONEY"
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
    niu: string;
    cnpsNumber: string;
    categorieEchelon: string;
    idType: IdType;
    idNumber: string;
    idExpiryDate: string;
    mobileMoneyProvider: MobileMoneyProvider;
    mobileMoneyNumber: string;
    isWhatsAppCompatible: boolean;
    mainDiploma: string;
    diplomaYear: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    email: string;
    matricule: string;
    telephone: string;
    password?: string;
    tenantId: string;
    facilityId: number;
    facility: Facility;
    managerId: number;
    manager: Agent;
    subordinates: Agent[];
    contracts: Contract[];
    agentCompetencies: AgentCompetency[];
    shifts: Shift[];
    leaves: Leave[];
    beneficiaries: AgentBeneficiary[];
}
