import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as Joi from 'joi';
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
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    LocaleConfigModule,
    ConfigModule.forRoot({
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
        synchronize: true, // Auto-create tables (dev only)
      }),
    }),
    TypeOrmModule.forFeature([Agent, Shift, AuditLog]),
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
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule { }
