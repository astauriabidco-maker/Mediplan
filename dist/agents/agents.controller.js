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
exports.AgentsController = void 0;
const common_1 = require("@nestjs/common");
const agents_service_1 = require("./agents.service");
const create_agent_dto_1 = require("./dto/create-agent.dto");
const update_agent_dto_1 = require("./dto/update-agent.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let AgentsController = class AgentsController {
    agentsService;
    constructor(agentsService) {
        this.agentsService = agentsService;
    }
    create(req, createAgentDto) {
        const tenantId = req.user.tenantId;
        return this.agentsService.create({ ...createAgentDto, tenantId });
    }
    findAll(req) {
        const tenantId = req.user.tenantId;
        return this.agentsService.findAll(tenantId);
    }
    getMyTeam(req) {
        const tenantId = req.user.tenantId;
        const agentId = req.user.userId;
        return this.agentsService.getMyTeam(agentId, tenantId);
    }
    findOne(req, id) {
        const tenantId = req.user.tenantId;
        return this.agentsService.findOne(+id, tenantId);
    }
    update(req, id, updateAgentDto) {
        const tenantId = req.user.tenantId;
        return this.agentsService.update(+id, updateAgentDto, tenantId);
    }
    remove(req, id) {
        const tenantId = req.user.tenantId;
        return this.agentsService.remove(+id, tenantId);
    }
};
exports.AgentsController = AgentsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('agents:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_agent_dto_1.CreateAgentDto]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('agents:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-team'),
    (0, permissions_decorator_1.Permissions)('agents:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "getMyTeam", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('agents:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_decorator_1.Permissions)('agents:write', 'services:manage_staff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_agent_dto_1.UpdateAgentDto]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('agents:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AgentsController.prototype, "remove", null);
exports.AgentsController = AgentsController = __decorate([
    (0, common_1.Controller)('agents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [agents_service_1.AgentsService])
], AgentsController);
//# sourceMappingURL=agents.controller.js.map