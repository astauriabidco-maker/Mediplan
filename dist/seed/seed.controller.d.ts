import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Facility } from '../agents/entities/facility.entity';
import { Grade } from '../agents/entities/grade.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Shift } from '../planning/entities/shift.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { Document } from '../documents/entities/document.entity';
import { Contract } from '../agents/entities/contract.entity';
import { BonusTemplate } from '../agents/entities/bonus-template.entity';
import { ContractBonus } from '../agents/entities/contract-bonus.entity';
import { PayrollRule } from '../payroll/entities/payroll-rule.entity';
import { Role } from '../auth/entities/role.entity';
export declare class SeedController {
    private agentRepo;
    private facilityRepo;
    private gradeRepo;
    private serviceRepo;
    private leaveRepo;
    private shiftRepo;
    private compRepo;
    private agentCompRepo;
    private documentRepo;
    private contractRepo;
    private bonusTemplateRepo;
    private contractBonusRepo;
    private payrollRuleRepo;
    private roleRepo;
    constructor(agentRepo: Repository<Agent>, facilityRepo: Repository<Facility>, gradeRepo: Repository<Grade>, serviceRepo: Repository<HospitalService>, leaveRepo: Repository<Leave>, shiftRepo: Repository<Shift>, compRepo: Repository<Competency>, agentCompRepo: Repository<AgentCompetency>, documentRepo: Repository<Document>, contractRepo: Repository<Contract>, bonusTemplateRepo: Repository<BonusTemplate>, contractBonusRepo: Repository<ContractBonus>, payrollRuleRepo: Repository<PayrollRule>, roleRepo: Repository<Role>);
    seedHGD(): Promise<{
        success: boolean;
        message: string;
        data: {
            tenant: string;
            facilities: number;
            services: number;
            grades: number;
            agents: number;
            leaves: number;
            shifts: number;
            roles: number;
            credentials: {
                password: string;
                tenantId: string;
                accounts: {
                    email: string;
                    role: string;
                    label: string;
                }[];
            };
        };
    }>;
}
