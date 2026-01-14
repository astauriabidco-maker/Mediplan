"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const planning_service_1 = require("./planning.service");
const optimization_service_1 = require("./optimization.service");
const shift_entity_1 = require("./entities/shift.entity");
const agent_entity_1 = require("../agents/entities/agent.entity");
const planning_controller_1 = require("./planning.controller");
const auto_scheduler_service_1 = require("./auto-scheduler.service");
const leave_entity_1 = require("./entities/leave.entity");
const leaves_controller_1 = require("./leaves.controller");
const leaves_service_1 = require("./leaves.service");
let PlanningModule = class PlanningModule {
};
exports.PlanningModule = PlanningModule;
exports.PlanningModule = PlanningModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([shift_entity_1.Shift, agent_entity_1.Agent, leave_entity_1.Leave])],
        providers: [planning_service_1.PlanningService, optimization_service_1.OptimizationService, auto_scheduler_service_1.AutoSchedulerService, leaves_service_1.LeavesService],
        exports: [planning_service_1.PlanningService, optimization_service_1.OptimizationService, auto_scheduler_service_1.AutoSchedulerService, leaves_service_1.LeavesService],
        controllers: [planning_controller_1.PlanningController, leaves_controller_1.LeavesController],
    })
], PlanningModule);
//# sourceMappingURL=planning.module.js.map