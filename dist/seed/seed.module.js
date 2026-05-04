"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const seed_controller_1 = require("./seed.controller");
const agent_entity_1 = require("../agents/entities/agent.entity");
const facility_entity_1 = require("../agents/entities/facility.entity");
const grade_entity_1 = require("../agents/entities/grade.entity");
const hospital_service_entity_1 = require("../agents/entities/hospital-service.entity");
const leave_entity_1 = require("../planning/entities/leave.entity");
const shift_entity_1 = require("../planning/entities/shift.entity");
const competency_entity_1 = require("../competencies/entities/competency.entity");
const agent_competency_entity_1 = require("../competencies/entities/agent-competency.entity");
const document_entity_1 = require("../documents/entities/document.entity");
const contract_entity_1 = require("../agents/entities/contract.entity");
const bonus_template_entity_1 = require("../agents/entities/bonus-template.entity");
const contract_bonus_entity_1 = require("../agents/entities/contract-bonus.entity");
const payroll_rule_entity_1 = require("../payroll/entities/payroll-rule.entity");
const role_entity_1 = require("../auth/entities/role.entity");
let SeedModule = class SeedModule {
};
exports.SeedModule = SeedModule;
exports.SeedModule = SeedModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                agent_entity_1.Agent,
                facility_entity_1.Facility,
                grade_entity_1.Grade,
                hospital_service_entity_1.HospitalService,
                leave_entity_1.Leave,
                shift_entity_1.Shift,
                competency_entity_1.Competency,
                agent_competency_entity_1.AgentCompetency,
                document_entity_1.Document,
                contract_entity_1.Contract,
                bonus_template_entity_1.BonusTemplate,
                contract_bonus_entity_1.ContractBonus,
                payroll_rule_entity_1.PayrollRule,
                role_entity_1.Role,
            ]),
        ],
        controllers: [seed_controller_1.SeedController],
    })
], SeedModule);
//# sourceMappingURL=seed.module.js.map