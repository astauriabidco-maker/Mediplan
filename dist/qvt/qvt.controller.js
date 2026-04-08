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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QvtController = void 0;
const common_1 = require("@nestjs/common");
const qvt_service_1 = require("./qvt.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
let QvtController = class QvtController {
    qvtService;
    constructor(qvtService) {
        this.qvtService = qvtService;
    }
    analyze(shifts) {
        return this.qvtService.calculateFatigueScore(shifts);
    }
    async getDashboard(req, facilityId) {
        let targetAgentId = undefined;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
            targetAgentId = req.user.id;
        }
        return this.qvtService.getDashboard(req.user.tenantId, facilityId ? parseInt(facilityId, 10) : undefined, targetAgentId);
    }
};
exports.QvtController = QvtController;
__decorate([
    (0, common_1.Post)('analyze'),
    __param(0, (0, common_1.Body)('shifts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", void 0)
], QvtController.prototype, "analyze", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, permissions_decorator_1.Permissions)('qvt:read', 'agents:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('facilityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], QvtController.prototype, "getDashboard", null);
exports.QvtController = QvtController = __decorate([
    (0, common_1.Controller)('qvt'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [qvt_service_1.QvtService])
], QvtController);
//# sourceMappingURL=qvt.controller.js.map