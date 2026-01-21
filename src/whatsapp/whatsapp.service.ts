import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog, MessageDirection, MessageStatus } from './entities/message-log.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { startOfWeek, endOfWeek } from 'date-fns';

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name);
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly phoneId: string;

    constructor(
        @InjectRepository(MessageLog)
        private messageLogRepo: Repository<MessageLog>,
        @InjectRepository(Agent)
        private agentRepo: Repository<Agent>,
        @InjectRepository(Shift)
        private shiftRepo: Repository<Shift>,
        private configService: ConfigService,
    ) {
        this.token = this.configService.get<string>('WHATSAPP_API_TOKEN') || '';
        this.phoneId = this.configService.get<string>('WHATSAPP_PHONE_ID') || '';
        this.apiUrl = `https://graph.facebook.com/v17.0/${this.phoneId}/messages`;
    }

    async sendMessage(to: string, message: string): Promise<any> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: { body: message },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            // Log outbound message
            await this.messageLogRepo.save({
                from: 'SYSTEM',
                to: to,
                content: message,
                direction: MessageDirection.OUTBOUND,
                status: MessageStatus.SENT,
                tenantId: 'HGD-DOUALA', // Default for now
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Error sending WhatsApp message: ${error.message}`);
            if (error.response) {
                this.logger.error(`Meta API Error: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    async handleIncomingMessage(data: any): Promise<void> {
        const message = data.entry[0].changes[0].value.messages[0];
        const from = message.from; // e.g. "237699123456"
        const text = message.text?.body || '';
        const timestamp = new Date(parseInt(message.timestamp) * 1000);

        // 1. Normalize number and find agent
        const normalizedFrom = from.replace(/\D/g, ''); // Keep only digits
        const agents = await this.agentRepo.find();
        const agent = agents.find(a => {
            const agentPhone = a.telephone.replace(/\D/g, '');
            return agentPhone === normalizedFrom || normalizedFrom.endsWith(agentPhone);
        });

        if (!agent) {
            this.logger.warn(`Received message from unknown number: ${from}`);
        }

        // 2. Save Log
        await this.messageLogRepo.save({
            from: from,
            to: 'SYSTEM',
            content: text,
            direction: MessageDirection.INBOUND,
            status: MessageStatus.UNREAD,
            agentId: agent?.id,
            tenantId: agent?.tenantId || 'HGD-DOUALA',
            timestamp: timestamp,
        });

        // 3. Chatbot Logic
        const command = text.toUpperCase().trim();
        if (agent) {
            switch (command) {
                case 'PLANNING':
                    await this.handlePlanningCommand(agent);
                    break;
                case 'GARDE':
                    await this.handleGardeCommand(agent);
                    break;
                default:
                    // Just stay unread for admin
                    break;
            }
        }
    }

    private async handlePlanningCommand(agent: Agent) {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 });
        const end = endOfWeek(new Date(), { weekStartsOn: 1 });

        const shifts = await this.shiftRepo.createQueryBuilder('shift')
            .where('shift.agentId = :agentId', { agentId: agent.id })
            .andWhere('shift.start >= :start', { start })
            .andWhere('shift.end <= :end', { end })
            .orderBy('shift.start', 'ASC')
            .getMany();

        if (shifts.length === 0) {
            await this.sendMessage(agent.telephone, "Vous n'avez aucun shift prévu pour cette semaine.");
        } else {
            let msg = `📅 Votre planning de la semaine :\n`;
            shifts.forEach(s => {
                const dateStr = s.start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                const timeStr = `${s.start.getHours()}:${String(s.start.getMinutes()).padStart(2, '0')}`;
                msg += `- ${dateStr} à ${timeStr} (${s.type || 'Service'})\n`;
            });
            await this.sendMessage(agent.telephone, msg);
        }
    }

    private async handleGardeCommand(agent: Agent) {
        const nextGarde = await this.shiftRepo.createQueryBuilder('shift')
            .where('shift.agentId = :agentId', { agentId: agent.id })
            .andWhere('shift.start >= :now', { now: new Date() })
            .andWhere('shift.type = :type', { type: 'GARDE' })
            .orderBy('shift.start', 'ASC')
            .getOne();

        if (!nextGarde) {
            await this.sendMessage(agent.telephone, "Vous n'avez aucune garde prévue prochainement.");
        } else {
            const dateStr = nextGarde.start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            const timeStr = `${nextGarde.start.getHours()}:${String(nextGarde.start.getMinutes()).padStart(2, '0')}`;
            await this.sendMessage(agent.telephone, `🏥 Votre prochaine garde est prévue le ${dateStr} à ${timeStr}.`);
        }
    }
}
