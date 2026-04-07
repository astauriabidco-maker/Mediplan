import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Agent } from '../agents/entities/agent.entity';

@Controller('attendance')
export class AttendanceController {
    constructor(
        @InjectRepository(Attendance)
        private attendanceRepo: Repository<Attendance>,
        @InjectRepository(Agent)
        private agentRepo: Repository<Agent>,
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
}
