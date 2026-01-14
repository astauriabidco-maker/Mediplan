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
exports.Leave = exports.LeaveStatus = exports.LeaveType = void 0;
const typeorm_1 = require("typeorm");
const agent_entity_1 = require("../../agents/entities/agent.entity");
var LeaveType;
(function (LeaveType) {
    LeaveType["CONGE_ANNUEL"] = "CONGE_ANNUEL";
    LeaveType["MALADIE"] = "MALADIE";
    LeaveType["RECUPERATION"] = "RECUPERATION";
    LeaveType["ABSENCE_INJUSTIFIEE"] = "ABSENCE_INJUSTIFIEE";
    LeaveType["AUTRE"] = "AUTRE";
})(LeaveType || (exports.LeaveType = LeaveType = {}));
var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
})(LeaveStatus || (exports.LeaveStatus = LeaveStatus = {}));
let Leave = class Leave {
    id;
    start;
    end;
    type;
    status;
    reason;
    tenantId;
    agent;
    approvedBy;
    rejectionReason;
};
exports.Leave = Leave;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Leave.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Leave.prototype, "start", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Leave.prototype, "end", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: LeaveType,
        default: LeaveType.CONGE_ANNUEL
    }),
    __metadata("design:type", String)
], Leave.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'simple-enum',
        enum: LeaveStatus,
        default: LeaveStatus.PENDING
    }),
    __metadata("design:type", String)
], Leave.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Leave.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'DEFAULT_TENANT' }),
    __metadata("design:type", String)
], Leave.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, (agent) => agent.leaves),
    __metadata("design:type", agent_entity_1.Agent)
], Leave.prototype, "agent", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, { nullable: true }),
    __metadata("design:type", agent_entity_1.Agent)
], Leave.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Leave.prototype, "rejectionReason", void 0);
exports.Leave = Leave = __decorate([
    (0, typeorm_1.Entity)()
], Leave);
//# sourceMappingURL=leave.entity.js.map