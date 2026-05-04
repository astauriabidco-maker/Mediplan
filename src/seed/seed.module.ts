import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      Facility,
      Grade,
      HospitalService,
      Leave,
      Shift,
      Competency,
      AgentCompetency,
      Document,
      Contract,
      BonusTemplate,
      ContractBonus,
      PayrollRule,
      Role,
    ]),
  ],
  controllers: [SeedController],
})
export class SeedModule {}
