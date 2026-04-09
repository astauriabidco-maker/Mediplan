import { Module } from '@nestjs/common';
import { QvtService } from './qvt.service';
import { QvtController } from './qvt.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentAlert } from '../agents/entities/agent-alert.entity';
import { QvtWorkerService } from './qvt-worker.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, Agent, AgentAlert])],
  providers: [QvtService, QvtWorkerService],
  controllers: [QvtController]
})
export class QvtModule {}
