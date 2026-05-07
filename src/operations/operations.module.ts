import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OperationIncident } from './entities/operation-incident.entity';
import { OperationRoutineRun } from './entities/operation-routine-run.entity';
import { OperationalAlert } from './entities/operational-alert.entity';
import { OpsActionCenterWorkflowMutation } from './entities/ops-action-center-workflow-mutation.entity';
import { OpsOnCallConfig } from './entities/ops-on-call-config.entity';
import { OperationsJournalEntry } from './entities/operations-journal-entry.entity';
import { OperationRunbookTemplate } from './entities/operation-runbook-template.entity';
import { OperationsController } from './operations.controller';
import { OpsOnCallConfigService } from './ops-on-call-config.service';
import { OpsPreActionValidationService } from './ops-pre-action-validation.service';
import { OpsNotificationService } from './ops-notification.service';
import { OpsRoutineSchedulerService } from './ops-routine-scheduler.service';
import { OperationsService } from './operations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationsJournalEntry,
      OperationIncident,
      OperationalAlert,
      OperationRoutineRun,
      OpsOnCallConfig,
      OperationRunbookTemplate,
      OpsActionCenterWorkflowMutation,
    ]),
    AuditModule,
  ],
  controllers: [OperationsController],
  providers: [
    OperationsService,
    OpsNotificationService,
    OpsOnCallConfigService,
    OpsRoutineSchedulerService,
    OpsPreActionValidationService,
  ],
  exports: [OperationsService, OpsNotificationService],
})
export class OperationsModule {}
