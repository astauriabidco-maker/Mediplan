import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { HospitalServicesController } from './hospital-services.controller';
import { Agent } from './entities/agent.entity';
import { Contract } from './entities/contract.entity';
import { HospitalService } from './entities/hospital-service.entity';
import { HospitalServicesService } from './hospital-services.service';
import { Grade } from './entities/grade.entity';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { Facility } from './entities/facility.entity';
import { AuditModule } from '../audit/audit.module';
import { AgentBeneficiary } from './entities/beneficiary.entity';
import { BeneficiaryService } from './beneficiary.service';
import { BeneficiaryController } from './beneficiary.controller';
import { BonusTemplate } from './entities/bonus-template.entity';
import { ContractBonus } from './entities/contract-bonus.entity';
import { HealthRecord } from './entities/health-record.entity';
import { AgentAlert } from './entities/agent-alert.entity';
import { AgentAlertsController } from './agent-alerts.controller';
import { AgentAlertsService } from './agent-alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      Contract,
      HospitalService,
      Grade,
      Facility,
      AgentBeneficiary,
      BonusTemplate,
      ContractBonus,
      HealthRecord,
      AgentAlert,
    ]),
    AuditModule,
  ],
  controllers: [
    AgentsController,
    HospitalServicesController,
    GradesController,
    BeneficiaryController,
    AgentAlertsController,
  ],
  providers: [
    AgentsService,
    HospitalServicesService,
    GradesService,
    BeneficiaryService,
    AgentAlertsService,
  ],
  exports: [
    AgentsService,
    HospitalServicesService,
    GradesService,
    BeneficiaryService,
    AgentAlertsService,
    TypeOrmModule,
  ],
})
export class AgentsModule {}
