import { QvtService, ShiftInput } from './qvt.service';
export declare class QvtController {
    private readonly qvtService;
    constructor(qvtService: QvtService);
    analyze(shifts: ShiftInput[]): import("./qvt.service").QvtAnalysis;
    getDashboard(req: any, facilityId?: string): Promise<{
        globalScore: number;
        metrics: {
            totalNights: number;
            totalLongShifts: number;
        };
        agents: {
            agent: import("../agents/entities/agent.entity").Agent;
            score: number;
            metrics: {
                nbNights: number;
                nbLongShifts: number;
                hoursRest: number;
            };
            alert: boolean;
        }[];
    }>;
}
