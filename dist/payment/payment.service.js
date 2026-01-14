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
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const locale_module_1 = require("../core/config/locale.module");
let PaymentService = PaymentService_1 = class PaymentService {
    localeRules;
    logger = new common_1.Logger(PaymentService_1.name);
    constructor(localeRules) {
        this.localeRules = localeRules;
    }
    async triggerPayment(agentId, amount) {
        if (!this.localeRules.supportsMobileMoney()) {
            throw new common_1.BadRequestException('Mobile Money is not supported in this region.');
        }
        this.logger.log(`Processing Orange Money payment of ${amount} for agent ${agentId}...`);
        return { status: 'SUCCESS', transactionId: `TXN-${Date.now()}`, amount, agentId, provider: 'Orange Money' };
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(locale_module_1.LOCALE_RULES)),
    __metadata("design:paramtypes", [Object])
], PaymentService);
//# sourceMappingURL=payment.service.js.map