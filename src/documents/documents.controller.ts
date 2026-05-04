import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import { AgentsService } from '../agents/agents.service';
import { ContractGeneratorService } from './contract-generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { diskStorage } from 'multer';
import * as path from 'path';
import type { Request as ExpressRequest } from 'express';
import {
  CreateContractTemplateDto,
  GenerateContractDto,
  RequestSignatureDto,
  SignDocumentDto,
  UpdateDocumentDto,
  UploadDocumentDto,
} from './dto/document-security.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly agentsService: AgentsService,
    private readonly contractGenerator: ContractGeneratorService,
  ) {}

  @Get()
  @Permissions('documents:read', 'agents:read')
  async getDocuments(
    @Request() req: AuthenticatedRequest,
    @Query('agentId') agentId?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    const tenantId =
      req.user.role === 'SUPER_ADMIN' && queryTenantId
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/documents',
        filename: (
          _req: ExpressRequest,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname +
              '-' +
              uniqueSuffix +
              path.extname(file.originalname),
          );
        },
      }),
    }),
  )
  async uploadDocument(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadDocumentDto,
  ) {
    // Fallback fileUrl in case it's a manual DB entry without upload for now
    const fileUrl = file
      ? `/uploads/documents/${file.filename}`
      : '/uploads/dummy.pdf';

    const tenantId =
      req.user.role === 'SUPER_ADMIN' && body.tenantId
        ? body.tenantId
        : req.user.tenantId;

    // SECURITY: Agents can only upload to their own vault. Admins can upload to anyone.
    let targetAgentId = body.agentId || req.user.id;
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

  // --- CONTRACT GENERATION ---

  @Get('templates')
  async getTemplates(
    @Query('tenantId') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractGenerator.findAllTemplates(
      tenantId || req.user.tenantId,
    );
  }

  @Post('templates')
  async createTemplate(
    @Body() body: CreateContractTemplateDto,
    @Query('tenantId') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractGenerator.createTemplate({
      ...body,
      tenantId: tenantId || req.user.tenantId,
    });
  }

  @Post('generate-contract')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async generateContract(
    @Body() body: GenerateContractDto,
    @Query('tenantId') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.contractGenerator.generateContract(
      body.agentId,
      body.templateId,
      tenantId || req.user.tenantId,
    );
  }

  @Post(':id')
  @Permissions('documents:write')
  async updateDocument(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(req.user.tenantId, +id, body);
  }

  @Post(':id/request-signature')
  @Permissions('documents:write')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async requestSignature(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: RequestSignatureDto,
  ) {
    const signUrl = await this.documentsService.requestSignature(
      req.user.tenantId,
      +id,
      body.agentId,
    );
    return { success: true, signUrl };
  }

  @Post(':id/sign')
  @Permissions('documents:read')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async signDocument(
    @Param('id') id: string,
    @Body() body: SignDocumentDto,
    @Query('tenantId') tenantId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.get('user-agent') || 'MediPlan-Web-Client';

    return this.documentsService.signDocument(
      tenantId || req.user.tenantId,
      +id,
      body.agentId,
      body.otp,
      clientIp,
      userAgent,
    );
  }
}
