import { Controller, Post, Body, Headers, UnauthorizedException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Agent, UserStatus } from '../agents/entities/agent.entity';
import { Shift } from './entities/shift.entity';
import { SettingsService } from '../settings/settings.service';
import { startOfDay, endOfDay, differenceInMinutes, parseISO, isAfter } from 'date-fns';

@Controller('attendance')
export class AttendanceController {
    constructor(
        @InjectRepository(Attendance)
        private attendanceRepo: Repository<Attendance>,
        @InjectRepository(Agent)
        private agentRepo: Repository<Agent>,
        @InjectRepository(Shift)
        private shiftRepo: Repository<Shift>,
        private settingsService: SettingsService,
    ) {}

    /**
     * Endpoint ouvert pour les terminaux IoT physiques (Badgeuses ZKTeco, Bodet, etc.)
     * Les machines physiques authentifient via un Token Hardware.
     */
    @Post('hardware-sync')
    async syncFromHardware(
        @Headers('x-device-token') hardwareToken: string,
        @Body() payload: { 
            deviceId: string; 
            agentIdOrMatricule: string; 
            entryType: 'IN' | 'OUT'; 
            timestamp: string 
        }
    ) {
        // En vrai production, valider le hardwareToken contre la table Device/Terminal
        if (!hardwareToken) {
            throw new UnauthorizedException("Jeton matériel manquant.");
        }

        const agent = await this.agentRepo.findOne({ 
            where: { matricule: payload.agentIdOrMatricule } 
        });

        if (!agent) {
             // Retourner succès pour ne pas bloquer l'IoT, mais logger l'échec
             console.warn(`Badgeuse [${payload.deviceId}] : matricule inconnu ${payload.agentIdOrMatricule}`);
             return { status: 'ignored', reason: 'unknown_agent' };
        }

        const log = this.attendanceRepo.create({
            tenantId: agent.tenantId,
            agent: agent,
            type: payload.entryType,
            timestamp: new Date(payload.timestamp || Date.now()),
            source: 'BADGEUSE_PHYSIQUE',
            locationGPS: payload.deviceId // We use locationGPS to store the Terminal ID for trace
        });

        await this.attendanceRepo.save(log);

        return { status: 'success', recordedAt: log.timestamp };
    }

    /**
     * Endpoint API (Sécurisé par le frontend) pour obtenir le statut global d'assiduité du jour.
     */
    @Get('daily-status')
    async getDailyStatus(@Query('tenantId') tenantId: string, @Query('date') dateString: string) {
        if (!tenantId) throw new UnauthorizedException("Tenant ID missing");

        const targetDate = dateString ? new Date(dateString) : new Date();
        const start = startOfDay(targetDate);
        const end = endOfDay(targetDate);

        // Fetch tolerance configuration
        let lateTolerance = await this.settingsService.getSetting(tenantId, null, 'ATTENDANCE_LATE_MARGIN_MINUTES');
        if (lateTolerance === null || lateTolerance === undefined) {
             lateTolerance = await this.settingsService.getSetting('GLOBAL', null, 'ATTENDANCE_LATE_MARGIN_MINUTES') || 15;
        }

        // Fetch all active agents
        const agents = await this.agentRepo.find({ where: { tenantId, status: UserStatus.ACTIVE }, relations: ['hospitalService'] });

        // Fetch today's shifts
        const shifts = await this.shiftRepo.find({
            where: { tenantId, start: Between(start, end) }
        });

        // Fetch today's attendance logs
        const attendances = await this.attendanceRepo.find({
            where: { tenantId, timestamp: Between(start, end) },
            relations: ['agent'],
            order: { timestamp: 'ASC' }
        });

        const statusReport = agents.map(agent => {
            const agentShifts = shifts.filter(s => s.postId === agent.id.toString());
            const agentAttendances = attendances.filter(a => a.agent.id === agent.id);

            // Get earliest IN punch
            const firstInLog = agentAttendances.find(a => a.type === 'IN');
            const firstIn = firstInLog?.timestamp || null;
            const firstInSource = firstInLog?.source || null;
            const firstInLocation = firstInLog?.locationGPS || null;
            // Get latest OUT punch
            const logsOut = agentAttendances.filter(a => a.type === 'OUT');
            const lastOut = logsOut.length > 0 ? logsOut[logsOut.length - 1].timestamp : null;

            let status = 'OFF';
            let delayMinutes = 0;
            let currentShift = null;

            if (agentShifts.length > 0) {
                // Focus on the first shift of the day for simplicity
                currentShift = agentShifts[0];
                
                if (firstIn) {
                    // Check lateness
                    const diff = differenceInMinutes(firstIn, currentShift.start);
                    delayMinutes = diff > 0 ? diff : 0;

                    if (delayMinutes > lateTolerance) {
                        status = 'LATE';
                    } else {
                        status = 'PRESENT_ON_TIME';
                    }
                } else {
                    // No IN punch yet. Is it past shift start time?
                    if (isAfter(new Date(), currentShift.start)) {
                        status = 'ABSENT';
                    } else {
                        status = 'PLANNED'; // Not started yet
                    }
                }
            } else {
                if (firstIn) {
                    status = 'EXTRA_SHIFT';
                }
            }

            return {
                agent: {
                    id: agent.id,
                    firstName: agent.firstName,
                    lastName: agent.lastName,
                    jobTitle: agent.jobTitle,
                    serviceName: agent.hospitalService?.name || 'Général'
                },
                shift: currentShift ? {
                    id: currentShift.id,
                    start: currentShift.start,
                    end: currentShift.end,
                    type: currentShift.type
                } : null,
                attendance: {
                    firstIn,
                    firstInSource,
                    firstInLocation,
                    lastOut,
                    delayMinutes,
                    lateTolerance // Provide it so UI can display it
                },
                status
            };
        });

        return statusReport;
    }
}
