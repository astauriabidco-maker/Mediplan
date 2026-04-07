import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { MessageLog } from './entities/message-log.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';
import { ShiftApplication } from '../planning/entities/shift-application.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import { PlanningModule } from '../planning/planning.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MessageLog, Agent, Shift, ShiftApplication, Attendance]),
        forwardRef(() => PlanningModule)
    ],
    controllers: [WhatsappController],
    providers: [WhatsappService],
    exports: [WhatsappService],
})
export class WhatsappModule { }
