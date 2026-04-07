import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { Leave } from './entities/leave.entity';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';
import { Agent } from '../agents/entities/agent.entity';
import { WorkPolicy } from './entities/work-policy.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { ShiftApplication, ShiftApplicationStatus } from './entities/shift-application.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventsGateway } from '../events/events.gateway';
import { DocumentsService } from '../documents/documents.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PlanningService {
    constructor(
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Leave)
        private leaveRepository: Repository<Leave>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(WorkPolicy)
        private workPolicyRepository: Repository<WorkPolicy>,
        @InjectRepository(ShiftApplication)
        private shiftApplicationRepository: Repository<ShiftApplication>,
        @Inject(LOCALE_RULES)
        private localeRules: ILocaleRules,
        private auditService: AuditService,
        private whatsappService: WhatsappService,
        private eventsGateway: EventsGateway,
        private documentsService: DocumentsService,
        private settingsService: SettingsService,
    ) { }

    async validateShift(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean> {
        // 0. Get Dynamic Constraints
        const constraints = await this.getConstraintsForAgent(tenantId, agentId);

        // 1. Check Leaves
        const isAvailable = await this.checkLeaveAvailability(tenantId, agentId, start, end);
        if (!isAvailable) {
            return false;
        }

        // 2. Check Weekly Limit (Global Rule for now, could be dynamic later)
        const weeklyLimit = await this.settingsService.getSetting(tenantId, null, 'planning.weekly_hours_limit') || 48;
        const currentWeeklyHours = await this.getWeeklyHours(tenantId, agentId, start);
        const shiftDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (currentWeeklyHours + shiftDuration > weeklyLimit) {
            return false;
        }

        // 3. Dynamic Rules Check: Max Guard Duration
        if (shiftDuration > constraints.maxGuardDuration) {
            return false; // Exceeds specific max duration for this agent's grade/service
        }

        // 4. Dynamic Rules Check: Rest Hours After Guard
        // Check previous shift
        const previousShift = await this.shiftRepository.createQueryBuilder('shift')
            .where('shift.agentId = :agentId', { agentId })
            .andWhere('shift.end <= :start', { start })
            .orderBy('shift.end', 'DESC')
            .getOne();

        if (previousShift) {
            const restTime = (start.getTime() - previousShift.end.getTime()) / (1000 * 60 * 60);
            if (restTime < constraints.restHoursAfterGuard) {
                return false; // Not enough rest after previous shift
            }
        }

        // 5. Cross-Facility Overlap Check
        // Ensure the agent doesn't have an overlapping shift on ANY facility in this tenant
        const overlappingShift = await this.shiftRepository.createQueryBuilder('shift')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.agentId = :agentId', { agentId })
            .andWhere('shift.start < :end', { end })
            .andWhere('shift.end > :start', { start })
            .getOne();

        if (overlappingShift) {
            return false;
        }

        return true;
    }

    private async getConstraintsForAgent(tenantId: string, agentId: number) {
        // Default values from LocaleRules or Hardcoded defaults
        const defaults = {
            restHoursAfterGuard: 24, // Standard default
            maxGuardDuration: 24,
            onCallCompensationPercent: 0,
        };

        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['hospitalService', 'grade']
        });

        if (!agent) return defaults;

        // Funnel Logic:
        // 1. Service + Grade
        // 2. Grade only
        // 3. Service only

        let policy: WorkPolicy | null = null;

        if (agent.hospitalServiceId && agent.gradeId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    hospitalServiceId: agent.hospitalServiceId,
                    gradeId: agent.gradeId
                }
            });
        }

        if (!policy && agent.gradeId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    gradeId: agent.gradeId,
                    hospitalServiceId: IsNull() // Explicitly null to avoid mixing with service rules
                }
            });
        }

        if (!policy && agent.hospitalServiceId) {
            policy = await this.workPolicyRepository.findOne({
                where: {
                    tenantId,
                    hospitalServiceId: agent.hospitalServiceId,
                    gradeId: IsNull()
                }
            });
        }

        if (policy) {
            return {
                restHoursAfterGuard: policy.restHoursAfterGuard,
                maxGuardDuration: policy.maxGuardDuration,
                onCallCompensationPercent: policy.onCallCompensationPercent,
            };
        }

        return defaults;
    }

    // Helper to check overlapping APPROVED leaves (Public for Optimization)
    public async checkAvailability(tenantId: string, agentId: number, date: Date): Promise<boolean> {
        return this.checkLeaveAvailability(tenantId, agentId, date, date);
    }

    // New helper to check overlapping APPROVED leaves
    private async checkLeaveAvailability(tenantId: string, agentId: number, start: Date, end: Date): Promise<boolean> {
        const count = await this.leaveRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status = :status', { status: 'APPROVED' }) // Hardcoded enum string to avoid import coupling issues if any
            .andWhere('leave.start < :end', { end })
            .andWhere('leave.end > :start', { start })
            .getCount();

        return count === 0;
    }

    public async getWeeklyHours(tenantId: string, agentId: number, date: Date): Promise<number> {
        // Basic calculation for the current week starting Monday
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const shifts = await this.shiftRepository.find({
            where: {
                agent: { id: agentId },
                tenantId: tenantId, // Filter by tenant
                start: Between(startOfWeek, endOfWeek),
            },
        });

        return shifts.reduce((total, shift) => {
            const duration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
            return total + duration;
        }, 0);
    }

    async getShifts(tenantId: string, start: Date, end: Date, facilityId?: number, serviceId?: number): Promise<Shift[]> {
        const query = this.shiftRepository.createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .leftJoinAndSelect('shift.facility', 'facility')
            .where('shift.tenantId = :tenantId', { tenantId: tenantId || 'DEFAULT_TENANT' })
            .andWhere('shift.start >= :start', { start })
            .andWhere('shift.end <= :end', { end });
            
        if (facilityId) {
            query.andWhere('shift.facilityId = :facilityId', { facilityId });
        }

        if (serviceId) {
            query.andWhere('agent.hospitalServiceId = :serviceId', { serviceId });
        }
            
        return query.getMany();
    }

    async assignReplacement(tenantId: string, agentId: number, start: Date, end: Date, postId: string): Promise<Shift> {
        const isValid = await this.validateShift(tenantId, agentId, start, end);
        if (!isValid) {
            throw new Error('Agent cannot take this replacement (weekly hours limit).');
        }

        const shift = this.shiftRepository.create({
            tenantId,
            agent: { id: agentId } as any,
            start,
            end,
            postId,
            status: 'VALIDATED'
        });

        const savedShift = await this.shiftRepository.save(shift);

        await this.auditService.log(
            tenantId,
            agentId, // Actor is the agent for now, or should be requester? In context of Replacement, usually a manager. 
            // Controller pass req.user.id but assignReplacement doesn't take actorId.
            // I will update signature or assume requesterId is needed.
            AuditAction.CREATE,
            AuditEntityType.SHIFT,
            savedShift.id,
            { postId, start, end }
        );

        return savedShift;
    }

    async updateShift(tenantId: string, shiftId: string | number, start: Date, end: Date, actorId: number): Promise<Shift> {
        const shift = await this.shiftRepository.findOne({
            where: { id: Number(shiftId), tenantId },
            relations: ['agent']
        });

        if (!shift) {
            throw new Error('Shift not found');
        }

        if (shift.agent) {
             const isValid = await this.validateShift(tenantId, shift.agent.id, start, end);
             if (!isValid) {
                 throw new Error('Agent cannot work this schedule (validation failed).');
             }
        }

        shift.start = start;
        shift.end = end;

        const savedShift = await this.shiftRepository.save(shift);

        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.UPDATE,
            AuditEntityType.SHIFT,
            savedShift.id,
            { start, end }
        );

        return savedShift;
    }

    async getShiftApplications(tenantId: string): Promise<ShiftApplication[]> {
        return this.shiftApplicationRepository.find({
            where: { tenantId },
            relations: ['agent', 'shift', 'shift.facility'],
            order: { appliedAt: 'DESC' }
        });
    }

    async approveGhtApplication(tenantId: string, applicationId: string | number, actorId: number): Promise<ShiftApplication> {
        const application = await this.shiftApplicationRepository.findOne({
            where: { id: Number(applicationId), tenantId },
            relations: ['shift', 'agent']
        });

        if (!application) throw new Error('Application not found');
        if (application.status !== ShiftApplicationStatus.PENDING_GHT_APPROVAL) throw new Error('Application is not pending GHT approval');

        // Approve
        application.status = ShiftApplicationStatus.ACCEPTED;
        const shift = await this.shiftRepository.findOne({ where: { id: application.shift.id, tenantId } });
        
        if (shift) {
            shift.status = 'PUBLISHED';
            await this.shiftRepository.save(shift);
        }

        await this.shiftApplicationRepository.save(application);

        // Notify Agent
        if (application.agent.telephone) {
            this.whatsappService.sendMessage(
                application.agent.telephone, 
                `✅ Bonne nouvelle ! Le Superviseur RH GHT a validé votre déplacement pour la garde #${application.shift.id}. La garde vous est officiellement affectée.`
            ).catch(() => {});
        }

        await this.auditService.log(tenantId, actorId, AuditAction.UPDATE, AuditEntityType.SHIFT, shift?.id || 0, { action: 'approve_ght' });
        
        this.eventsGateway.broadcastPlanningUpdate();

        // 3. Generate Contract Auto and trigger GED/WhatsApp 2FA
        await this.documentsService.generateContractForShift(tenantId, shift, application.agent);

        return application;
    }

    async rejectGhtApplication(tenantId: string, applicationId: string | number, actorId: number): Promise<ShiftApplication> {
        const application = await this.shiftApplicationRepository.findOne({
            where: { id: Number(applicationId), tenantId },
            relations: ['shift', 'agent']
        });

        if (!application) throw new Error('Application not found');
        if (application.status !== ShiftApplicationStatus.PENDING_GHT_APPROVAL) throw new Error('Application is not pending GHT approval');

        // Reject
        application.status = ShiftApplicationStatus.REJECTED;
        
        const shift = await this.shiftRepository.findOne({ where: { id: application.shift.id, tenantId } });
        if (shift) {
            // Re-open shift by unassigning
            shift.agent = null as any;
            shift.status = 'BROADCASTED_GHT'; // or PLANNED
            await this.shiftRepository.save(shift);
        }

        await this.shiftApplicationRepository.save(application);

        // Notify
        if (application.agent.telephone) {
            this.whatsappService.sendMessage(
                application.agent.telephone, 
                `❌ Désolé, le Superviseur RH GHT a refusé la validation de votre déplacement pour la garde #${application.shift.id}.`
            ).catch(() => {});
        }

        await this.auditService.log(tenantId, actorId, AuditAction.UPDATE, AuditEntityType.SHIFT, shift?.id || 0, { action: 'reject_ght' });

        this.eventsGateway.broadcastPlanningUpdate();

        return application;
    }
}
