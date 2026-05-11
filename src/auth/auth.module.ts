import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { JwtStrategy } from './jwt.strategy';

import { MailModule } from '../mail/mail.module';
import { RolesModule } from './roles/roles.module';
import { AuditModule } from '../audit/audit.module';
import { PlatformSettings } from '../platform/platform-settings.entity';
import { PlatformSettingsService } from '../platform/platform-settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, PlatformSettings]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SECRET_KEY_DEV',
      signOptions: { expiresIn: '60m' },
    }),
    MailModule,
    RolesModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PlatformSettingsService],
  exports: [AuthService],
})
export class AuthModule {}
