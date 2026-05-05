"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const Joi = __importStar(require("joi"));
const throttler_1 = require("@nestjs/throttler");
const api_exception_filter_1 = require("./common/filters/api-exception.filter");
const api_validation_pipe_1 = require("./common/pipes/api-validation.pipe");
const locale_module_1 = require("./core/config/locale.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const agents_module_1 = require("./agents/agents.module");
const competencies_module_1 = require("./competencies/competencies.module");
const ui_module_1 = require("./ui/ui.module");
const planning_module_1 = require("./planning/planning.module");
const payment_module_1 = require("./payment/payment.module");
const seed_service_1 = require("./seed.service");
const agent_entity_1 = require("./agents/entities/agent.entity");
const shift_entity_1 = require("./planning/entities/shift.entity");
const sync_module_1 = require("./sync/sync.module");
const qvt_module_1 = require("./qvt/qvt.module");
const auth_module_1 = require("./auth/auth.module");
const seed_module_1 = require("./seed/seed.module");
const mail_module_1 = require("./mail/mail.module");
const notifications_module_1 = require("./notifications/notifications.module");
const audit_module_1 = require("./audit/audit.module");
const audit_log_entity_1 = require("./audit/entities/audit-log.entity");
const competency_entity_1 = require("./competencies/entities/competency.entity");
const agent_competency_entity_1 = require("./competencies/entities/agent-competency.entity");
const whatsapp_module_1 = require("./whatsapp/whatsapp.module");
const fhir_module_1 = require("./fhir/fhir.module");
const payroll_module_1 = require("./payroll/payroll.module");
const schedule_1 = require("@nestjs/schedule");
const documents_module_1 = require("./documents/documents.module");
const events_module_1 = require("./events/events.module");
const ght_module_1 = require("./ght/ght.module");
const facility_module_1 = require("./facility/facility.module");
const settings_module_1 = require("./settings/settings.module");
const analytics_module_1 = require("./analytics/analytics.module");
const backup_module_1 = require("./backup/backup.module");
const production_readiness_module_1 = require("./production-readiness/production-readiness.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'public'),
            }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            locale_module_1.LocaleConfigModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: process.env.ENV_FILE || '.env',
                validationSchema: Joi.object({
                    COUNTRY_CODE: Joi.string().valid('FR', 'CM').required(),
                    POSTGRES_HOST: Joi.string().required(),
                    POSTGRES_PORT: Joi.number().required(),
                    POSTGRES_USER: Joi.string().required(),
                    POSTGRES_PASSWORD: Joi.string().required(),
                    POSTGRES_DB: Joi.string().required(),
                    JWT_SECRET: Joi.string().required(),
                    MISTRAL_API_KEY: Joi.string().optional(),
                }),
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('POSTGRES_HOST'),
                    port: configService.get('POSTGRES_PORT'),
                    username: configService.get('POSTGRES_USER'),
                    password: configService.get('POSTGRES_PASSWORD'),
                    database: configService.get('POSTGRES_DB'),
                    autoLoadEntities: true,
                    synchronize: process.env.DB_SYNCHRONIZE === 'true' ||
                        process.env.NODE_ENV === 'development',
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([
                agent_entity_1.Agent,
                shift_entity_1.Shift,
                audit_log_entity_1.AuditLog,
                competency_entity_1.Competency,
                agent_competency_entity_1.AgentCompetency,
            ]),
            agents_module_1.AgentsModule,
            competencies_module_1.CompetenciesModule,
            ui_module_1.UiModule,
            planning_module_1.PlanningModule,
            payment_module_1.PaymentModule,
            sync_module_1.SyncModule,
            qvt_module_1.QvtModule,
            auth_module_1.AuthModule,
            seed_module_1.SeedModule,
            mail_module_1.MailModule,
            notifications_module_1.NotificationsModule,
            audit_module_1.AuditModule,
            whatsapp_module_1.WhatsappModule,
            fhir_module_1.FhirModule,
            payroll_module_1.PayrollModule,
            documents_module_1.DocumentsModule,
            events_module_1.EventsModule,
            ght_module_1.GhtModule,
            facility_module_1.FacilityModule,
            settings_module_1.SettingsModule,
            analytics_module_1.AnalyticsModule,
            backup_module_1.BackupModule,
            production_readiness_module_1.ProductionReadinessModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            seed_service_1.SeedService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: api_exception_filter_1.ApiExceptionFilter,
            },
            {
                provide: core_1.APP_PIPE,
                useFactory: api_validation_pipe_1.createApiValidationPipe,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map