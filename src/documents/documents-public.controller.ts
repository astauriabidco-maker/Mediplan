import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import * as express from 'express';

@Controller('api/documents/public')
export class DocumentsPublicController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Get(':token')
    async getDocument(@Param('token') token: string) {
        const doc = await this.documentsService.findByToken(token);
        return {
            title: doc.title,
            type: doc.type,
            fileUrl: doc.fileUrl,
            agentName: doc.agent?.nom,
            status: doc.status
        };
    }

    @Post(':token/sign')
    async signDocument(
        @Param('token') token: string,
        @Body() body: { otp: string },
        @Req() req: express.Request
    ) {
        const doc = await this.documentsService.findByToken(token);
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'MediPlan-Mobile';

        return this.documentsService.signDocument(
            doc.tenantId,
            doc.id,
            doc.agent.id,
            body.otp,
            ipAddress,
            userAgent
        );
    }
}
