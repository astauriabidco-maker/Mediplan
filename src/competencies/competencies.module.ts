import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetenciesService } from './competencies.service';
import { CompetenciesController } from './competencies.controller';
import { Competency } from './entities/competency.entity';
import { AgentCompetency } from './entities/agent-competency.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AgentAlert } from '../agents/entities/agent-alert.entity';
import { GpecWorkerService } from './gpec-worker.service';

@Module({
  imports: [
      TypeOrmModule.forFeature([Competency, AgentCompetency, Agent, Shift, AgentAlert]),
      WhatsappModule
  ],
  controllers: [CompetenciesController],

  providers: [CompetenciesService, GpecWorkerService],
  exports: [CompetenciesService, GpecWorkerService],
})
export class CompetenciesModule { }

