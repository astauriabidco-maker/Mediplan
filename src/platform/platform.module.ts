import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditModule } from '../audit/audit.module';
import { Role } from '../auth/entities/role.entity';
import { Ght } from '../ght/entities/ght.entity';
import { MailModule } from '../mail/mail.module';
import { OperationalAlert } from '../operations/entities/operational-alert.entity';
import { OperationRoutineRun } from '../operations/entities/operation-routine-run.entity';
import { Leave } from '../planning/entities/leave.entity';
import { Shift } from '../planning/entities/shift.entity';
import { ProductionGate } from '../production-readiness/entities/production-gate.entity';
import { PlatformController } from './platform.controller';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformInvitationsService } from './platform-invitations.service';
import { PlatformMonitoringService } from './platform-monitoring.service';
import { PlatformRoleGuard } from './platform-role.guard';
import { PlatformSettings } from './platform-settings.entity';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformTenantDetailService } from './platform-tenant-detail.service';
import { PlatformService } from './platform.service';
import { PlatformUsersController } from './platform-users.controller';
import { PlatformUsersService } from './platform-users.service';

@Module({
  imports: [
    AuditModule,
    MailModule,
    TypeOrmModule.forFeature([
      Agent,
      Ght,
      Role,
      AuditLog,
      HospitalService,
      Shift,
      Leave,
      PlatformSettings,
      OperationalAlert,
      OperationRoutineRun,
      ProductionGate,
    ]),
  ],
  controllers: [PlatformController, PlatformUsersController],
  providers: [
    PlatformService,
    PlatformInvitationsService,
    PlatformTenantDetailService,
    PlatformSettingsService,
    PlatformMonitoringService,
    PlatformAuditService,
    PlatformUsersService,
    PlatformRoleGuard,
  ],
  exports: [PlatformSettingsService],
})
export class PlatformModule {}
