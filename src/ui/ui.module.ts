import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UiController } from './ui.controller';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { Shift } from '../planning/entities/shift.entity';
import { Leave } from '../planning/entities/leave.entity';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Competency, Shift, Leave])],
  controllers: [UiController],
  providers: [DashboardService],
})
export class UiModule { }
