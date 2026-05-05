import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as Joi from 'joi';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { createApiValidationPipe } from './common/pipes/api-validation.pipe';
import { LocaleConfigModule } from './core/config/locale.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsModule } from './agents/agents.module';
import { CompetenciesModule } from './competencies/competencies.module';
import { UiModule } from './ui/ui.module';
import { PlanningModule } from './planning/planning.module';
import { PaymentModule } from './payment/payment.module';
import { SeedService } from './seed.service';
import { Agent } from './agents/entities/agent.entity';
import { Shift } from './planning/entities/shift.entity';
import { SyncModule } from './sync/sync.module';
import { QvtModule } from './qvt/qvt.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AuditLog } from './audit/entities/audit-log.entity';
import { Competency } from './competencies/entities/competency.entity';
import { AgentCompetency } from './competencies/entities/agent-competency.entity';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { FhirModule } from './fhir/fhir.module';
import { PayrollModule } from './payroll/payroll.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DocumentsModule } from './documents/documents.module';
import { EventsModule } from './events/events.module';
import { GhtModule } from './ght/ght.module';
import { FacilityModule } from './facility/facility.module';
import { SettingsModule } from './settings/settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BackupModule } from './backup/backup.module';
import { ProductionReadinessModule } from './production-readiness/production-readiness.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    LocaleConfigModule,
    ConfigModule.forRoot({
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize:
          process.env.DB_SYNCHRONIZE === 'true' ||
          process.env.NODE_ENV === 'development',
      }),
    }),
    TypeOrmModule.forFeature([
      Agent,
      Shift,
      AuditLog,
      Competency,
      AgentCompetency,
    ]),
    AgentsModule,
    CompetenciesModule,
    UiModule,
    PlanningModule,
    PaymentModule,
    SyncModule,
    QvtModule,
    AuthModule,
    SeedModule,
    MailModule,
    NotificationsModule,
    AuditModule,
    WhatsappModule,
    FhirModule,
    PayrollModule,
    DocumentsModule,
    EventsModule,
    GhtModule,
    FacilityModule,
    SettingsModule,
    AnalyticsModule,
    BackupModule,
    ProductionReadinessModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeedService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useFactory: createApiValidationPipe,
    },
  ],
})
export class AppModule {}
