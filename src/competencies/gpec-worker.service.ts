import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { AgentCompetency } from './entities/agent-competency.entity';
import { AgentAlert, AlertSeverity, AlertType } from '../agents/entities/agent-alert.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class GpecWorkerService {
    private readonly logger = new Logger(GpecWorkerService.name);

    constructor(
        @InjectRepository(AgentCompetency)
        private agentCompRepository: Repository<AgentCompetency>,
        @InjectRepository(AgentAlert)
        private alertRepository: Repository<AgentAlert>,
        private whatsappService: WhatsappService
    ) {}

    // Runs every night at 2:00 AM
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async scanExpiringCompetencies() {
        this.logger.log('Starting daily GPEC (Competencies) expiration scan...');
        
        await this.handleExpiringCompetencies();
        await this.handleExpiredCompetencies();
        
        this.logger.log('GPEC scan completed.');
    }

    private async handleExpiringCompetencies() {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiring = await this.agentCompRepository.find({
            where: {
                expirationDate: LessThanOrEqual(thirtyDaysFromNow),
            },
            relations: ['agent', 'competency']
        });

        for (const ac of expiring) {
            // Check if already completely expired -> dealt with in handleExpiredCompetencies
            if (ac.expirationDate && ac.expirationDate.getTime() <= now.getTime()) {
                continue;
            }

            const alertTitle = `PRÉVENIR_EXPIRATION_J30_${ac.id}`;
            const existingAlert = await this.alertRepository.findOne({
                where: { 
                    agent: { id: ac.agent.id }, 
                    type: AlertType.GPEC, 
                    message: alertTitle 
                }
            });

            if (!existingAlert && ac.agent.telephone) {
                // Formatting Date
                const expireStr = ac.expirationDate.toLocaleDateString('fr-FR');
                const message = `🏥 Bonjour ${ac.agent.firstName},
                
⚠️ *RAPPEL GPEC*
Votre habilitation *${ac.competency.name}* arrivera à expiration le ${expireStr} (dans moins de 30 jours). 

Merci de transmettre votre nouvelle attestation au service des Ressources Humaines dès que possible pour éviter toute restriction sur vos prochaines gardes.
(Vous pouvez aussi prendre l'attestation en photo et l'envoyer directement ici en réponse).`;

                try {
                    await this.whatsappService.sendMessage(ac.agent.telephone, message);
                    this.logger.log(`J-30 Alert sent to ${ac.agent.telephone} for competency ${ac.competency.name}`);
                    
                    // Trace the alert so we don't spam tomorrow
                    const alert = this.alertRepository.create({
                        agentId: ac.agent.id,
                        tenantId: ac.agent.tenantId,
                        type: AlertType.GPEC,
                        severity: AlertSeverity.MEDIUM,
                        message: alertTitle,
                        metadata: { competencyId: ac.competency.id }
                    });
                    await this.alertRepository.save(alert);
                } catch (e) {
                    this.logger.error(`Could not send WhatsApp for J-30 GPEC to Agent ID ${ac.agent.id}: ${e.message}`);
                }
            }
        }
    }

    private async handleExpiredCompetencies() {
        const now = new Date();

        const expired = await this.agentCompRepository.find({
            where: {
                expirationDate: LessThanOrEqual(now),
            },
            relations: ['agent', 'competency']
        });

        for (const ac of expired) {
            const alertTitle = `ALERTE_EXPIRATION_J0_${ac.id}`;
            const existingAlert = await this.alertRepository.findOne({
                where: { 
                    agent: { id: ac.agent.id }, 
                    type: AlertType.GPEC, 
                    message: alertTitle 
                }
            });

            if (!existingAlert && ac.agent.telephone) {
                const message = `🚨 *ALERTE BLOQUANTE GPEC* 🚨

Bonjour ${ac.agent.firstName},
Votre habilitation *${ac.competency.name}* est officiellement expirée depuis le ${ac.expirationDate.toLocaleDateString('fr-FR')}. 

Conformément à la réglementation, *vous n'êtes plus autorisé(e)* à effectuer des gardes nécessitant cette compétence.

Veuillez transmettre *urgemment* l'attestation de recyclage à ce numéro ou vous rapprocher des RH.`;

                try {
                    await this.whatsappService.sendMessage(ac.agent.telephone, message);
                    this.logger.warn(`J-0 Blocking Alert sent to ${ac.agent.telephone} for competency ${ac.competency.name}`);
                    
                    const alert = this.alertRepository.create({
                        agentId: ac.agent.id,
                        tenantId: ac.agent.tenantId,
                        type: AlertType.GPEC,
                        severity: AlertSeverity.HIGH,
                        message: alertTitle,
                        metadata: { competencyId: ac.competency.id, isExpired: true }
                    });
                    await this.alertRepository.save(alert);
                } catch (e) {
                    this.logger.error(`Could not send WhatsApp for J-0 GPEC to Agent ID ${ac.agent.id}: ${e.message}`);
                }
            }
        }
    }
}
