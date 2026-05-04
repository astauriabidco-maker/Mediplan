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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const app_service_1 = require("./app.service");
const seed_service_1 = require("./seed.service");
let AppController = class AppController {
    appService;
    seedService;
    dataSource;
    constructor(appService, seedService, dataSource) {
        this.appService = appService;
        this.seedService = seedService;
        this.dataSource = dataSource;
    }
    getLiveness() {
        return {
            status: 'UP',
            service: 'mediplan-api',
            checkedAt: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
        };
    }
    async getReadiness() {
        const checkedAt = new Date().toISOString();
        try {
            await this.dataSource.query('SELECT 1');
            return {
                status: 'UP',
                service: 'mediplan-api',
                checkedAt,
                dependencies: {
                    database: 'UP',
                },
            };
        }
        catch (error) {
            throw new common_1.ServiceUnavailableException({
                status: 'DOWN',
                service: 'mediplan-api',
                checkedAt,
                dependencies: {
                    database: 'DOWN',
                },
                error: error instanceof Error ? error.message : 'Database unavailable',
            });
        }
    }
    async seed() {
        return this.seedService.seed();
    }
    getConfig() {
        return this.appService.getConfig();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('health/live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getLiveness", null);
__decorate([
    (0, common_1.Get)('health/ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getReadiness", null);
__decorate([
    (0, common_1.Get)('dev/seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "seed", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getConfig", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        seed_service_1.SeedService,
        typeorm_1.DataSource])
], AppController);
//# sourceMappingURL=app.controller.js.map