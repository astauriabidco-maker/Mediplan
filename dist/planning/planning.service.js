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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shift_entity_1 = require("./entities/shift.entity");
const leave_entity_1 = require("./entities/leave.entity");
const locale_module_1 = require("../core/config/locale.module");
let PlanningService = class PlanningService {
    shiftRepository;
    leaveRepository;
    localeRules;
    constructor(shiftRepository, leaveRepository, localeRules) {
        this.shiftRepository = shiftRepository;
        this.leaveRepository = leaveRepository;
        this.localeRules = localeRules;
    }
    async validateShift(tenantId, agentId, start, end) {
        const isAvailable = await this.checkLeaveAvailability(tenantId, agentId, start, end);
        if (!isAvailable) {
            return false;
        }
        const weeklyLimit = this.localeRules.getWeeklyWorkLimit();
        const currentWeeklyHours = await this.getWeeklyHours(tenantId, agentId, start);
        const shiftDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (currentWeeklyHours + shiftDuration > weeklyLimit) {
            return false;
        }
        return true;
    }
    async checkAvailability(tenantId, agentId, date) {
        return this.checkLeaveAvailability(tenantId, agentId, date, date);
    }
    async checkLeaveAvailability(tenantId, agentId, start, end) {
        const count = await this.leaveRepository
            .createQueryBuilder('leave')
            .where('leave.tenantId = :tenantId', { tenantId })
            .andWhere('leave.agentId = :agentId', { agentId })
            .andWhere('leave.status = :status', { status: 'APPROVED' })
            .andWhere('leave.start < :end', { end })
            .andWhere('leave.end > :start', { start })
            .getCount();
        return count === 0;
    }
    async getWeeklyHours(tenantId, agentId, date) {
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        const shifts = await this.shiftRepository.find({
            where: {
                agent: { id: agentId },
                tenantId: tenantId,
                start: (0, typeorm_2.Between)(startOfWeek, endOfWeek),
            },
        });
        return shifts.reduce((total, shift) => {
            const duration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
            return total + duration;
        }, 0);
    }
    async getShifts(tenantId, start, end) {
        return this.shiftRepository.createQueryBuilder('shift')
            .leftJoinAndSelect('shift.agent', 'agent')
            .where('shift.tenantId = :tenantId', { tenantId: tenantId || 'DEFAULT_TENANT' })
            .andWhere('shift.start >= :start', { start })
            .andWhere('shift.end <= :end', { end })
            .getMany();
    }
    async assignReplacement(tenantId, agentId, start, end, postId) {
        const isValid = await this.validateShift(tenantId, agentId, start, end);
        if (!isValid) {
            throw new Error('Agent cannot take this replacement (weekly hours limit).');
        }
        const shift = this.shiftRepository.create({
            tenantId,
            agent: { id: agentId },
            start,
            end,
            postId,
            status: 'VALIDATED'
        });
        return this.shiftRepository.save(shift);
    }
};
exports.PlanningService = PlanningService;
exports.PlanningService = PlanningService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(1, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(2, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object])
], PlanningService);
//# sourceMappingURL=planning.service.js.map