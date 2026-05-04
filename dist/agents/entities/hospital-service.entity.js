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
exports.HospitalService = exports.RiskLevel = void 0;
const typeorm_1 = require("typeorm");
const agent_entity_1 = require("./agent.entity");
const facility_entity_1 = require("./facility.entity");
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["NONE"] = "NONE";
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["CRITICAL"] = "CRITICAL";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
let HospitalService = class HospitalService {
    id;
    name;
    code;
    description;
    tenantId;
    facilityId;
    facility;
    parentService;
    parentServiceId;
    subServices;
    level;
    chief;
    chiefId;
    deputyChief;
    deputyChiefId;
    major;
    majorId;
    nursingManager;
    nursingManagerId;
    maxAgents;
    minAgents;
    agents;
    isActive;
    is24x7;
    bedCapacity;
    contactNumber;
    riskLevel;
    coverageRules;
    createdAt;
    updatedAt;
};
exports.HospitalService = HospitalService;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], HospitalService.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], HospitalService.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], HospitalService.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], HospitalService.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'DEFAULT_TENANT' }),
    __metadata("design:type", String)
], HospitalService.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], HospitalService.prototype, "facilityId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => facility_entity_1.Facility, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'facilityId' }),
    __metadata("design:type", facility_entity_1.Facility)
], HospitalService.prototype, "facility", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => HospitalService, (service) => service.subServices, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'parentServiceId' }),
    __metadata("design:type", HospitalService)
], HospitalService.prototype, "parentService", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "parentServiceId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => HospitalService, (service) => service.parentService),
    __metadata("design:type", Array)
], HospitalService.prototype, "subServices", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], HospitalService.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'chiefId' }),
    __metadata("design:type", agent_entity_1.Agent)
], HospitalService.prototype, "chief", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "chiefId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'deputyChiefId' }),
    __metadata("design:type", agent_entity_1.Agent)
], HospitalService.prototype, "deputyChief", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "deputyChiefId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'majorId' }),
    __metadata("design:type", agent_entity_1.Agent)
], HospitalService.prototype, "major", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "majorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agent_entity_1.Agent, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'nursingManagerId' }),
    __metadata("design:type", agent_entity_1.Agent)
], HospitalService.prototype, "nursingManager", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "nursingManagerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "maxAgents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "minAgents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => agent_entity_1.Agent, (agent) => agent.hospitalService),
    __metadata("design:type", Array)
], HospitalService.prototype, "agents", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], HospitalService.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], HospitalService.prototype, "is24x7", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], HospitalService.prototype, "bedCapacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], HospitalService.prototype, "contactNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RiskLevel,
        default: RiskLevel.NONE
    }),
    __metadata("design:type", String)
], HospitalService.prototype, "riskLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], HospitalService.prototype, "coverageRules", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], HospitalService.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], HospitalService.prototype, "updatedAt", void 0);
exports.HospitalService = HospitalService = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['tenantId', 'name'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'code'], { unique: true })
], HospitalService);
//# sourceMappingURL=hospital-service.entity.js.map