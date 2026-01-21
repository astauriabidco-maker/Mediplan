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
exports.CompetenciesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const competencies_service_1 = require("./competencies.service");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let CompetenciesController = class CompetenciesController {
    competenciesService;
    constructor(competenciesService) {
        this.competenciesService = competenciesService;
    }
    getValidByAgent(agentId) {
        return this.competenciesService.findValidByAgent(agentId);
    }
    async findAllMatrix(req) {
        const tenantId = req.user.tenantId;
        return this.competenciesService.findAllMatrix(tenantId);
    }
    async seed() {
        return this.competenciesService.seedTestData();
    }
    async create(body) {
        return this.competenciesService.create(body.name, body.category);
    }
    async assignToAgent(body) {
        const expirationDate = body.expirationDate ? new Date(body.expirationDate) : undefined;
        return this.competenciesService.assignToAgent(body.agentId, body.competencyId, body.level, expirationDate);
    }
};
exports.CompetenciesController = CompetenciesController;
__decorate([
    (0, common_1.Get)('agent/:agentId'),
    (0, permissions_decorator_1.Permissions)('competencies:read'),
    __param(0, (0, common_1.Param)('agentId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CompetenciesController.prototype, "getValidByAgent", null);
__decorate([
    (0, common_1.Get)('matrix'),
    (0, permissions_decorator_1.Permissions)('competencies:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompetenciesController.prototype, "findAllMatrix", null);
__decorate([
    (0, common_1.Get)('seed-test-data'),
    (0, permissions_decorator_1.Permissions)('competencies:write'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompetenciesController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('competencies:write'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompetenciesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('agent'),
    (0, permissions_decorator_1.Permissions)('competencies:write'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompetenciesController.prototype, "assignToAgent", null);
exports.CompetenciesController = CompetenciesController = __decorate([
    (0, common_1.Controller)('competencies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [competencies_service_1.CompetenciesService])
], CompetenciesController);
//# sourceMappingURL=competencies.controller.js.map