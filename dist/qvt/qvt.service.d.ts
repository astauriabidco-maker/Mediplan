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
import { Repository } from 'typeorm';
import { Shift } from '../planning/entities/shift.entity';
import { Agent } from '../agents/entities/agent.entity';
export declare class QvtService {
    private shiftRepository;
    private agentRepository;
    private readonly logger;
    constructor(shiftRepository: Repository<Shift>, agentRepository: Repository<Agent>);
    getDashboard(tenantId: string, facilityId?: number, agentId?: number): Promise<{
        globalScore: number;
        metrics: {
            totalNights: number;
            totalLongShifts: number;
        };
        agents: {
            agent: Agent;
            score: number;
            metrics: {
                nbNights: number;
                nbLongShifts: number;
                hoursRest: number;
            };
            alert: boolean;
        }[];
    }>;
    calculateFatigueScore(shifts: ShiftInput[]): QvtAnalysis;
    private isNightShift;
}
