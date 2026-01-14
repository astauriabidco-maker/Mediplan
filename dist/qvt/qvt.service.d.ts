export interface ShiftInput {
    id: string;
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
export declare class QvtService {
    private readonly logger;
    calculateFatigueScore(shifts: ShiftInput[]): QvtAnalysis;
    private isNightShift;
}
