import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
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

@Module({
    imports: [TypeOrmModule.forFeature([
        Agent, HospitalService, Leave, Competency, AgentCompetency, Document,
        Contract, BonusTemplate, ContractBonus, PayrollRule
    ])],
    controllers: [SeedController],
})
export class SeedModule { }
