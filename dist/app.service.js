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
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const locale_module_1 = require("./core/config/locale.module");
let AppService = class AppService {
    localeRules;
    constructor(localeRules) {
        this.localeRules = localeRules;
    }
    getHello() {
        const limit = this.localeRules.getWeeklyWorkLimit();
        const mm = this.localeRules.supportsMobileMoney();
        return `Hello World! Work Limit: ${limit}h, Mobile Money: ${mm}`;
    }
    getConfig() {
        return {
            configuration: {
                region: this.localeRules.getWeeklyWorkLimit() === 35 ? 'France (Standard)' : 'Cameroun (Adapté)',
                features: {
                    mobileMoney: this.localeRules.supportsMobileMoney(),
                    offlineMode: true,
                },
            },
        };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [Object])
], AppService);
//# sourceMappingURL=app.service.js.map