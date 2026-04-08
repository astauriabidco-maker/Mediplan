"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QvtModule = void 0;
const common_1 = require("@nestjs/common");
const qvt_service_1 = require("./qvt.service");
const qvt_controller_1 = require("./qvt.controller");
const typeorm_1 = require("@nestjs/typeorm");
const shift_entity_1 = require("../planning/entities/shift.entity");
const agent_entity_1 = require("../agents/entities/agent.entity");
let QvtModule = class QvtModule {
};
exports.QvtModule = QvtModule;
exports.QvtModule = QvtModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([shift_entity_1.Shift, agent_entity_1.Agent])],
        providers: [qvt_service_1.QvtService],
        controllers: [qvt_controller_1.QvtController]
    })
], QvtModule);
//# sourceMappingURL=qvt.module.js.map