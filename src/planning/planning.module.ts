import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { Shift } from './entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
import { PlanningController } from './planning.controller';
import { AutoSchedulerService } from './auto-scheduler.service';

import { Leave } from './entities/leave.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { AttendanceController } from './attendance.controller';
import { PlanningAiController } from './planning-ai.controller';
import { WorkPolicy } from './entities/work-policy.entity';
import { WorkPoliciesController } from './work-policies.controller';
import { WorkPoliciesService } from './work-policies.service';
import { AuditModule } from '../audit/audit.module';

import { ShiftApplication } from './entities/shift-application.entity';
import { ShiftProposal } from './entities/shift-proposal.entity';

import { UnderstaffingService } from './understaffing.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { Attendance } from './entities/attendance.entity';
import { DocumentsModule } from '../documents/documents.module';
import { SettingsModule } from '../settings/settings.module';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { HealthRecord } from '../agents/entities/health-record.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { ComplianceWorkerService } from './compliance-worker.service';
import { AgentAlert } from '../agents/entities/agent-alert.entity';
import { ComplianceValidationService } from './compliance-validation.service';
import { ComplianceAlertService } from './compliance-alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift, Agent, Leave, LeaveBalance, WorkPolicy, 
      ShiftApplication, ShiftProposal, Attendance, 
      HospitalService, HealthRecord, AgentCompetency, 
      AgentAlert
    ]),
    AuditModule,
    forwardRef(() => WhatsappModule),
    DocumentsModule,
    SettingsModule
  ],
  providers: [
    PlanningService, OptimizationService, AutoSchedulerService, ComplianceValidationService, ComplianceAlertService,
    LeavesService, WorkPoliciesService, UnderstaffingService,
    ComplianceWorkerService
  ],
  exports: [PlanningService, OptimizationService, AutoSchedulerService, LeavesService, WorkPoliciesService],
  controllers: [
    PlanningController,
    LeavesController,
    WorkPoliciesController,
    AttendanceController,
    PlanningAiController
  ],
})
export class PlanningModule { }
