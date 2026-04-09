import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractTemplate } from './entities/contract-template.entity';
import { Document, DocumentStatus } from './entities/document.entity';
import { Agent } from '../agents/entities/agent.entity';
import { DocumentsService } from './documents.service';

@Injectable()
export class ContractGeneratorService {
    constructor(
        @InjectRepository(ContractTemplate)
        private templateRepo: Repository<ContractTemplate>,
        @InjectRepository(Agent)
        private agentRepo: Repository<Agent>,
        private documentsService: DocumentsService,
    ) {}

    async findAllTemplates(tenantId: string): Promise<ContractTemplate[]> {
        return this.templateRepo.find({ where: { tenantId } });
    }

    async createTemplate(data: Partial<ContractTemplate>): Promise<ContractTemplate> {
        const template = this.templateRepo.create(data);
        return this.templateRepo.save(template);
    }

    async generateContract(agentId: number, templateId: number, tenantId: string): Promise<Document> {
        const agent = await this.agentRepo.findOne({
            where: { id: agentId, tenantId },
            relations: ['hospitalService', 'contracts', 'grade']
        });
        if (!agent) throw new NotFoundException('Agent introuvable');

        const template = await this.templateRepo.findOne({
            where: { id: templateId, tenantId }
        });
        if (!template) throw new NotFoundException('Modèle de contrat introuvable');

        // Logic for variable replacement
        const currentContract = agent.contracts?.[0]; // Taking the first one for simplicity
        
        const variables: Record<string, string> = {
            'nom': agent.nom,
            'prenom': agent.firstName || '',
            'matricule': agent.matricule,
            'adresse': agent.address || agent.street || 'A définir',
            'service': agent.hospitalService?.name || 'N/A',
            'grade': agent.grade?.name || agent.gradeLegacy || 'N/A',
            'poste': agent.jobTitle || 'N/A',
            'salaire_base': currentContract?.baseSalary?.toString() || 'A définir',
            'date_embauche': agent.hiringDate || new Date().toISOString().split('T')[0],
            'type_contrat': template.type,
            'tenant_name': tenantId
        };

        let renderedContent = template.content;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            renderedContent = renderedContent.replace(regex, value);
        }

        // Add a professional frame
        const finalHtml = `
            <div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto; background: white; color: black; border: 1px solid #eee;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px;">Contrat de Travail (${template.type})</h1>
                </div>
                ${renderedContent}
                <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>L'Employeur</strong></p>
                        <div style="height: 100px;"></div>
                    </div>
                    <div>
                        <p><strong>L'Employé</strong></p>
                        <p style="font-size: 0.8em; color: gray;">(Lu et approuvé)</p>
                        <div style="height: 100px;"></div>
                    </div>
                </div>
            </div>
        `;

        // Create the document in GED
        const doc = await this.documentsService.createDocument({
            tenantId,
            agentId: agent.id,
            title: `Contrat de Travail - ${agent.nom} (${template.type})`,
            type: 'Contrat',
            status: DocumentStatus.DRAFT,
            fileUrl: `data:text/html;base64,${Buffer.from(finalHtml).toString('base64')}` // For now, storing as base64 in the URL field for easy preview
        });

        return doc;
    }
}
