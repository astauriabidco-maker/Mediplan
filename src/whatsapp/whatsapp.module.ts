import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { MessageLog } from './entities/message-log.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([MessageLog, Agent, Shift]),
    ],
    controllers: [WhatsappController],
    providers: [WhatsappService],
    exports: [WhatsappService],
})
export class WhatsappModule { }
