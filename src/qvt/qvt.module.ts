import { Module } from '@nestjs/common';
import { QvtService } from './qvt.service';
import { QvtController } from './qvt.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, Agent])],
  providers: [QvtService],
  controllers: [QvtController]
})
export class QvtModule {}
