"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleConfigModule = exports.LOCALE_RULES = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const france_rules_1 = require("./strategies/france.rules");
const cameroon_rules_1 = require("./strategies/cameroon.rules");
exports.LOCALE_RULES = 'LOCALE_RULES';
const localeRulesProvider = {
    provide: exports.LOCALE_RULES,
    useFactory: (configService) => {
        const countryCode = configService.get('COUNTRY_CODE');
        if (countryCode === 'CM') {
            return new cameroon_rules_1.CameroonRules();
        }
        return new france_rules_1.FranceRules();
    },
    inject: [config_1.ConfigService],
};
let LocaleConfigModule = class LocaleConfigModule {
};
exports.LocaleConfigModule = LocaleConfigModule;
exports.LocaleConfigModule = LocaleConfigModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [localeRulesProvider],
        exports: [localeRulesProvider],
    })
], LocaleConfigModule);
//# sourceMappingURL=locale.module.js.map