"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompetenciesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const competencies_service_1 = require("./competencies.service");
const competencies_controller_1 = require("./competencies.controller");
const competency_entity_1 = require("./entities/competency.entity");
const agent_competency_entity_1 = require("./entities/agent-competency.entity");
const agent_entity_1 = require("../agents/entities/agent.entity");
const shift_entity_1 = require("../planning/entities/shift.entity");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const agent_alert_entity_1 = require("../agents/entities/agent-alert.entity");
const gpec_worker_service_1 = require("./gpec-worker.service");
let CompetenciesModule = class CompetenciesModule {
};
exports.CompetenciesModule = CompetenciesModule;
exports.CompetenciesModule = CompetenciesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([competency_entity_1.Competency, agent_competency_entity_1.AgentCompetency, agent_entity_1.Agent, shift_entity_1.Shift, agent_alert_entity_1.AgentAlert]),
            whatsapp_module_1.WhatsappModule
        ],
        controllers: [competencies_controller_1.CompetenciesController],
        providers: [competencies_service_1.CompetenciesService, gpec_worker_service_1.GpecWorkerService],
        exports: [competencies_service_1.CompetenciesService, gpec_worker_service_1.GpecWorkerService],
    })
], CompetenciesModule);
//# sourceMappingURL=competencies.module.js.map