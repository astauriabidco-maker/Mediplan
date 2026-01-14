import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetenciesService } from './competencies.service';
import { CompetenciesController } from './competencies.controller';
import { Competency } from './entities/competency.entity';
import { AgentCompetency } from './entities/agent-competency.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Competency, AgentCompetency, Agent, Shift])],
  controllers: [CompetenciesController],


  providers: [CompetenciesService],
  exports: [CompetenciesService],
})
export class CompetenciesModule { }

