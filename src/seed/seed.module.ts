import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Leave } from '../planning/entities/leave.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Agent, HospitalService, Leave])],
    controllers: [SeedController],
})
export class SeedModule { }
