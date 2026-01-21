import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { Shift } from './entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
import { PlanningController } from './planning.controller';
import { AutoSchedulerService } from './auto-scheduler.service';

import { Leave } from './entities/leave.entity';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { WorkPolicy } from './entities/work-policy.entity';
import { WorkPoliciesController } from './work-policies.controller';
import { WorkPoliciesService } from './work-policies.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, Agent, Leave, WorkPolicy]),
    AuditModule
  ],
  providers: [PlanningService, OptimizationService, AutoSchedulerService, LeavesService, WorkPoliciesService],
  exports: [PlanningService, OptimizationService, AutoSchedulerService, LeavesService, WorkPoliciesService],
  controllers: [PlanningController, LeavesController, WorkPoliciesController],
})
export class PlanningModule { }
