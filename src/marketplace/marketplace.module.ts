import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { Shift } from '../planning/entities/shift.entity';
import { ShiftApplication } from '../planning/entities/shift-application.entity';
import { PlanningModule } from '../planning/planning.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftApplication]),
    PlanningModule,
    EventsModule
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
