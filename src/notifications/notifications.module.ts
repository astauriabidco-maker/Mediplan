import { Module, Global } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
    imports: [JwtModule],
    providers: [NotificationsGateway, NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
