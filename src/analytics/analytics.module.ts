import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Payslip } from '../payroll/entities/payslip.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HospitalService } from '../settings/entities/hospital-service.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Payslip, Attendance, Shift, Agent, HospitalService])
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService]
})
export class AnalyticsModule { }
