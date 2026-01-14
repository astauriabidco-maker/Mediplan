import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class QvtService {
    private readonly logger = new Logger(QvtService.name);

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
