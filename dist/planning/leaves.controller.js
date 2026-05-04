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
exports.LeavesController = void 0;
const common_1 = require("@nestjs/common");
const leaves_service_1 = require("./leaves.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let LeavesController = class LeavesController {
    leavesService;
    constructor(leavesService) {
        this.leavesService = leavesService;
    }
    async requestLeave(req, body) {
        const tenantId = req.user.tenantId;
        const currentUserId = req.user.id;
        const targetAgentId = body.agentId || currentUserId;
        return this.leavesService.requestLeave(tenantId, targetAgentId, new Date(body.start), new Date(body.end), body.type, body.reason, {
            id: currentUserId,
            canManageAll: req.user.role === 'SUPER_ADMIN' ||
                req.user.role === 'ADMIN' ||
                req.user.permissions.includes('*') ||
                req.user.permissions.includes('leaves:manage'),
        });
    }
    async getMyBalances(req, year) {
        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
        return this.leavesService.getMyBalances(req.user.tenantId, req.user.id, targetYear);
    }
    async getMyLeaves(req) {
        return this.leavesService.getMyLeaves(req.user.tenantId, req.user.id);
    }
    async getTeamRequests(req) {
        return this.leavesService.getTeamRequests(req.user.tenantId, req.user.id);
    }
    async validateLeave(req, id, body) {
        return this.leavesService.validateLeave(req.user.tenantId, req.user.id, parseInt(id, 10), body.status, body.rejectionReason, req.user.role === 'SUPER_ADMIN' ||
            req.user.role === 'ADMIN' ||
            req.user.permissions.includes('*') ||
            req.user.permissions.includes('leaves:manage'));
    }
};
exports.LeavesController = LeavesController;
__decorate([
    (0, common_1.Post)('request'),
    (0, permissions_decorator_1.Permissions)('leaves:request'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "requestLeave", null);
__decorate([
    (0, common_1.Get)('balances'),
    (0, permissions_decorator_1.Permissions)('leaves:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getMyBalances", null);
__decorate([
    (0, common_1.Get)('my-leaves'),
    (0, permissions_decorator_1.Permissions)('leaves:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getMyLeaves", null);
__decorate([
    (0, common_1.Get)('team-requests'),
    (0, permissions_decorator_1.Permissions)('leaves:validate'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getTeamRequests", null);
__decorate([
    (0, common_1.Patch)(':id/validate'),
    (0, permissions_decorator_1.Permissions)('leaves:validate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "validateLeave", null);
exports.LeavesController = LeavesController = __decorate([
    (0, common_1.Controller)('leaves'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService])
], LeavesController);
//# sourceMappingURL=leaves.controller.js.map