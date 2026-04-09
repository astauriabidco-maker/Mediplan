import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollPdfService } from './payroll-pdf.service';
import { PayrollAiAuditorService } from './payroll-ai-auditor.service';
import { PayrollExportService } from './payroll-export.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Payslip } from './entities/payslip.entity';
import { PayrollVariable } from './entities/payroll-variable.entity';
import { PayrollRule } from './entities/payroll-rule.entity';
import { Contract } from '../agents/entities/contract.entity';
import { ContractBonus } from '../agents/entities/contract-bonus.entity';
import { Agent } from '../agents/entities/agent.entity';
import { BonusTemplate } from '../agents/entities/bonus-template.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import { PlanningModule } from '../planning/planning.module';
import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payslip, PayrollVariable, PayrollRule, Contract, ContractBonus, Agent, BonusTemplate, Attendance]),
    PlanningModule,
    AgentsModule,
    AuditModule,
    WhatsappModule
  ],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollPdfService, PayrollAiAuditorService, PayrollExportService],
  exports: [PayrollService]
})
export class PayrollModule {}
