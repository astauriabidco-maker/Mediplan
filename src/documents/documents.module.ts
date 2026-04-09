import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { SignatureLog } from './entities/signature-log.entity';
import { AuditModule } from '../audit/audit.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Document, SignatureLog]),
        AuditModule,
        WhatsappModule,
        AgentsModule
    ],
    controllers: [DocumentsController],
    providers: [DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule {}
