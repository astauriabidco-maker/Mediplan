import { Controller, Get, Post, Param, Body, UseGuards, Request, Query, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { AgentsService } from '../agents/agents.service';
import { ContractGeneratorService } from './contract-generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly agentsService: AgentsService,
        private readonly contractGenerator: ContractGeneratorService
    ) { }

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

    @Post(':id')
    @Permissions('documents:write')
    async updateDocument(@Request() req: any, @Param('id') id: string, @Body() body: Partial<Document>) {
        return this.documentsService.updateDocument(req.user.tenantId, +id, body);
    }

    @Post(':id/request-signature')
    @Permissions('documents:write')
    async requestSignature(@Request() req: any, @Param('id') id: string, @Body() body: { agentId: number }) {
        const signUrl = await this.documentsService.requestSignature(req.user.tenantId, +id, body.agentId);
        return { success: true, signUrl };
    }

    @Post(':id/sign')
    @Permissions('documents:read')
    async signDocument(
        @Param('id') id: string,
        @Body() body: { otp: string, agentId: number },
        @Query('tenantId') tenantId: string,
        @Req() req: any
    ) {
        const clientIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'MediPlan-Web-Client';
        return this.documentsService.signDocument(tenantId || req.user.tenantId, +id, body.agentId, body.otp, clientIp, userAgent);
    }

    // --- CONTRACT GENERATION ---

    @Get('templates')
    async getTemplates(@Query('tenantId') tenantId: string, @Req() req: any) {
        return this.contractGenerator.findAllTemplates(tenantId || req.user.tenantId);
    }

    @Post('templates')
    async createTemplate(@Body() body: any, @Query('tenantId') tenantId: string, @Req() req: any) {
        return this.contractGenerator.createTemplate({ ...body, tenantId: tenantId || req.user.tenantId });
    }

    @Post('generate-contract')
    async generateContract(
        @Body() body: { agentId: number, templateId: number },
        @Query('tenantId') tenantId: string,
        @Req() req: any
    ) {
        return this.contractGenerator.generateContract(body.agentId, body.templateId, tenantId || req.user.tenantId);
    }
}
