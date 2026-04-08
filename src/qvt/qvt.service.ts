import { Injectable, Logger } from '@nestjs/common';

export interface ShiftInput {
    id: string | number;
    start: Date | string;
    end: Date | string;
}

export interface QvtAnalysis {
    score: number;
    metrics: {
        nbNights: number;
        nbLongShifts: number;
        hoursRest: number;
    };
    alert: boolean;
}

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';

@Injectable()
export class QvtService {
    private readonly logger = new Logger(QvtService.name);

    constructor(
        @InjectRepository(Shift) private shiftRepository: Repository<Shift>,
        @InjectRepository(Agent) private agentRepository: Repository<Agent>
    ) {}

    async getDashboard(tenantId: string, facilityId?: number, agentId?: number) {
        // Fetch agents
        const agentQuery = this.agentRepository.createQueryBuilder('agent')
            .where('agent.tenantId = :tenantId', { tenantId });
            
        if (facilityId) {
            agentQuery.andWhere('agent.facilityId = :facilityId', { facilityId });
        }
        if (agentId) {
            agentQuery.andWhere('agent.id = :agentId', { agentId });
        }

        const agents = await agentQuery.getMany();
        if (agents.length === 0) return { globalScore: 0, agents: [], metrics: { totalNights: 0, totalLongShifts: 0 } };

        // Fetch shifts for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const shiftQuery = this.shiftRepository.createQueryBuilder('shift')
            .innerJoinAndSelect('shift.agent', 'agent')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.start >= :date', { date: thirtyDaysAgo })
            .andWhere('shift.agentId IN (:...agentIds)', { agentIds: agents.map(a => a.id) });

        const recentShifts = await shiftQuery.getMany();

        // Calculate score per agent
        let totalScore = 0;
        let totalNights = 0;
        let totalLongShifts = 0;
        let validScoresCount = 0;

        const agentsStats = agents.map(agent => {
            const agentShifts = recentShifts.filter(s => s.agent.id === agent.id);
            if (agentShifts.length === 0) {
                return { agent, score: 0, metrics: { nbNights: 0, nbLongShifts: 0, hoursRest: 0 }, alert: false };
            }

            const analysis = this.calculateFatigueScore(agentShifts);
            totalScore += analysis.score;
            totalNights += analysis.metrics.nbNights;
            totalLongShifts += analysis.metrics.nbLongShifts;
            validScoresCount++;

            return {
                agent,
                ...analysis
            };
        });

        // Global metrics
        const globalScore = validScoresCount > 0 ? (totalScore / validScoresCount) : 0;
        
        return {
            globalScore: Number(globalScore.toFixed(2)),
            metrics: {
                totalNights,
                totalLongShifts
            },
            agents: agentsStats.sort((a, b) => b.score - a.score) // Sort by highest risk first
        };
    }

    calculateFatigueScore(shifts: ShiftInput[]): QvtAnalysis {
        // 1. Sort shifts chronologically
        const sortedShifts = shifts.map(s => ({
            ...s,
            start: new Date(s.start),
            end: new Date(s.end)
        })).sort((a, b) => a.start.getTime() - b.start.getTime());

        let nbNights = 0;
        let nbLongShifts = 0;
        let hoursRest = 0;

        for (let i = 0; i < sortedShifts.length; i++) {
            const shift = sortedShifts[i];
            const durationHours = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);

            // Check Long Shift (> 10h)
            if (durationHours > 10) {
                nbLongShifts++;
            }

            // Check Night Shift (> 3h between 22h and 06h)
            if (this.isNightShift(shift.start, shift.end)) {
                nbNights++;
            }

            // Calculate Rest (Difference between current start and previous end)
            if (i > 0) {
                const prevShift = sortedShifts[i - 1];
                const restDuration = (shift.start.getTime() - prevShift.end.getTime()) / (1000 * 60 * 60);
                if (restDuration > 0) {
                    hoursRest += restDuration;
                }
            }
        }

        // Formula: (NbNuits * 2) + (NbLongShifts * 1.5) - (HeuresRepos * 0.5)
        const score = (nbNights * 2) + (nbLongShifts * 1.5) - (hoursRest * 0.5);
        const alert = score > 5;

        if (alert) {
            this.logger.warn(`RISK_ALERT: Fatigue score ${score} exceeds threshold! (Nights: ${nbNights}, Long: ${nbLongShifts}, Rest: ${hoursRest}h)`);
        }

        return {
            score,
            metrics: { nbNights, nbLongShifts, hoursRest },
            alert
        };
    }

    private isNightShift(start: Date, end: Date): boolean {
        // Simple overlap check with 22h-06h window(s)
        // Check overlap duration in hours
        const nightStart = 22;
        const nightEnd = 6;

        let overlapMinutes = 0;
        let current = new Date(start.getTime());

        while (current < end) {
            const h = current.getHours();
            // Is it night hour? (>= 22 or < 6)
            if (h >= nightStart || h < nightEnd) {
                overlapMinutes++; // Granularity: minute
            }
            current.setMinutes(current.getMinutes() + 1);
        }

        return (overlapMinutes / 60) >= 3;
    }
}
