import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Payslip } from './entities/payslip.entity';
import { PayrollVariable } from './entities/payroll-variable.entity';
import { PlanningModule } from '../planning/planning.module';
import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payslip, PayrollVariable]),
    PlanningModule,
    AgentsModule,
    AuditModule
  ],
  controllers: [PayrollController],
  providers: [PayrollService]
})
export class PayrollModule {}
