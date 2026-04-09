"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const agents_service_1 = require("./agents.service");
const agents_controller_1 = require("./agents.controller");
const hospital_services_controller_1 = require("./hospital-services.controller");
const agent_entity_1 = require("./entities/agent.entity");
const contract_entity_1 = require("./entities/contract.entity");
const hospital_service_entity_1 = require("./entities/hospital-service.entity");
const hospital_services_service_1 = require("./hospital-services.service");
const grade_entity_1 = require("./entities/grade.entity");
const grades_controller_1 = require("./grades.controller");
const grades_service_1 = require("./grades.service");
const facility_entity_1 = require("./entities/facility.entity");
const audit_module_1 = require("../audit/audit.module");
const beneficiary_entity_1 = require("./entities/beneficiary.entity");
const beneficiary_service_1 = require("./beneficiary.service");
const beneficiary_controller_1 = require("./beneficiary.controller");
const bonus_template_entity_1 = require("./entities/bonus-template.entity");
const contract_bonus_entity_1 = require("./entities/contract-bonus.entity");
const health_record_entity_1 = require("./entities/health-record.entity");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([agent_entity_1.Agent, contract_entity_1.Contract, hospital_service_entity_1.HospitalService, grade_entity_1.Grade, facility_entity_1.Facility, beneficiary_entity_1.AgentBeneficiary, bonus_template_entity_1.BonusTemplate, contract_bonus_entity_1.ContractBonus, health_record_entity_1.HealthRecord]), audit_module_1.AuditModule],
        controllers: [agents_controller_1.AgentsController, hospital_services_controller_1.HospitalServicesController, grades_controller_1.GradesController, beneficiary_controller_1.BeneficiaryController],
        providers: [agents_service_1.AgentsService, hospital_services_service_1.HospitalServicesService, grades_service_1.GradesService, beneficiary_service_1.BeneficiaryService],
        exports: [agents_service_1.AgentsService, hospital_services_service_1.HospitalServicesService, grades_service_1.GradesService, beneficiary_service_1.BeneficiaryService],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map