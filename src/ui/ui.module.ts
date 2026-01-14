import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UiController } from './ui.controller';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from '../competencies/entities/competency.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Competency])],
  controllers: [UiController],
})
export class UiModule { }
