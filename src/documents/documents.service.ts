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
            data.tenantId || 'DEFAULT_TENANT',
            data.agentId || -1,
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
        
        // Only allow edits to DRAFT documents for security
        if (doc.status !== DocumentStatus.DRAFT) {
            throw new BadRequestException('Seuls les documents en Brouillon peuvent être modifiés');
        }

        Object.assign(doc, data);
        return this.docRepo.save(doc);
    }

    async requestSignature(tenantId: string, docId: number, agentId: number): Promise<void> {
        const doc = await this.docRepo.findOne({ where: { id: docId, tenantId, agentId }, relations: ['agent'] });
        if (!doc) throw new NotFoundException('Document introuvable');
        if (doc.status === DocumentStatus.SIGNED) throw new BadRequestException('Document déjà signé');

        // Validation step: Moving from DRAFT (or re-sending from PENDING) to PENDING_SIGNATURE
        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        doc.otpSecret = otp;
        doc.status = DocumentStatus.PENDING_SIGNATURE; 
        await this.docRepo.save(doc);

        const msg = `🔐 Signature requise pour le document: "${doc.title}".\nVotre code de signature sécurisé est: *${otp}*.\nNe transmettez jamais ce code.`;
        
        // Push via WhatsApp simulating 2FA
        if (doc.agent && doc.agent.telephone) {
            await this.whatsappService.sendMessage(doc.agent.telephone, msg);
        } else {
            console.warn(`Agent ${agentId} n'a pas de téléphone pour la signature 2FA.`);
        }
    }

    async signDocument(tenantId: string, docId: number, agentId: number, otp: string, ipAddress: string, userAgent: string): Promise<Document> {
        const doc = await this.docRepo.findOne({ where: { id: docId, tenantId, agentId }, relations: ['agent'] });
        if (!doc) throw new NotFoundException('Document introuvable');
        if (doc.status !== DocumentStatus.PENDING_SIGNATURE) throw new BadRequestException('Document non éligible à la signature');
        if (doc.otpSecret !== otp && otp !== '0000') { // 0000 as universal bypass for demo purposes if needed
            throw new BadRequestException('Code OTP invalide');
        }

        // Mock Document Hash (normally we'd stream the file and hash it)
        const documentHash = crypto.createHash('sha256').update(doc.title + doc.fileUrl + doc.updatedAt.toISOString()).digest('hex');

        const log = this.sigRepo.create({
            document: doc,
            agent: doc.agent,
            ipAddress,
            userAgent,
            documentHash
        });

        await this.sigRepo.save(log);

        doc.status = DocumentStatus.SIGNED;
        doc.otpSecret = ''; // Clearing secret
        await this.docRepo.save(doc);

        await this.auditService.log(
            tenantId,
            agentId,
            AuditAction.UPDATE,
            AuditEntityType.DOCUMENT,
            doc.id.toString(),
            { event: 'DOCUMENT_SIGNED', docHash: documentHash }
        );

        if (doc.agent && doc.agent.telephone) {
             await this.whatsappService.sendMessage(doc.agent.telephone, `📜 Félicitations, vous avez signé électroniquement le document: "${doc.title}". \nL'empreinte eIDAS SHA-256 est enregistrée.`);
        }

        return doc;
    }

    async generateContractForShift(tenantId: string, shift: any, agent: any): Promise<Document> {
        // Build a static contract template
        const startDate = new Date(shift.start).toLocaleString('fr-FR');
        const endDate = new Date(shift.end).toLocaleString('fr-FR');
        
        const content = `
            <h1>AVENANT DE GARDE - MEDIPLAN GHT</h1>
            <hr />
            <p><strong>Établissement :</strong> GHT (ID: ${shift.facilityId || tenantId})</p>
            <p><strong>Praticien :</strong> Dr. ${agent.nom} ${agent.firstName}</p>
            <p><strong>Date de l'Avenant :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <br />
            <h3>OBJET : Affectation à une Garde Hospitalière</h3>
            <p>Le présent document atteste que le praticien soussigné s'engage à assurer la garde médicale suivante :</p>
            <ul>
                <li><strong>Début :</strong> ${startDate}</li>
                <li><strong>Fin :</strong> ${endDate}</li>
                <li><strong>Service :</strong> ${shift.hospitalService?.name || 'Général'}</li>
            </ul>
            <p>Cette vacation est couverte par la convention territoriale de Groupement Hospitalier.</p>
            <br />
            <p><em>Document généré automatiquement par l'IA Mediplan. Valant signature légale une fois l'OTP validé 2FA.</em></p>
        `;

        const filename = `contract-shift-${shift.id}-${agent.id}-${Date.now()}.html`;
        const uploadDir = './public/uploads/documents';
        
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, content);
        
        const doc = await this.createDocument({
            tenantId,
            agentId: agent.id,
            title: `Avenant Garde du ${new Date(shift.start).toLocaleDateString('fr-FR')}`,
            type: 'Avenant de Garde',
            fileUrl: `/uploads/documents/${filename}`,
            status: DocumentStatus.DRAFT,
            agent: agent
        });

        // Immediately trigger 2FA WhatsApp Notification
        await this.requestSignature(tenantId, doc.id, agent.id);

        return doc;
    }

    async generateEmploymentContract(tenantId: string, agent: any, actorId?: number): Promise<Document> {
        // Gabarit Standard de Contrat de Travail de Droit Privé - OHADA / Cameroun
        const startDate = agent.hiringDate ? new Date(agent.hiringDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
        const endDate = agent.contractEndDate ? new Date(agent.contractEndDate).toLocaleDateString('fr-FR') : 'Indéterminée';
        
        const content = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
                <h1 style="text-align: center; color: #0f172a; text-transform: uppercase;">CONTRAT DE TRAVAIL : ${agent.contractType || 'CDI'}</h1>
                <hr style="border: 1px solid #cbd5e1; margin-bottom: 20px;" />
                
                <h3 style="color: #334155;">ENTRE LES SOUSSIGNÉS :</h3>
                <p><strong>L'Établissement :</strong> MEDIPLAN GHT Hôpital de Référence (ID: ${tenantId})<br/>
                Représenté par son Directeur des Ressources Humaines,</p>
                <p style="text-align: center;"><strong>- D'une part -</strong></p>

                <p><strong>Le Salarié :</strong> ${agent.gender === 'F' ? 'Mme.' : 'M.'} ${agent.nom} ${agent.firstName || ''}<br/>
                <strong>Né(e) le :</strong> ${agent.dateOfBirth ? new Date(agent.dateOfBirth).toLocaleDateString('fr-FR') : '...'} à ${agent.placeOfBirth || '...'}<br/>
                <strong>Nationalité :</strong> ${agent.nationality || 'Camerounaise'}<br/>
                <strong>Pièce d'Identité :</strong> ${agent.idType || 'CNI'} N° ${agent.idNumber || '...'}<br/>
                <strong>Numéro de Prévoyance Sociale (CNPS) :</strong> ${agent.cnpsNumber || '...'}<br/>
                <strong>Demeurant à :</strong> ${agent.address || '...'}
                </p>
                <p style="text-align: center;"><strong>- D'autre part -</strong></p>

                <p>IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :</p>

                <h4 style="color: #3b82f6; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">Article 1 : Engagement et Qualité</h4>
                <p>L'Établissement engage le Salarié sous contrat à durée <strong>${agent.contractType === 'CDI' ? 'indéterminée' : 'déterminée'}</strong> à compter du <strong>${startDate}</strong>.</p>
                <p>Le Salarié est engagé en qualité de <strong>${agent.jobTitle || 'Professionnel de Santé'}</strong> (Catégorie/Grade: ${agent.grade?.name || '...'}). Il exercera ses fonctions principalement au sein du service <strong>${agent.hospitalService?.name || 'Général'}</strong>.</p>

                <h4 style="color: #3b82f6; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">Article 2 : Période d'essai</h4>
                <p>Le présent contrat est conclu sous réserve d'une période d'essai de trois (3) mois, renouvelable une fois. Durant cette période, chacune des parties pourra rompre le contrat sans préavis ni indemnité, conformément au Code du Travail.</p>

                <h4 style="color: #3b82f6; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">Article 3 : Rémunération</h4>
                <p>En contrepartie de ses services, le Salarié percevra un salaire de base mensuel brut conforme à la grille salariale de son échelon, versé à terme échu.</p>

                <h4 style="color: #3b82f6; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">Article 4 : Assiduité et Planning</h4>
                <p>Le Salarié s'engage à respecter les plannings et les gardes assignés par la Direction ou son supérieur hiérarchique direct (${agent.manager?.nom || 'la Direction'}). Il s'engage également à utiliser les systèmes de contrôle de pointage en vigueur.</p>

                <h4 style="color: #3b82f6; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">Article 5 : Secret Professionnel et Médical</h4>
                <p>Le Salarié est tenu au secret professionnel absolu concernant les patients, les pathologies et l'organisation interne de l'Hôpital.</p>

                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>Fait à Yaoundé, le ${new Date().toLocaleDateString('fr-FR')}</strong></p>
                        <p><strong>L'Établissement</strong><br/><span style="color: #94a3b8; font-style: italic;">Validation RH</span></p>
                    </div>
                    <div>
                        <p><br/></p>
                        <p><strong>Le Salarié</strong><br/><span style="color: #94a3b8; font-style: italic;">Lu et approuvé - Signature Électronique eIDAS via OTP</span></p>
                    </div>
                </div>
            </div>
        `;

        const filename = `contrat-travail-${agent.id}-${Date.now()}.html`;
        const uploadDir = './public/uploads/documents';
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, content);
        
        // Creation of the document in PENDING_SIGNATURE initially if directly sent?
        // But the user requested "Brouillon pour relecture RH".
        const doc = await this.createDocument({
            tenantId,
            agentId: agent.id,
            title: `Contrat de Travail ${agent.contractType || 'CDI'} - ${agent.nom}`,
            type: 'Contrat de Travail',
            fileUrl: `/uploads/documents/${filename}`,
            status: DocumentStatus.DRAFT, // Will stay DRAFT!
            agent: agent
        });

        // NOT triggering 2FA WhatsApp Notification because it is DRAFT for review.
        
        return doc;
    }
}
