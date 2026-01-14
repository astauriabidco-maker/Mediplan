"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var typeorm_1 = require("@nestjs/typeorm");
var serve_static_1 = require("@nestjs/serve-static");
var path_1 = require("path");
var Joi = require("joi");
var locale_module_1 = require("./core/config/locale.module");
var app_controller_1 = require("./app.controller");
var app_service_1 = require("./app.service");
var agents_module_1 = require("./agents/agents.module");
var competencies_module_1 = require("./competencies/competencies.module");
var ui_module_1 = require("./ui/ui.module");
var planning_module_1 = require("./planning/planning.module");
var payment_module_1 = require("./payment/payment.module");
var seed_service_1 = require("./seed.service");
var agent_entity_1 = require("./agents/entities/agent.entity");
var shift_entity_1 = require("./planning/entities/shift.entity");
var sync_module_1 = require("./sync/sync.module");
var qvt_module_1 = require("./qvt/qvt.module");
var auth_module_1 = require("./auth/auth.module");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                serve_static_1.ServeStaticModule.forRoot({
                    rootPath: (0, path_1.join)(process.cwd(), 'public'),
                }),
                locale_module_1.LocaleConfigModule,
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    validationSchema: Joi.object({
                        COUNTRY_CODE: Joi.string().valid('FR', 'CM').required(),
                        POSTGRES_HOST: Joi.string().required(),
                        POSTGRES_PORT: Joi.number().required(),
                        POSTGRES_USER: Joi.string().required(),
                        POSTGRES_PASSWORD: Joi.string().required(),
                        POSTGRES_DB: Joi.string().required(),
                    }),
                }),
                typeorm_1.TypeOrmModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    inject: [config_1.ConfigService],
                    useFactory: function (configService) { return ({
                        type: 'postgres',
                        host: configService.get('POSTGRES_HOST'),
                        port: configService.get('POSTGRES_PORT'),
                        username: configService.get('POSTGRES_USER'),
                        password: configService.get('POSTGRES_PASSWORD'),
                        database: configService.get('POSTGRES_DB'),
                        autoLoadEntities: true,
                        synchronize: true, // Auto-create tables (dev only)
                    }); },
                }),
                typeorm_1.TypeOrmModule.forFeature([agent_entity_1.Agent, shift_entity_1.Shift]),
                agents_module_1.AgentsModule,
                competencies_module_1.CompetenciesModule,
                ui_module_1.UiModule,
                planning_module_1.PlanningModule,
                payment_module_1.PaymentModule,
                sync_module_1.SyncModule,
                qvt_module_1.QvtModule,
                auth_module_1.AuthModule,
            ],
            controllers: [app_controller_1.AppController],
            providers: [app_service_1.AppService, seed_service_1.SeedService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
