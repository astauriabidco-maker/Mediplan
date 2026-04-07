import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan, LessThan, In } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { Agent, UserStatus } from '../agents/entities/agent.entity';
import { ShiftApplication, ShiftApplicationStatus } from './entities/shift-application.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class UnderstaffingService {
    private readonly logger = new Logger(UnderstaffingService.name);

    constructor(
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(ShiftApplication)
        private shiftApplicationRepository: Repository<ShiftApplication>,
        private whatsappService: WhatsappService,
        private eventsGateway: EventsGateway
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async checkUnderstaffing() {
        this.logger.log('Scannning for vacant shifts (Understaffing Alarm)...');
        
        const now = new Date();

        // 1. First Pass: Local Broadcast
        const vacantShiftsToLocal = await this.shiftRepository.find({
            where: { agent: IsNull(), status: 'PLANNED', start: MoreThan(now) },
            relations: ['facility']
        });

        for (const shift of vacantShiftsToLocal) {
            const eligibleAgents = await this.agentRepository.find({
                where: { status: UserStatus.ACTIVE, facilityId: shift.facilityId }
            });

            this.logger.log(`Found vacant shift ${shift.id}, broadcasting locally to ${eligibleAgents.length} agents in facility ${shift.facilityId}`);
            
            shift.status = 'BROADCASTED_LOCAL';
            await this.shiftRepository.save(shift);
            this.eventsGateway.broadcastVigieUpdate();

            for (const agent of eligibleAgents) {
                if (!agent.telephone) continue;
                this.whatsappService.sendMessage(agent.telephone, `🚨 ALERTE LOCALE 🚨\nUne garde est libre au site.\nRépondez "PRENDRE ${shift.id}" pour candidater.`).catch(() => {});
            }
        }

        // 2. Second Pass: GHT Escalation (1 hour later, simulated as 1 min for demo or based on last update)
        // Here we just find shifts that are 'BROADCASTED_LOCAL'
        // In real app we compare updatedAt, here we just broadcast to the rest of the GHT
        const vacantShiftsToGHT = await this.shiftRepository.find({
            where: { agent: IsNull(), status: 'BROADCASTED_LOCAL', start: MoreThan(now) },
            relations: ['facility']
        });

        for (const shift of vacantShiftsToGHT) {
            // We simulate that 1 hour has passed if it's already BROADCASTED_LOCAL
            // Real logic: if (now.getTime() - shift.updatedAt.getTime() > 3600000)
            
            const ghtAgents = await this.agentRepository.find({
                where: { status: UserStatus.ACTIVE }
            });
            const externalAgents = ghtAgents.filter(a => a.facilityId !== shift.facilityId);

            this.logger.log(`Escalating shift ${shift.id} to ${externalAgents.length} external GHT agents`);
            
            shift.status = 'BROADCASTED_GHT';
            await this.shiftRepository.save(shift);
            this.eventsGateway.broadcastVigieUpdate();

            for (const agent of externalAgents) {
                if (!agent.telephone) continue;
                this.whatsappService.sendMessage(agent.telephone, `🚨 ESCALADE GHT 🚨\nLe site ${shift.facility?.name || 'Voisin'} est en détresse.\nRépondez "PRENDRE ${shift.id}". (Validation RH requise pour prime de déplacement).`).catch(() => {});
            }
        }
    }

    // Runs periodically to resolve pending applications
    @Cron(CronExpression.EVERY_5_MINUTES)
    async resolveApplications() {
        this.logger.log('Resolving pending Shift Applications...');

        // Group applications by shift
        const pendingApps = await this.shiftApplicationRepository.find({
            where: { status: ShiftApplicationStatus.PENDING },
            relations: ['shift', 'agent']
        });

        if (pendingApps.length === 0) return;

        const shiftIds = [...new Set(pendingApps.map(app => app.shift.id))];

        for (const shiftId of shiftIds) {
            const appsForShift = pendingApps.filter(app => app.shift.id === shiftId);
            
            // Intelligence: sort by highest score (distance + legal compliance representation)
            appsForShift.sort((a, b) => (b.score || 0) - (a.score || 0));

            const bestCandidate = appsForShift[0];

            // Assign shift to the best candidate
            const shift = await this.shiftRepository.findOne({ where: { id: shiftId } });
            if (shift && !shift.agent) {
                const isExternalGHT = bestCandidate.agent.facilityId !== shift.facilityId;

                shift.agent = bestCandidate.agent; // Assign but mark status accordingly
                
                if (isExternalGHT) {
                    shift.status = 'PENDING_GHT_APPROVAL'; // Needs Supervisor review
                    bestCandidate.status = ShiftApplicationStatus.PENDING_GHT_APPROVAL;
                    this.logger.log(`Shift ${shift.id} assigned to GHT agent ${bestCandidate.agent.id}, awaiting approval.`);
                    this.whatsappService.sendMessage(bestCandidate.agent.telephone, `⏳ Votre candidature pour la garde #${shift.id} (Hors Site) a été pré-sélectionnée ! En attente de validation du Superviseur RH GHT pour autorisation de déplacement.`).catch(() => {});
                } else {
                    shift.status = 'PUBLISHED'; // Officially assigned
                    bestCandidate.status = ShiftApplicationStatus.ACCEPTED;
                    this.whatsappService.sendMessage(bestCandidate.agent.telephone, `🎉 Félicitations ! Votre candidature pour la garde #${shift.id} a été retenue par notre algorithme intelligent et vient de vous être affectée.`).catch(() => {});
                }
                
                await this.shiftRepository.save(shift);
                await this.shiftApplicationRepository.save(bestCandidate);

                this.eventsGateway.broadcastPlanningUpdate();

                // Reject others
                const rejectedApps = appsForShift.slice(1);
                for (const rejectedApp of rejectedApps) {
                    rejectedApp.status = ShiftApplicationStatus.REJECTED;
                    await this.shiftApplicationRepository.save(rejectedApp);
                    this.whatsappService.sendMessage(rejectedApp.agent.telephone, `❌ Désolé, la garde #${shift.id} a été attribuée à un collègue plus proche ou prioritaire sur la conformité légale.`).catch(() => {});
                }
            } else {
                // If the shift was manually filled in the meantime, reject all.
                for (const app of appsForShift) {
                    app.status = ShiftApplicationStatus.REJECTED;
                    await this.shiftApplicationRepository.save(app);
                }
            }
        }
    }
}
