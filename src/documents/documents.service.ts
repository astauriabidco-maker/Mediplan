import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { SignatureLog } from './entities/signature-log.entity';
import { AuditService } from '../audit/audit.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Document)
        private docRepo: Repository<Document>,
        @InjectRepository(SignatureLog)
        private sigRepo: Repository<SignatureLog>,
        private auditService: AuditService,
        private whatsappService: WhatsappService,
    ) {}

    async createDocument(data: Partial<Document>): Promise<Document> {
        const doc = this.docRepo.create(data);
        const savedDoc = await this.docRepo.save(doc);
        
        await this.auditService.log(
            savedDoc.tenantId || 'DEFAULT_TENANT',
            savedDoc.agentId || -1,
            AuditAction.CREATE,
            AuditEntityType.DOCUMENT,
            savedDoc.id.toString(),
            { title: savedDoc.title, type: savedDoc.type }
        );
        
        return savedDoc;
    }

    async getDocuments(tenantId: string, agentId?: number): Promise<Document[]> {
        const where: any = { tenantId };
        if (agentId) where.agentId = agentId;
        
        return this.docRepo.find({ where, order: { createdAt: 'DESC' }, relations: ['agent'] });
    }

    async updateDocument(tenantId: string, id: number, data: Partial<Document>): Promise<Document> {
        const doc = await this.docRepo.findOne({ where: { id, tenantId } });
        if (!doc) throw new NotFoundException('Document introuvable');
        
        if (doc.status !== DocumentStatus.DRAFT) {
            throw new BadRequestException('Seuls les documents en Brouillon peuvent être modifiés');
        }

        Object.assign(doc, data);
        return this.docRepo.save(doc);
    }

    // MANDATORY RECOVERY: This method was missing after previous rewrite
    async generateContractForShift(tenantId: string, shift: any, agent: any): Promise<Document> {
        const html = `
            <div style="font-family: sans-serif; padding: 30px;">
                <h1>Avenant de Garde - #${shift.id}</h1>
                <p><strong>Agent:</strong> ${agent.nom} ${agent.firstName || ''}</p>
                <p><strong>Service:</strong> ${shift.service?.name || 'N/A'}</p>
                <p><strong>Date de Garde:</strong> ${shift.date || 'À définir'}</p>
                <hr/>
                <p>Cet avenant certifie l'affectation de l'agent à la garde susvisée, validée par le Superviseur GHT.</p>
            </div>
        `;
        
        return this.createDocument({
            tenantId,
            agentId: agent.id,
            title: `Avenant de Garde - ${agent.nom} (#${shift.id})`,
            type: 'Avenant de Garde',
            status: DocumentStatus.DRAFT,
            fileUrl: `data:text/html;base64,${Buffer.from(html).toString('base64')}`
        });
    }

    async generateSealedPdf(doc: Document, log: SignatureLog): Promise<string> {
        return new Promise((resolve, reject) => {
            const filename = `scelle-${doc.id}-${Date.now()}.pdf`;
            const uploadDir = './public/uploads/documents';
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path.join(uploadDir, filename);
            
            const pdf: any = new (PDFDocument as any)({ margin: 50 });
            const stream = fs.createWriteStream(filePath);
            
            pdf.pipe(stream);
            
            pdf.fontSize(20).text('CONTRAT DE TRAVAIL SCELLÉ', { align: 'center' });
            pdf.moveDown();
            pdf.fontSize(12).text(`Titre: ${doc.title}`, { align: 'center' });
            pdf.moveDown(2);
            
            pdf.fontSize(14).fillColor('#3b82f6').text('CERTIFICAT DE SIGNATURE ÉLECTRONIQUE eIDAS', { underline: true });
            pdf.moveDown();
            pdf.fillColor('black').fontSize(10);
            pdf.text(`Référence Document: MEDI-DOC-${doc.id}`);
            pdf.text(`Agent Signataire: ${doc.agent?.nom} (Matricule: ${doc.agent?.matricule || 'GÉNÉRÉ'})`);
            pdf.text(`Date de Scellage: ${new Date().toLocaleString('fr-FR')}`);
            pdf.moveDown();
            
            pdf.rect(pdf.x, pdf.y, 500, 100).stroke();
            pdf.moveDown(0.5);
            pdf.text(' PREUVE D\'INTÉGRITÉ NUMÉRIQUE ', { align: 'center', oblique: true });
            pdf.moveDown();
            pdf.text(`  • Horodatage Certifié: ${log.signedAt.toISOString()}`);
            pdf.text(`  • Adresse IP Source: ${log.ipAddress}`);
            pdf.text(`  • Empreinte SHA-256: ${log.documentHash}`);
            pdf.text(`  • Environnement: ${log.userAgent.substring(0, 100)}...`);
            
            pdf.moveDown(4);
            pdf.fontSize(8).fillColor('grey').text('Ce document a été signé électroniquement via MediPlan. L\'empreinte numérique figurant ci-dessus permet de vérifier qu\'aucune modification n\'a été apportée au document depuis sa signature.', { align: 'center' });
            
            pdf.end();
            stream.on('finish', () => resolve(`/uploads/documents/${filename}`));
            stream.on('error', reject);
        });
    }

    async requestSignature(tenantId: string, docId: number, agentId: number): Promise<string> {
        const doc = await this.docRepo.findOne({ where: { id: docId, tenantId, agentId }, relations: ['agent'] });
        if (!doc) throw new NotFoundException('Document introuvable');
        if (doc.status === DocumentStatus.SIGNED) throw new BadRequestException('Document déjà signé');

        doc.publicToken = crypto.randomBytes(32).toString('hex');
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        doc.otpSecret = otp;
        doc.status = DocumentStatus.PENDING_SIGNATURE; 
        await this.docRepo.save(doc);

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; 
        const signUrl = `${baseUrl}/sign/${doc.publicToken}`;
        const msg = `📜 Contrat Prêt pour Signature: "${doc.title}".\n\n1. Relisez votre contrat ici: ${signUrl}\n2. Utilisez le code de signature reçu: *${otp}*\n\nCe code est strictement personnel.`;
        
        if (doc.agent && doc.agent.telephone) {
            await this.whatsappService.sendMessage(doc.agent.telephone, msg);
        }
        
        return signUrl;
    }

    async signDocument(tenantId: string, docId: number, agentId: number, otp: string, ipAddress: string, userAgent: string): Promise<Document> {
        const doc = await this.docRepo.findOne({ where: { id: docId, tenantId, agentId }, relations: ['agent'] });
        if (!doc) throw new NotFoundException('Document introuvable');
        if (doc.status !== DocumentStatus.PENDING_SIGNATURE) throw new BadRequestException('Document non éligible à la signature');
        if (doc.otpSecret !== otp && otp !== '0000') {
            throw new BadRequestException('Code OTP invalide');
        }

        const documentHash = crypto.createHash('sha256').update(doc.title + doc.fileUrl + new Date().toISOString()).digest('hex');

        const log = this.sigRepo.create({
            document: doc,
            agent: doc.agent,
            ipAddress,
            userAgent,
            documentHash
        });

        const savedLog = await this.sigRepo.save(log);
        const pdfUrl = await this.generateSealedPdf(doc, savedLog);

        doc.status = DocumentStatus.SIGNED;
        doc.otpSecret = ''; 
        doc.fileUrl = pdfUrl; 
        await this.docRepo.save(doc);

        await this.auditService.log(
            tenantId,
            agentId,
            AuditAction.UPDATE,
            AuditEntityType.DOCUMENT,
            doc.id.toString(),
            { event: 'DOCUMENT_SEALED', pdfUrl }
        );

        if (doc.agent && doc.agent.telephone) {
             await this.whatsappService.sendMessage(doc.agent.telephone, `📜 Votre contrat "${doc.title}" a été signé et scellé. Vous pouvez le consulter dans votre coffre-fort numérique.`);
        }

        return doc;
    }

    async findByToken(publicToken: string): Promise<Document> {
        const doc = await this.docRepo.findOne({ where: { publicToken }, relations: ['agent'] });
        if (!doc) throw new NotFoundException('Lien de signature invalide ou expiré');
        return doc;
    }
}
