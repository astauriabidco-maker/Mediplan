import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Facility } from '../agents/entities/facility.entity';
import { Grade } from '../agents/entities/grade.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Shift } from '../planning/entities/shift.entity';
import { WorkPolicy } from '../planning/entities/work-policy.entity';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Facility,
      HospitalService,
      Grade,
      Agent,
      WorkPolicy,
      Shift,
      Leave,
      Attendance,
      AuditLog,
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
