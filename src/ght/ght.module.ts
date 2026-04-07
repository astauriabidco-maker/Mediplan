import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ght } from './entities/ght.entity';
import { GhtService } from './ght.service';
import { GhtController } from './ght.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Ght])],
    providers: [GhtService],
    controllers: [GhtController],
    exports: [GhtService]
})
export class GhtModule {}
