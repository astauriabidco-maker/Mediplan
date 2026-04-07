import { Module } from '@nestjs/common';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';

import { AgentsModule } from '../agents/agents.module';

import { PlanningModule } from '../planning/planning.module';

@Module({
  imports: [AgentsModule, PlanningModule],
  controllers: [FhirController],
  providers: [FhirService]
})
export class FhirModule {}
