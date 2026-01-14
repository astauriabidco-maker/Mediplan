"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QvtService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QvtService = void 0;
const common_1 = require("@nestjs/common");
let QvtService = QvtService_1 = class QvtService {
    logger = new common_1.Logger(QvtService_1.name);
    calculateFatigueScore(shifts) {
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
            if (durationHours > 10) {
                nbLongShifts++;
            }
            if (this.isNightShift(shift.start, shift.end)) {
                nbNights++;
            }
            if (i > 0) {
                const prevShift = sortedShifts[i - 1];
                const restDuration = (shift.start.getTime() - prevShift.end.getTime()) / (1000 * 60 * 60);
                if (restDuration > 0) {
                    hoursRest += restDuration;
                }
            }
        }
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
    isNightShift(start, end) {
        const nightStart = 22;
        const nightEnd = 6;
        let overlapMinutes = 0;
        let current = new Date(start.getTime());
        while (current < end) {
            const h = current.getHours();
            if (h >= nightStart || h < nightEnd) {
                overlapMinutes++;
            }
            current.setMinutes(current.getMinutes() + 1);
        }
        return (overlapMinutes / 60) >= 3;
    }
};
exports.QvtService = QvtService;
exports.QvtService = QvtService = QvtService_1 = __decorate([
    (0, common_1.Injectable)()
], QvtService);
//# sourceMappingURL=qvt.service.js.map