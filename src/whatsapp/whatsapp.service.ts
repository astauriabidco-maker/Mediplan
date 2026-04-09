import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog, MessageDirection, MessageStatus } from './entities/message-log.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Shift } from '../planning/entities/shift.entity';
import { ShiftApplication, ShiftApplicationStatus } from '../planning/entities/shift-application.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { startOfWeek, endOfWeek, parse } from 'date-fns';
import { LeavesService } from '../planning/leaves.service';
import { LeaveType } from '../planning/entities/leave.entity';
import { forwardRef, Inject } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

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
        @InjectRepository(ShiftApplication)
        private shiftApplicationRepo: Repository<ShiftApplication>,
        @InjectRepository(Attendance)
        private attendanceRepo: Repository<Attendance>,
        private configService: ConfigService,
        @Inject(forwardRef(() => LeavesService))
        private leavesService: LeavesService,
        private settingsService: SettingsService,
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
        const agents = await this.agentRepo.find({ relations: ['facility'] });
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
        if (message.type === 'location' && agent) {
            await this.handleLocationPointage(agent, message.location.latitude, message.location.longitude);
            return;
        }

        const commandText = text.toUpperCase().trim();
        
        const prendreMatch = commandText.match(/^PRENDRE\s+(\d+)$/);
        // CONGE 15/06 AU 20/06 MALADIE (exemple)
        const congeMatch = commandText.match(/^CONGE\s+([0-9]{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?)\s+AU\s+([0-9]{1,2}\/[0-9]{1,2}(?:\/[0-9]{2,4})?)(?:\s+(.*))?$/);
        
        if (agent) {
            if (prendreMatch) {
                await this.handlePrendreCommand(agent, parseInt(prendreMatch[1]));
            } else if (congeMatch) {
                await this.handleCongeCommand(agent, congeMatch[1], congeMatch[2], congeMatch[3]);
            } else {
                switch (commandText) {
                    case 'PLANNING':
                        await this.handlePlanningCommand(agent);
                        break;
                    case 'GARDE':
                        await this.handleGardeCommand(agent);
                        break;
                    case 'ARRIVÉE':
                    case 'ARRIVEE':
                        await this.handlePointage(agent, 'IN', text); // text string can contain location pin
                        break;
                    case 'DEPART':
                    case 'DÉPART':
                        await this.handlePointage(agent, 'OUT', text);
                        break;
                    default:
                        // Just stay unread for admin
                        break;
                }
            }
        }
    }

    private async handleLocationPointage(agent: Agent, lat: number, lng: number) {
        if (!agent.facility || !agent.facility.latitude || !agent.facility.longitude) {
            await this.sendMessage(agent.telephone, `❌ Pointage refusé. Votre établissement n'a pas de coordonnées GPS configurées dans le système.`);
            return;
        }

        const radiusStr = await this.settingsService.getSetting(agent.tenantId, agent.facilityId, 'ATTENDANCE_GEOFENCE_RADIUS_METERS') || "500";
        const maxRadius = parseFloat(radiusStr);

        // Distance de Haversine
        const R = 6371e3; // metres
        const φ1 = agent.facility.latitude * Math.PI/180;
        const φ2 = lat * Math.PI/180;
        const Δφ = (lat - agent.facility.latitude) * Math.PI/180;
        const Δλ = (lng - agent.facility.longitude) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // en mètres

        if (distance > maxRadius) {
            await this.sendMessage(agent.telephone, `❌ Pointage refusé. Vous êtes à ${Math.round(distance)} mètres de l'hôpital. Le rayon autorisé est de ${maxRadius} mètres.`);
            return;
        }

        // Calcul dynamique IN ou OUT
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const logsToday = await this.attendanceRepo.createQueryBuilder('att')
            .where('att.agentId = :agentId', { agentId: agent.id })
            .andWhere('att.timestamp >= :start', { start: startOfDay })
            .andWhere('att.timestamp <= :end', { end: endOfDay })
            .orderBy('att.timestamp', 'ASC')
            .getMany();

        const inLog = logsToday.find(l => l.type === 'IN');
        const type = inLog ? 'OUT' : 'IN';

        // Record attendance
        const attendance = this.attendanceRepo.create({
            tenantId: agent.tenantId,
            agent: agent,
            type: type,
            timestamp: new Date(),
            source: 'WHATSAPP',
            locationGPS: `${lat},${lng}`
        });

        await this.attendanceRepo.save(attendance);

        const typeStr = type === 'IN' ? 'ARRIVÉE' : 'DÉPART';
        const timeStr = attendance.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        await this.sendMessage(agent.telephone, `✅ Pointage GPS de *${typeStr}* validé à ${timeStr} (${Math.round(distance)}m).`);
    }

    private async handlePointage(agent: Agent, type: 'IN' | 'OUT', rawText: string) {
        // Fallback for manual text pointage if needed, though they should use GPS
        const attendance = this.attendanceRepo.create({
            tenantId: agent.tenantId,
            agent: agent,
            type: type,
            timestamp: new Date(),
            source: 'WHATSAPP',
            locationGPS: undefined
        });

        await this.attendanceRepo.save(attendance);

        const typeStr = type === 'IN' ? 'ARRIVÉE' : 'DÉPART';
        const timeStr = attendance.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        await this.sendMessage(agent.telephone, `✅ Pointage de *${typeStr}* confirmé à ${timeStr}. Pensez à utiliser le partage de position GPS !`);
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

    private async handlePrendreCommand(agent: Agent, shiftId: number) {
        const shift = await this.shiftRepo.findOne({ where: { id: shiftId } });
        if (!shift) {
            await this.sendMessage(agent.telephone, `Désolé, la garde #${shiftId} n'existe pas.`);
            return;
        }

        if (shift.agent) {
            await this.sendMessage(agent.telephone, `Désolé, la garde #${shiftId} a déjà été pourvue.`);
            return;
        }

        // Mock Scoring (Intelligence): Distance calculation vs Legal Strict Score
        // To be computed later by cron. We store the application.
        const mockDistanceKm = agent.zipCode === '237' ? Math.random() * 5 : Math.random() * 20 + 5; 
        const distanceScore = Math.max(0, 100 - mockDistanceKm * 2); // closer = better score

        const application = this.shiftApplicationRepo.create({
            shift,
            agent,
            tenantId: agent.tenantId,
            status: ShiftApplicationStatus.PENDING,
            score: distanceScore
        });

        await this.shiftApplicationRepo.save(application);

        await this.sendMessage(agent.telephone, `✅ Ta candidature pour la garde #${shiftId} a bien été enregistrée. Le système intelligent étudie les critères légaux et la distance pour départager. Tu auras une réponse sous 15 minutes.`);
    }

    private async handleCongeCommand(agent: Agent, startStr: string, endStr: string, reasonPart: string = '') {
        try {
            const currentYear = new Date().getFullYear();
            
            // Allow DD/MM or DD/MM/YYYY
            const formatStrStart = startStr.length <= 5 ? 'dd/MM/yyyy' : 'dd/MM/yyyy';
            const fullStartStr = startStr.length <= 5 ? `${startStr}/${currentYear}` : startStr;
            const fullEndStr = endStr.length <= 5 ? `${endStr}/${currentYear}` : endStr;

            const startDate = parse(fullStartStr, 'dd/MM/yyyy', new Date());
            const endDate = parse(fullEndStr, 'dd/MM/yyyy', new Date());

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                await this.sendMessage(agent.telephone, `❌ Format de date invalide. Utilisez JJ/MM ou JJ/MM/AAAA.`);
                return;
            }

            let type = LeaveType.CONGE_ANNUEL;
            let reason = reasonPart.trim() || 'Congés demandés via WhatsApp';
            
            if (reasonPart.includes('MALADIE')) {
                type = LeaveType.MALADIE;
            } else if (reasonPart.includes('FORMATION')) {
                type = LeaveType.AUTRE;
            }

            // Invoking exact backend logic
            const leave = await this.leavesService.requestLeave(
                agent.tenantId,
                agent.id,
                startDate,
                endDate,
                type,
                reason,
                agent.id
            );

            let message = `✅ Votre demande de congé du *${fullStartStr}* au *${fullEndStr}* a bien été générée.`;
            
            if (leave.isAutoRejected) {
                message = `❌ ALERTE : Votre demande a été REFUSÉE automatiquement en raison de la violation du Code du Travail (Loi anti-carence). Veuillez contacter les RH urgemment.`;
            } else if (leave.aiScore && leave.aiScore > 50) {
                message += `\n🤖 *Avis IA* : Un risque de sous-effectif a été détecté. Votre manager étudiera la demande sous peu.`;
            } else {
                message += `\n🤖 *Avis IA* : Aucun risque opérationnel détecté. En attente de validation Manager.`;
            }

            await this.sendMessage(agent.telephone, message);

        } catch (error) {
            this.logger.error(`Failed to handle WhatsApp leave request: ${error.message}`);
            await this.sendMessage(agent.telephone, `❌ Erreur lors du traitement de la demande de congé: ${error.message}`);
        }
    }
}
