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

@Module({
  imports: [TypeOrmModule.forFeature([Shift, Agent, Leave])],
  providers: [PlanningService, OptimizationService, AutoSchedulerService, LeavesService],
  exports: [PlanningService, OptimizationService, AutoSchedulerService, LeavesService],
  controllers: [PlanningController, LeavesController],
})
export class PlanningModule { }
