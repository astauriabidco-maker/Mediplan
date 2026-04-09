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
const leave_balance_entity_1 = require("./entities/leave-balance.entity");
const leaves_controller_1 = require("./leaves.controller");
const leaves_service_1 = require("./leaves.service");
const attendance_controller_1 = require("./attendance.controller");
const planning_ai_controller_1 = require("./planning-ai.controller");
const work_policy_entity_1 = require("./entities/work-policy.entity");
const work_policies_controller_1 = require("./work-policies.controller");
const work_policies_service_1 = require("./work-policies.service");
const audit_module_1 = require("../audit/audit.module");
const shift_application_entity_1 = require("./entities/shift-application.entity");
const shift_proposal_entity_1 = require("./entities/shift-proposal.entity");
const understaffing_service_1 = require("./understaffing.service");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const attendance_entity_1 = require("./entities/attendance.entity");
const documents_module_1 = require("../documents/documents.module");
const settings_module_1 = require("../settings/settings.module");
const hospital_service_entity_1 = require("../agents/entities/hospital-service.entity");
const health_record_entity_1 = require("../agents/entities/health-record.entity");
let PlanningModule = class PlanningModule {
};
exports.PlanningModule = PlanningModule;
exports.PlanningModule = PlanningModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shift_entity_1.Shift, agent_entity_1.Agent, leave_entity_1.Leave, leave_balance_entity_1.LeaveBalance, work_policy_entity_1.WorkPolicy, shift_application_entity_1.ShiftApplication, shift_proposal_entity_1.ShiftProposal, attendance_entity_1.Attendance, hospital_service_entity_1.HospitalService, health_record_entity_1.HealthRecord]),
            audit_module_1.AuditModule,
            (0, common_1.forwardRef)(() => whatsapp_module_1.WhatsappModule),
            documents_module_1.DocumentsModule,
            settings_module_1.SettingsModule
        ],
        providers: [planning_service_1.PlanningService, optimization_service_1.OptimizationService, auto_scheduler_service_1.AutoSchedulerService, leaves_service_1.LeavesService, work_policies_service_1.WorkPoliciesService, understaffing_service_1.UnderstaffingService],
        exports: [planning_service_1.PlanningService, optimization_service_1.OptimizationService, auto_scheduler_service_1.AutoSchedulerService, leaves_service_1.LeavesService, work_policies_service_1.WorkPoliciesService],
        controllers: [
            planning_controller_1.PlanningController,
            leaves_controller_1.LeavesController,
            work_policies_controller_1.WorkPoliciesController,
            attendance_controller_1.AttendanceController,
            planning_ai_controller_1.PlanningAiController
        ],
    })
], PlanningModule);
//# sourceMappingURL=planning.module.js.map