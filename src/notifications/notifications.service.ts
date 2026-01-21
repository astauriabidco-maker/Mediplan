import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(private readonly gateway: NotificationsGateway) { }

    async sendNotification(userId: number, type: string, data: any) {
        this.gateway.server.to(`user_${userId}`).emit('notification', {
            type,
            data,
            timestamp: new Date().toISOString(),
        });
    }

    async notifyLeaveRequested(managerId: number, leaveData: any) {
        await this.sendNotification(managerId, 'LEAVE_REQUESTED', leaveData);
    }

    async notifyLeaveProcessed(agentId: number, leaveData: any) {
        await this.sendNotification(agentId, 'LEAVE_PROCESSED', leaveData);
    }
}
