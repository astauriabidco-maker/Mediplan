import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsPublicController } from './documents-public.controller';
import { Document } from './entities/document.entity';
import { SignatureLog } from './entities/signature-log.entity';
import { ContractTemplate } from './entities/contract-template.entity';
import { AuditModule } from '../audit/audit.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ContractGeneratorService } from './contract-generator.service';
import { AgentsModule } from '../agents/agents.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, SignatureLog, ContractTemplate]),
        AuditModule,
        forwardRef(() => WhatsappModule),
        forwardRef(() => AgentsModule),
    ],
    controllers: [DocumentsController, DocumentsPublicController],
    providers: [DocumentsService, ContractGeneratorService],
    exports: [DocumentsService, ContractGeneratorService],
})
export class DocumentsModule {}
