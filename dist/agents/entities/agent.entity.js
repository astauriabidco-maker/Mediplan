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
exports.Agent = exports.MobileMoneyProvider = exports.IdType = exports.UserStatus = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const contract_entity_1 = require("./contract.entity");
const agent_competency_entity_1 = require("../../competencies/entities/agent-competency.entity");
const shift_entity_1 = require("../../planning/entities/shift.entity");
const leave_entity_1 = require("../../planning/entities/leave.entity");
const hospital_service_entity_1 = require("./hospital-service.entity");
const role_entity_1 = require("../../auth/entities/role.entity");
const grade_entity_1 = require("./grade.entity");
const facility_entity_1 = require("./facility.entity");
const beneficiary_entity_1 = require("./beneficiary.entity");
const health_record_entity_1 = require("./health-record.entity");
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["AGENT"] = "AGENT";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["INVITED"] = "INVITED";
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["DISABLED"] = "DISABLED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var IdType;
(function (IdType) {
    IdType["CNI"] = "CNI";
    IdType["PASSPORT"] = "PASSPORT";
    IdType["ATTESTATION"] = "ATTESTATION";
    IdType["RESIDENCE_PERMIT"] = "RESIDENCE_PERMIT";
})(IdType || (exports.IdType = IdType = {}));
var MobileMoneyProvider;
(function (MobileMoneyProvider) {
    MobileMoneyProvider["ORANGE_MONEY"] = "ORANGE_MONEY";
    MobileMoneyProvider["MTN_MOMO"] = "MTN_MOMO";
    MobileMoneyProvider["WAVE"] = "WAVE";
    MobileMoneyProvider["MOOV_MONEY"] = "MOOV_MONEY";
    MobileMoneyProvider["AIRTEL_MONEY"] = "AIRTEL_MONEY";
    MobileMoneyProvider["TELMA_MONEY"] = "TELMA_MONEY";
})(MobileMoneyProvider || (exports.MobileMoneyProvider = MobileMoneyProvider = {}));
let Agent = class Agent {
    id;
    role;
    roleId;
    dbRole;
    status;
    invitationToken;
    nom;
    firstName;
    lastName;
    gender;
    dateOfBirth;
    placeOfBirth;
    nationality;
    address;
    department;
    hospitalServiceId;
    hospitalService;
    jobTitle;
    hiringDate;
    contractType;
    birthName;
    nir;
    maritalStatus;
    childrenCount;
    street;
    zipCode;
    city;
    personalEmail;
    workTimePercentage;
    gradeLegacy;
    step;
    index;
    gradeId;
    grade;
    contractEndDate;
    iban;
    bic;
    niu;
    cnpsNumber;
    categorieEchelon;
    idType;
    idNumber;
    idExpiryDate;
    mobileMoneyProvider;
    mobileMoneyNumber;
    isWhatsAppCompatible;
    mainDiploma;
    diplomaYear;
    emergencyContactName;
    emergencyContactPhone;
    email;
    matricule;
    telephone;
    password;
    tenantId;
    facilityId;
    facility;
    managerId;
    manager;
    subordinates;
    contracts;
    agentCompetencies;
    shifts;
    leaves;
    beneficiaries;
    healthRecords;
};
exports.Agent = Agent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Agent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserRole,
        default: UserRole.AGENT,
        nullable: true
    }),
    __metadata("design:type", String)
], Agent.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Agent.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => role_entity_1.Role, (role) => role.agents, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'roleId' }),
    __metadata("design:type", role_entity_1.Role)
], Agent.prototype, "dbRole", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Agent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, select: false }),
    __metadata("design:type", Object)
], Agent.prototype, "invitationToken", void 0);
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
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Agent.prototype, "hospitalServiceId", void 0);
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
], Agent.prototype, "birthName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "nir", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "maritalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Agent.prototype, "childrenCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "zipCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "personalEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 100 }),
    __metadata("design:type", Number)
], Agent.prototype, "workTimePercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "gradeLegacy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "step", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "index", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Agent.prototype, "gradeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => grade_entity_1.Grade, (grade) => grade.agents, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'gradeId' }),
    __metadata("design:type", grade_entity_1.Grade)
], Agent.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "contractEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], Agent.prototype, "iban", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", String)
], Agent.prototype, "bic", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "niu", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "cnpsNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "categorieEchelon", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: IdType,
        nullable: true
    }),
    __metadata("design:type", String)
], Agent.prototype, "idType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "idNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "idExpiryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MobileMoneyProvider,
        nullable: true
    }),
    __metadata("design:type", String)
], Agent.prototype, "mobileMoneyProvider", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "mobileMoneyNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Agent.prototype, "isWhatsAppCompatible", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "mainDiploma", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "diplomaYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "emergencyContactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Agent.prototype, "emergencyContactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Agent.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
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
], Agent.prototype, "facilityId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => facility_entity_1.Facility, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'facilityId' }),
    __metadata("design:type", facility_entity_1.Facility)
], Agent.prototype, "facility", void 0);
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
__decorate([
    (0, typeorm_1.OneToMany)(() => beneficiary_entity_1.AgentBeneficiary, (beneficiary) => beneficiary.agent),
    __metadata("design:type", Array)
], Agent.prototype, "beneficiaries", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => health_record_entity_1.HealthRecord, (record) => record.agent),
    __metadata("design:type", Array)
], Agent.prototype, "healthRecords", void 0);
exports.Agent = Agent = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['tenantId', 'email'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'matricule'], { unique: true })
], Agent);
//# sourceMappingURL=agent.entity.js.map