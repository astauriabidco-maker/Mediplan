import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OperationIncident } from './entities/operation-incident.entity';
import { OperationalAlert } from './entities/operational-alert.entity';
import { OperationsJournalEntry } from './entities/operations-journal-entry.entity';
import { OperationsController } from './operations.controller';
import { OpsNotificationService } from './ops-notification.service';
import { OperationsService } from './operations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationsJournalEntry,
      OperationIncident,
      OperationalAlert,
    ]),
    AuditModule,
  ],
  controllers: [OperationsController],
  providers: [OperationsService, OpsNotificationService],
  exports: [OperationsService, OpsNotificationService],
})
export class OperationsModule {}
