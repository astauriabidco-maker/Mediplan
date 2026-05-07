import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OperationIncident } from './entities/operation-incident.entity';
import { OperationsJournalEntry } from './entities/operations-journal-entry.entity';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperationsJournalEntry, OperationIncident]),
    AuditModule,
  ],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
