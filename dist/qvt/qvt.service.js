"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QvtService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QvtService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shift_entity_1 = require("../planning/entities/shift.entity");
const agent_entity_1 = require("../agents/entities/agent.entity");
let QvtService = QvtService_1 = class QvtService {
    shiftRepository;
    agentRepository;
    logger = new common_1.Logger(QvtService_1.name);
    constructor(shiftRepository, agentRepository) {
        this.shiftRepository = shiftRepository;
        this.agentRepository = agentRepository;
    }
    async getDashboard(tenantId, facilityId, agentId) {
        const agentQuery = this.agentRepository.createQueryBuilder('agent')
            .where('agent.tenantId = :tenantId', { tenantId });
        if (facilityId) {
            agentQuery.andWhere('agent.facilityId = :facilityId', { facilityId });
        }
        if (agentId) {
            agentQuery.andWhere('agent.id = :agentId', { agentId });
        }
        const agents = await agentQuery.getMany();
        if (agents.length === 0)
            return { globalScore: 0, agents: [], metrics: { totalNights: 0, totalLongShifts: 0 } };
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const shiftQuery = this.shiftRepository.createQueryBuilder('shift')
            .innerJoinAndSelect('shift.agent', 'agent')
            .where('shift.tenantId = :tenantId', { tenantId })
            .andWhere('shift.start >= :date', { date: thirtyDaysAgo })
            .andWhere('shift.agentId IN (:...agentIds)', { agentIds: agents.map(a => a.id) });
        const recentShifts = await shiftQuery.getMany();
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
        const globalScore = validScoresCount > 0 ? (totalScore / validScoresCount) : 0;
        return {
            globalScore: Number(globalScore.toFixed(2)),
            metrics: {
                totalNights,
                totalLongShifts
            },
            agents: agentsStats.sort((a, b) => b.score - a.score)
        };
    }
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
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(1, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], QvtService);
//# sourceMappingURL=qvt.service.js.map