import { Controller, Get, Post, Param, Body, UseGuards, Request, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Get()
    @Permissions('documents:read', 'agents:read')
    async getDocuments(
        @Request() req: any,
        @Query('agentId') agentId?: string,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;

        // SECURITY: If the user is a standard agent, force them to only see their own documents.
        let targetAgentId = agentId ? +agentId : undefined;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            targetAgentId = req.user.id;
        }

        return this.documentsService.getDocuments(tenantId, targetAgentId);
    }

    @Post('upload')
    @Permissions('documents:write')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './public/uploads/documents',
            filename: (req: any, file: any, cb: any) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
            }
        })
    }))
    async uploadDocument(
        @Request() req: any,
        @UploadedFile() file: any, // Express.Multer.File
        @Body() body: { title: string; agentId: string; type: string; tenantId?: string }
    ) {
        // Fallback fileUrl in case it's a manual DB entry without upload for now
        const fileUrl = file ? `/uploads/documents/${file.filename}` : '/uploads/dummy.pdf';
        
        const tenantId = (req.user.role === 'SUPER_ADMIN' && body.tenantId) 
            ? body.tenantId 
            : req.user.tenantId;

        // SECURITY: Agents can only upload to their own vault. Admins can upload to anyone.
        let targetAgentId = body.agentId ? +body.agentId : req.user.id;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            targetAgentId = req.user.id;
        }

        return this.documentsService.createDocument({
            tenantId: tenantId,
            title: body.title,
            agentId: targetAgentId,
            type: body.type || 'Autre',
            fileUrl: fileUrl,
        });
    }

    @Post(':id/request-signature')
    @Permissions('documents:write')
    async requestSignature(@Request() req: any, @Param('id') id: string, @Body() body: { agentId: number }) {
        await this.documentsService.requestSignature(req.user.tenantId, +id, body.agentId);
        return { success: true, message: 'OTP envoyé sur WhatsApp' };
    }

    @Post(':id/sign')
    @Permissions('documents:read') // An agent signing their own document.
    async signDocument(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { agentId: number, otp: string }
    ) {
        // Collect IP and User-Agent for eIDAS simulated tracking
        const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        return this.documentsService.signDocument(req.user.tenantId, +id, body.agentId, body.otp, ip, userAgent);
    }
}
