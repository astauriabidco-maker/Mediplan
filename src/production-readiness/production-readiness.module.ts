import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ProductionSignoff } from './entities/production-signoff.entity';
import { ProductionReadinessController } from './production-readiness.controller';
import { ProductionReadinessService } from './production-readiness.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionSignoff]), AuditModule],
  controllers: [ProductionReadinessController],
  providers: [ProductionReadinessService],
  exports: [ProductionReadinessService],
})
export class ProductionReadinessModule {}
