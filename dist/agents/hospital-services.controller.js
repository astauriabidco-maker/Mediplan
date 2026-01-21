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
exports.HospitalServicesController = void 0;
const common_1 = require("@nestjs/common");
const hospital_services_service_1 = require("./hospital-services.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let HospitalServicesController = class HospitalServicesController {
    servicesService;
    constructor(servicesService) {
        this.servicesService = servicesService;
    }
    findAll(req) {
        return this.servicesService.findAll(req.user.tenantId);
    }
    getStats(req) {
        return this.servicesService.getStats(req.user.tenantId);
    }
    getTree(req) {
        return this.servicesService.getServiceTree(req.user.tenantId);
    }
    findOne(req, id) {
        return this.servicesService.findOne(req.user.tenantId, id);
    }
    getHierarchy(req, id) {
        return this.servicesService.getServiceHierarchy(req.user.tenantId, id);
    }
    create(req, data) {
        return this.servicesService.create(req.user.tenantId, data);
    }
    createSubService(req, parentId, data) {
        return this.servicesService.createSubService(req.user.tenantId, parentId, data);
    }
    update(req, id, data) {
        return this.servicesService.update(req.user.tenantId, id, data);
    }
    assignResponsible(req, id, data) {
        return this.servicesService.assignResponsible(req.user.tenantId, id, data.role, data.agentId);
    }
    async remove(req, id) {
        await this.servicesService.remove(req.user.tenantId, id);
        return { message: 'Service deleted successfully' };
    }
};
exports.HospitalServicesController = HospitalServicesController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('services:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, permissions_decorator_1.Permissions)('services:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('tree'),
    (0, permissions_decorator_1.Permissions)('services:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "getTree", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('services:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/hierarchy'),
    (0, permissions_decorator_1.Permissions)('services:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "getHierarchy", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('services:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/sub-service'),
    (0, permissions_decorator_1.Permissions)('services:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "createSubService", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('services:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/assign-responsible'),
    (0, permissions_decorator_1.Permissions)('services:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], HospitalServicesController.prototype, "assignResponsible", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('services:write'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], HospitalServicesController.prototype, "remove", null);
exports.HospitalServicesController = HospitalServicesController = __decorate([
    (0, common_1.Controller)('hospital-services'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [hospital_services_service_1.HospitalServicesService])
], HospitalServicesController);
//# sourceMappingURL=hospital-services.controller.js.map