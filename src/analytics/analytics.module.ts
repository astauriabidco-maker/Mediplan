import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Payslip } from '../payroll/entities/payslip.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { HealthRecord } from '../agents/entities/health-record.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { AgentAlert } from '../agents/entities/agent-alert.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Payslip, 
            Attendance, 
            Shift, 
            Agent, 
            HospitalService, 
            HealthRecord, 
            Competency, 
            AgentCompetency,
            AgentAlert
        ])
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService]
})
export class AnalyticsModule { }
