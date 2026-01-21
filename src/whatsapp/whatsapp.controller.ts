import { Controller, Get, Post, Body, Query, Res, HttpStatus, Logger, HttpCode } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('whatsapp')
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);

    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly configService: ConfigService,
    ) { }

    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('Webhook verified successfully');
            return res.status(HttpStatus.OK).send(challenge);
        } else {
            this.logger.warn('Webhook verification failed');
            return res.sendStatus(HttpStatus.FORBIDDEN);
        }
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleIncoming(@Body() body: any) {
        // Meta sends both messages and status updates (sent, delivered, read)
        // We only care about actual messages for now
        if (body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]) {

            this.logger.log('Received new WhatsApp message');
            // Don't await, respond 200 OK immediately to Meta
            this.whatsappService.handleIncomingMessage(body).catch(err => {
                this.logger.error(`Error handling incoming message: ${err.message}`);
            });
        }

        return { success: true };
    }

    // Optional: Add an endpoint for the Admin to send manual messages
    @Post('send')
    async sendMessage(@Body() body: { to: string, message: string }) {
        return this.whatsappService.sendMessage(body.to, body.message);
    }

    // Endpoint for the Inbox (Polling)
    @Get('messages')
    async getMessages() {
        // This will be implemented to fetch from MessageLog
        // For now, let's keep it simple
        return [];
    }
}
