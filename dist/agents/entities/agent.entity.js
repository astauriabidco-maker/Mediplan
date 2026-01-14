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
exports.Agent = void 0;
const typeorm_1 = require("typeorm");
const contract_entity_1 = require("./contract.entity");
const agent_competency_entity_1 = require("../../competencies/entities/agent-competency.entity");
const shift_entity_1 = require("../../planning/entities/shift.entity");
const leave_entity_1 = require("../../planning/entities/leave.entity");
const hospital_service_entity_1 = require("./hospital-service.entity");
let Agent = class Agent {
    id;
    nom;
    firstName;
    lastName;
    gender;
    dateOfBirth;
    placeOfBirth;
    nationality;
    address;
    department;
    hospitalService;
    jobTitle;
    hiringDate;
    contractType;
    emergencyContactName;
    emergencyContactPhone;
    email;
    matricule;
    telephone;
    password;
    tenantId;
    managerId;
    manager;
    subordinates;
    contracts;
    agentCompetencies;
    shifts;
    leaves;
};
exports.Agent = Agent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Agent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Agent.prototype, "nom", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "gender", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "dateOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "placeOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "nationality", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => hospital_service_entity_1.HospitalService, (service) => service.agents, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'hospitalServiceId' }),
    __metadata("design:type", hospital_service_entity_1.HospitalService)
], Agent.prototype, "hospitalService", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "jobTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "hiringDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "emergencyContactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "emergencyContactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Agent.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Agent.prototype, "matricule", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Agent.prototype, "telephone", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false, nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'DEFAULT_TENANT' }),
    __metadata("design:type", String)
], Agent.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Agent.prototype, "managerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Agent, (agent) => agent.subordinates, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'managerId' }),
    __metadata("design:type", Agent)
], Agent.prototype, "manager", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Agent, (agent) => agent.manager),
    __metadata("design:type", Array)
], Agent.prototype, "subordinates", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contract_entity_1.Contract, (contract) => contract.agent),
    __metadata("design:type", Array)
], Agent.prototype, "contracts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => agent_competency_entity_1.AgentCompetency, (agentCompetency) => agentCompetency.agent),
    __metadata("design:type", Array)
], Agent.prototype, "agentCompetencies", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => shift_entity_1.Shift, (shift) => shift.agent),
    __metadata("design:type", Array)
], Agent.prototype, "shifts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => leave_entity_1.Leave, (leave) => leave.agent),
    __metadata("design:type", Array)
], Agent.prototype, "leaves", void 0);
exports.Agent = Agent = __decorate([
    (0, typeorm_1.Entity)()
], Agent);
//# sourceMappingURL=agent.entity.js.map