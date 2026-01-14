import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { HospitalServicesController } from './hospital-services.controller';
import { Agent } from './entities/agent.entity';
import { Contract } from './entities/contract.entity';
import { HospitalService } from './entities/hospital-service.entity';
import { HospitalServicesService } from './hospital-services.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Contract, HospitalService])],
  controllers: [AgentsController, HospitalServicesController],
  providers: [AgentsService, HospitalServicesService],
  exports: [AgentsService, HospitalServicesService],
})
export class AgentsModule { }

