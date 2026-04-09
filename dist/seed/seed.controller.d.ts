import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { Document } from '../documents/entities/document.entity';
import { Contract } from '../agents/entities/contract.entity';
import { BonusTemplate } from '../agents/entities/bonus-template.entity';
import { ContractBonus } from '../agents/entities/contract-bonus.entity';
import { PayrollRule } from '../payroll/entities/payroll-rule.entity';
export declare class SeedController {
    private agentRepo;
    private serviceRepo;
    private leaveRepo;
    private compRepo;
    private agentCompRepo;
    private documentRepo;
    private contractRepo;
    private bonusTemplateRepo;
    private contractBonusRepo;
    private payrollRuleRepo;
    constructor(agentRepo: Repository<Agent>, serviceRepo: Repository<HospitalService>, leaveRepo: Repository<Leave>, compRepo: Repository<Competency>, agentCompRepo: Repository<AgentCompetency>, documentRepo: Repository<Document>, contractRepo: Repository<Contract>, bonusTemplateRepo: Repository<BonusTemplate>, contractBonusRepo: Repository<ContractBonus>, payrollRuleRepo: Repository<PayrollRule>);
    seedHGD(): Promise<{
        success: boolean;
        message: string;
        data: {
            tenant: string;
            services: number;
            agents: number;
            leaves: number;
            credentials: {
                password: string;
                examples: string[];
            };
        };
    }>;
}
