import { Module } from '@nestjs/common';
import { QvtService } from './qvt.service';
import { QvtController } from './qvt.controller';

@Module({
  providers: [QvtService],
  controllers: [QvtController]
})
export class QvtModule {}
