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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shift = exports.ShiftType = void 0;
const typeorm_1 = require("typeorm");
const agent_entity_1 = require("../../agents/entities/agent.entity");
const facility_entity_1 = require("../../agents/entities/facility.entity");
var ShiftType;
(function (ShiftType) {
    ShiftType["WORK"] = "WORK";
    ShiftType["GARDE"] = "GARDE";
    ShiftType["ASTREINTE"] = "ASTREINTE";
})(ShiftType || (exports.ShiftType = ShiftType = {}));
let Shift = class Shift {
    id;
    start;
    end;
    postId;
    type;
    status;
    isSwapRequested;
    tenantId;
    facilityId;
    facility;
    agent;
};
exports.Shift = Shift;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Shift.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Shift.prototype, "start", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Shift.prototype, "end", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Shift.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ShiftType,
        default: ShiftType.WORK,
    }),
    __metadata("design:type", String)
], Shift.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'PLANNED' }),
    __metadata("design:type", String)
], Shift.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Shift.prototype, "isSwapRequested", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'DEFAULT_TENANT' }),
    __metadata("design:type", String)
], Shift.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Shift.prototype, "facilityId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => facility_entity_1.Facility, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'facilityId' }),
    __metadata("design:type", facility_entity_1.Facility)
], Shift.prototype, "facility", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, (agent) => agent.shifts),
    __metadata("design:type", agent_entity_1.Agent)
], Shift.prototype, "agent", void 0);
exports.Shift = Shift = __decorate([
    (0, typeorm_1.Entity)()
], Shift);
//# sourceMappingURL=shift.entity.js.map