import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token, {
                secret: this.configService.get<string>('JWT_SECRET') || 'SECRET_KEY_DEV',
            });

            const userId = payload.sub;
            if (!userId) {
                client.disconnect();
                return;
            }

            // Join a room specific to this user
            client.join(`user_${userId}`);
            console.log(`Client connected: ${client.id}, User: ${userId}`);
        } catch (e) {
            console.error('WS Connection error:', e.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('ping')
    handlePing(client: Socket) {
        return { event: 'pong', data: new Date().toISOString() };
    }
}
