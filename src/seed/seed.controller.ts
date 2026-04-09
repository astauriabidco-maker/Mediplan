import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, UserRole } from '../agents/entities/agent.entity';
import { HospitalService } from '../agents/entities/hospital-service.entity';
import { Leave, LeaveStatus, LeaveType } from '../planning/entities/leave.entity';
import { Competency } from '../competencies/entities/competency.entity';
import { AgentCompetency } from '../competencies/entities/agent-competency.entity';
import { Document, DocumentStatus } from '../documents/entities/document.entity';
import { Contract } from '../agents/entities/contract.entity';
import { BonusTemplate } from '../agents/entities/bonus-template.entity';
import { ContractBonus } from '../agents/entities/contract-bonus.entity';
import { PayrollRule, PayrollRuleType } from '../payroll/entities/payroll-rule.entity';
import * as bcrypt from 'bcrypt';
import { addDays, subDays } from 'date-fns';

@Controller('seed')
export class SeedController {
    constructor(
        @InjectRepository(Agent)
        private agentRepo: Repository<Agent>,
        @InjectRepository(HospitalService)
        private serviceRepo: Repository<HospitalService>,
        @InjectRepository(Leave)
        private leaveRepo: Repository<Leave>,
        @InjectRepository(Competency)
        private compRepo: Repository<Competency>,
        @InjectRepository(AgentCompetency)
        private agentCompRepo: Repository<AgentCompetency>,
        @InjectRepository(Document)
        private documentRepo: Repository<Document>,
        @InjectRepository(Contract)
        private contractRepo: Repository<Contract>,
        @InjectRepository(BonusTemplate)
        private bonusTemplateRepo: Repository<BonusTemplate>,
        @InjectRepository(ContractBonus)
        private contractBonusRepo: Repository<ContractBonus>,
        @InjectRepository(PayrollRule)
        private payrollRuleRepo: Repository<PayrollRule>,
    ) { }

    @Post('hgd')
    async seedHGD() {
        const tenantId = 'HGD-DOUALA';
        const passwordHash = await bcrypt.hash('password123', 10);

        // 1. Break circular dependencies in services (parent/sub)
        await this.serviceRepo.update({ tenantId }, { parentServiceId: null });

        // 2. Break relationships between services and agents (responsibles)
        await this.serviceRepo.update({ tenantId }, {
            chiefId: null,
            deputyChiefId: null,
            majorId: null,
            nursingManagerId: null
        });

        // 3. Clear data
        await this.payrollRuleRepo.delete({ tenantId });
        await this.contractBonusRepo.createQueryBuilder().delete().execute();
        await this.contractRepo.createQueryBuilder().delete().execute();
        await this.bonusTemplateRepo.delete({ tenantId });
        await this.agentCompRepo.createQueryBuilder().delete().execute();
        await this.compRepo.createQueryBuilder().delete().execute();
        await this.documentRepo.delete({ tenantId });
        await this.leaveRepo.delete({ tenantId });
        await this.agentRepo.delete({ tenantId });
        await this.serviceRepo.delete({ tenantId });

        // Create services
        const urgences = await this.serviceRepo.save({
            name: 'Urgences',
            code: 'URG',
            description: 'Service des urgences médicales et chirurgicales',
            level: 1,
            tenantId,
            minAgents: 15,
            maxAgents: 25,
        });

        const chirurgie = await this.serviceRepo.save({
            name: 'Chirurgie',
            code: 'CHIR',
            description: 'Service de chirurgie générale et spécialisée',
            level: 1,
            tenantId,
            minAgents: 20,
            maxAgents: 35,
        });

        const medecineInterne = await this.serviceRepo.save({
            name: 'Médecine Interne',
            code: 'MED',
            description: 'Service de médecine générale et spécialités médicales',
            level: 1,
            tenantId,
            minAgents: 18,
            maxAgents: 30,
        });

        const pediatrie = await this.serviceRepo.save({
            name: 'Pédiatrie',
            code: 'PED',
            description: 'Service de soins pédiatriques',
            level: 1,
            tenantId,
            minAgents: 12,
            maxAgents: 20,
        });

        const maternite = await this.serviceRepo.save({
            name: 'Maternité',
            code: 'MAT',
            description: 'Service de gynécologie-obstétrique',
            level: 1,
            tenantId,
            minAgents: 15,
            maxAgents: 25,
        });

        const radiologie = await this.serviceRepo.save({
            name: 'Radiologie & Imagerie',
            code: 'RAD',
            description: 'Service d\'imagerie médicale',
            level: 1,
            tenantId,
            minAgents: 8,
            maxAgents: 15,
        });

        const laboratoire = await this.serviceRepo.save({
            name: 'Laboratoire',
            code: 'LAB',
            description: 'Analyses biologiques et médicales',
            level: 1,
            tenantId,
            minAgents: 10,
            maxAgents: 18,
        });

        const administration = await this.serviceRepo.save({
            name: 'Administration',
            code: 'ADM',
            description: 'Direction et services administratifs',
            level: 1,
            tenantId,
            minAgents: 8,
            maxAgents: 15,
        });

        // Sub-services
        const chirurgieViscerale = await this.serviceRepo.save({
            name: 'Chirurgie Viscérale',
            code: 'CHIR-VIS',
            description: 'Chirurgie digestive et viscérale',
            level: 2,
            parentServiceId: chirurgie.id,
            tenantId,
            minAgents: 6,
            maxAgents: 10,
        });

        const chirurgieOrtho = await this.serviceRepo.save({
            name: 'Chirurgie Orthopédique',
            code: 'CHIR-ORT',
            description: 'Traumatologie et orthopédie',
            level: 2,
            parentServiceId: chirurgie.id,
            tenantId,
            minAgents: 8,
            maxAgents: 12,
        });

        const chirurgieCardio = await this.serviceRepo.save({
            name: 'Chirurgie Cardiaque',
            code: 'CHIR-CAR',
            description: 'Chirurgie cardiovasculaire',
            level: 2,
            parentServiceId: chirurgie.id,
            tenantId,
            minAgents: 6,
            maxAgents: 10,
        });

        const cardiologie = await this.serviceRepo.save({
            name: 'Cardiologie',
            code: 'CARD',
            description: 'Pathologies cardiovasculaires',
            level: 2,
            parentServiceId: medecineInterne.id,
            tenantId,
            minAgents: 6,
            maxAgents: 10,
        });

        const pneumologie = await this.serviceRepo.save({
            name: 'Pneumologie',
            code: 'PNEU',
            description: 'Pathologies respiratoires',
            level: 2,
            parentServiceId: medecineInterne.id,
            tenantId,
            minAgents: 5,
            maxAgents: 8,
        });

        const gastro = await this.serviceRepo.save({
            name: 'Gastro-entérologie',
            code: 'GAST',
            description: 'Pathologies digestives',
            level: 2,
            parentServiceId: medecineInterne.id,
            tenantId,
            minAgents: 5,
            maxAgents: 8,
        });

        // Create agents
        const directeur = await this.agentRepo.save({
            nom: 'NKOTTO EMANE',
            firstName: 'Jean-Baptiste',
            email: 'directeur@hgd-douala.cm',
            matricule: 'HGD-DIR-001',
            telephone: '+237 699 123 456',
            gender: 'M',
            jobTitle: 'Directeur Général',
            contractType: 'CDI',
            hiringDate: '2018-01-15',
            hospitalServiceId: administration.id,
            tenantId,
            role: UserRole.ADMIN,
            password: passwordHash, // password123
        });

        const chefChirurgie = await this.agentRepo.save({
            nom: 'MBARGA ATANGANA',
            firstName: 'Paul',
            email: 'p.mbarga@hgd-douala.cm',
            matricule: 'HGD-CHIR-001',
            telephone: '+237 677 234 567',
            gender: 'M',
            jobTitle: 'Chef de Service - Chirurgie',
            contractType: 'CDI',
            hiringDate: '2019-03-01',
            hospitalServiceId: chirurgie.id,
            managerId: directeur.id,
            tenantId,
            password: passwordHash,
        });

        await this.serviceRepo.update(chirurgie.id, { chiefId: chefChirurgie.id });

        const adjointChirurgie = await this.agentRepo.save({
            nom: 'NKOLO FOMO',
            firstName: 'Marie-Claire',
            email: 'm.nkolo@hgd-douala.cm',
            matricule: 'HGD-CHIR-002',
            telephone: '+237 655 345 678',
            gender: 'F',
            jobTitle: 'Médecin Adjoint - Chirurgie',
            contractType: 'CDI',
            hiringDate: '2020-06-15',
            hospitalServiceId: chirurgie.id,
            managerId: chefChirurgie.id,
            tenantId,
            password: passwordHash,
        });

        await this.serviceRepo.update(chirurgie.id, { deputyChiefId: adjointChirurgie.id });

        const majorChirurgie = await this.agentRepo.save({
            nom: 'ESSOMBA BELLE',
            firstName: 'Françoise',
            email: 'f.essomba@hgd-douala.cm',
            matricule: 'HGD-CHIR-003',
            telephone: '+237 690 456 789',
            gender: 'F',
            jobTitle: 'Major - Chirurgie',
            contractType: 'CDI',
            hiringDate: '2017-09-01',
            hospitalServiceId: chirurgie.id,
            managerId: chefChirurgie.id,
            tenantId,
            password: passwordHash,
        });

        await this.serviceRepo.update(chirurgie.id, { majorId: majorChirurgie.id });

        const chefUrgences = await this.agentRepo.save({
            nom: 'ONDOA MEKONGO',
            firstName: 'Sylvie',
            email: 's.ondoa@hgd-douala.cm',
            matricule: 'HGD-URG-001',
            telephone: '+237 699 678 901',
            gender: 'F',
            jobTitle: 'Chef de Service - Urgences',
            contractType: 'CDI',
            hiringDate: '2018-05-01',
            hospitalServiceId: urgences.id,
            managerId: directeur.id,
            tenantId,
            password: passwordHash,
        });

        await this.serviceRepo.update(urgences.id, { chiefId: chefUrgences.id });

        const majorUrgences = await this.agentRepo.save({
            nom: 'EBODE TALLA',
            firstName: 'Martin',
            email: 'm.ebode@hgd-douala.cm',
            matricule: 'HGD-URG-002',
            telephone: '+237 677 789 012',
            gender: 'M',
            jobTitle: 'Major - Urgences',
            contractType: 'CDI',
            hiringDate: '2019-02-15',
            hospitalServiceId: urgences.id,
            managerId: chefUrgences.id,
            tenantId,
            password: passwordHash,
        });

        await this.serviceRepo.update(urgences.id, { majorId: majorUrgences.id });

        // Additional agents
        const agents = [
            { nom: 'ATEBA NANA', firstName: 'Thomas', service: chirurgieViscerale.id, manager: chefChirurgie.id, jobTitle: 'Responsable - Chirurgie Viscérale', contractType: 'CDI' },
            { nom: 'NGUEMA OBIANG', firstName: 'André', service: chirurgieViscerale.id, manager: chefChirurgie.id, jobTitle: 'Chirurgien', contractType: 'CDI' },
            { nom: 'MBASSI NDONGO', firstName: 'Élise', service: chirurgieViscerale.id, manager: chefChirurgie.id, jobTitle: 'Infirmière', contractType: 'CDD' },
            { nom: 'OWONA MBALLA', firstName: 'Patrick', service: chirurgieOrtho.id, manager: chefChirurgie.id, jobTitle: 'Chirurgien Orthopédiste', contractType: 'CDI' },
            { nom: 'BELLA EYOUM', firstName: 'Catherine', service: chirurgieOrtho.id, manager: chefChirurgie.id, jobTitle: 'Infirmière', contractType: 'CDI' },
            { nom: 'FOUDA MANI', firstName: 'Jacques', service: chirurgieCardio.id, manager: chefChirurgie.id, jobTitle: 'Chirurgien Cardiologue', contractType: 'CDI' },
            { nom: 'ZAMBO ANGUISSA', firstName: 'Léon', service: urgences.id, manager: chefUrgences.id, jobTitle: 'Médecin Urgentiste', contractType: 'CDI' },
            { nom: 'MEKA BILONG', firstName: 'Jeanne', service: urgences.id, manager: majorUrgences.id, jobTitle: 'Infirmière', contractType: 'CDI' },
            { nom: 'ABENA MANGA', firstName: 'Robert', service: urgences.id, manager: majorUrgences.id, jobTitle: 'Aide-soignant', contractType: 'CDD' },
            { nom: 'NGONO EBOGO', firstName: 'Pauline', service: urgences.id, manager: majorUrgences.id, jobTitle: 'Infirmière', contractType: 'CDI' },
            { nom: 'ETOA ABENA', firstName: 'Bernard', service: medecineInterne.id, manager: directeur.id, jobTitle: 'Chef de Service - Médecine Interne', contractType: 'CDI' },
            { nom: 'MENDO ZE', firstName: 'Christophe', service: cardiologie.id, manager: directeur.id, jobTitle: 'Cardiologue', contractType: 'CDI' },
            { nom: 'NANGA MBARGA', firstName: 'Hélène', service: pediatrie.id, manager: directeur.id, jobTitle: 'Chef de Service - Pédiatrie', contractType: 'CDI' },
            { nom: 'BIKORO ASSIGA', firstName: 'Monique', service: maternite.id, manager: directeur.id, jobTitle: 'Chef de Service - Maternité', contractType: 'CDI' },
            { nom: 'MVONDO ASSAM', firstName: 'Emmanuel', service: radiologie.id, manager: directeur.id, jobTitle: 'Chef de Service - Radiologie', contractType: 'CDI' },
            { nom: 'OLINGA OLINGA', firstName: 'Thérèse', service: laboratoire.id, manager: directeur.id, jobTitle: 'Chef de Service - Laboratoire', contractType: 'CDI' },
        ];

        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            await this.agentRepo.save({
                nom: a.nom,
                firstName: a.firstName,
                email: `${a.firstName.toLowerCase()}.${a.nom.toLowerCase().split(' ')[0]}@hgd-douala.cm`,
                matricule: `HGD-${String(i + 100).padStart(3, '0')}`,
                telephone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
                gender: ['André', 'Thomas', 'Patrick', 'Jacques', 'Léon', 'Robert', 'Bernard', 'Christophe', 'Emmanuel'].includes(a.firstName) ? 'M' : 'F',
                jobTitle: a.jobTitle,
                contractType: a.contractType,
                hiringDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
                hospitalServiceId: a.service,
                managerId: a.manager,
                tenantId,
                password: passwordHash,
            });
        }

        // --- SEED BONUS TEMPLATES ---
        const bonusTemplates = await Promise.all([
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({ tenantId, name: 'Prime de Transport', amount: 25000, isTaxable: false })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({ tenantId, name: 'Prime de Technicité Médicale', amount: 45000, isTaxable: true })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({ tenantId, name: 'Prime de Risque (Laboratoire/Radio)', amount: 35000, isTaxable: false })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({ tenantId, name: 'Indemnité de Garde Forfaitaire', amount: 60000, isTaxable: true })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({ tenantId, name: 'Prime de Santé Publique', amount: 20000, isTaxable: true })),
        ]);

        // --- SEED CONTRACTS WITH SALARY BASE ---
        const allAgents = await this.agentRepo.find({ where: { tenantId }, relations: ['manager'] });
        
        for (const agent of allAgents) {
            let baseSalary = 150000; // Base: 150k FCFA
            let hourlyRate = 1200;

            if (agent.role === UserRole.ADMIN || agent.jobTitle?.includes('Directeur')) {
                baseSalary = 800000;
                hourlyRate = 5000;
            } else if (agent.jobTitle?.includes('Chef') || agent.jobTitle?.includes('Médecin') || agent.jobTitle?.includes('Chirurgien')) {
                baseSalary = 500000;
                hourlyRate = 3000;
            } else if (agent.jobTitle?.includes('Infirmière') || agent.jobTitle?.includes('Major')) {
                baseSalary = 250000;
                hourlyRate = 1800;
            }

            const contract = await this.contractRepo.save({
                agent,
                type: agent.contractType || 'CDI',
                date_debut: new Date(agent.hiringDate || '2020-01-01'),
                solde_conges: Math.floor(Math.random() * 20) + 10,
                baseSalary,
                hourlyRate,
            });

            // Assign random bonuses
            if (agent.jobTitle?.includes('Chef')) {
                await this.contractBonusRepo.save({ contract, bonusTemplate: bonusTemplates[1] }); // Responsabilité
            }
            if (agent.hospitalServiceId === urgences?.id) {
                await this.contractBonusRepo.save({ contract, bonusTemplate: bonusTemplates[3] }); // Garde Forfaitaire
            }
            if (agent.contractType === 'CDI') {
                await this.contractBonusRepo.save({ contract, bonusTemplate: bonusTemplates[2] }); // Logement
            }
        }

        // 6.5 Seed Dynamic Payroll Rules (Cameroon Full Compliance)
        const rules = [
            { code: 'GROSS_TAXABLE', name: 'Brut Imposable', type: PayrollRuleType.CALCULATION, formula: 'baseSalary + taxableAllowances', executionOrder: 1, isActive: true },
            { code: 'CNPS_TAX', name: 'Cotisation CNPS (4.2%)', type: PayrollRuleType.TAX, formula: 'min(GROSS_TAXABLE, 750000) * 0.042', executionOrder: 2, isActive: true },
            { code: 'IRPP_BASE', name: 'Base Nette Imposable', type: PayrollRuleType.CALCULATION, formula: 'GROSS_TAXABLE - (GROSS_TAXABLE * 0.30) - CNPS_TAX', executionOrder: 3, isActive: true },
            { code: 'IRPP_ANNUAL', name: 'Base Annuelle IRPP', type: PayrollRuleType.CALCULATION, formula: 'max((IRPP_BASE * 12) - 500000, 0)', executionOrder: 4, isActive: true },
            { code: 'IRPP_TAX_ANNUAL', name: 'Calcul IRPP Annuel (Barème Progressif)', type: PayrollRuleType.CALCULATION, formula: 'IRPP_ANNUAL <= 2000000 ? IRPP_ANNUAL * 0.1 : (IRPP_ANNUAL <= 3000000 ? 200000 + ((IRPP_ANNUAL - 2000000) * 0.15) : (IRPP_ANNUAL <= 5000000 ? 350000 + ((IRPP_ANNUAL - 3000000)*0.25) : 850000 + ((IRPP_ANNUAL - 5000000)*0.33)))', executionOrder: 5, isActive: true },
            { code: 'IRPP_TAX', name: 'IRPP (10 à 33%)', type: PayrollRuleType.TAX, formula: 'IRPP_TAX_ANNUAL / 12', executionOrder: 6, isActive: true },
            { code: 'CAC_TAX', name: 'Centimes Additionnels Communaux (10%)', type: PayrollRuleType.TAX, formula: 'IRPP_TAX * 0.1', executionOrder: 7, isActive: true },
            { code: 'CCF_TAX', name: 'Crédit Foncier (1%)', type: PayrollRuleType.TAX, formula: 'GROSS_TAXABLE * 0.01', executionOrder: 8, isActive: true },
            { code: 'RAV_TAX', name: 'Redevance Audiovisuelle (RAV)', type: PayrollRuleType.TAX, formula: 'GROSS_TAXABLE >= 1000000 ? 13000 : GROSS_TAXABLE >= 900000 ? 12350 : GROSS_TAXABLE >= 800000 ? 11050 : GROSS_TAXABLE >= 700000 ? 9750 : GROSS_TAXABLE >= 600000 ? 8450 : GROSS_TAXABLE >= 500000 ? 7150 : GROSS_TAXABLE >= 400000 ? 5850 : GROSS_TAXABLE >= 300000 ? 4550 : GROSS_TAXABLE >= 200000 ? 3250 : GROSS_TAXABLE >= 100000 ? 1950 : GROSS_TAXABLE > 50000 ? 750 : 0', executionOrder: 9, isActive: true },
            { code: 'TC_TAX', name: 'Taxe Communale (TC)', type: PayrollRuleType.TAX, formula: 'GROSS_TAXABLE >= 500000 ? 3000 : GROSS_TAXABLE >= 400000 ? 2500 : GROSS_TAXABLE >= 300000 ? 2000 : GROSS_TAXABLE >= 200000 ? 1500 : GROSS_TAXABLE >= 100000 ? 1000 : 0', executionOrder: 10, isActive: true }
        ];
        
        for (const rule of rules) {
            await this.payrollRuleRepo.save(this.payrollRuleRepo.create({ ...rule, tenantId }));
        }

        // --- SEED LEAVES ---
        const leaveData = [
            { agent: 'Thomas', type: LeaveType.CONGE_ANNUEL, status: LeaveStatus.APPROVED, daysOffset: -10, duration: 5, reason: 'Congés annuels' },
            { agent: 'André', type: LeaveType.MALADIE, status: LeaveStatus.APPROVED, daysOffset: -2, duration: 3, reason: 'Grippe' },
            { agent: 'Élise', type: LeaveType.RECUPERATION, status: LeaveStatus.PENDING, daysOffset: 5, duration: 1, reason: 'Récupération après garde' },
            { agent: 'Patrick', type: LeaveType.CONGE_ANNUEL, status: LeaveStatus.PENDING, daysOffset: 15, duration: 10, reason: 'Voyage familial' },
            { agent: 'Catherine', type: LeaveType.AUTRE, status: LeaveStatus.REJECTED, daysOffset: 2, duration: 2, reason: 'Événement personnel', rejection: 'Effectif insuffisant sur cette période' },
            { agent: 'Jean-Baptiste', type: LeaveType.CONGE_ANNUEL, status: LeaveStatus.APPROVED, daysOffset: -20, duration: 15, reason: 'Vacances' },
            { agent: 'Paul', type: LeaveType.MALADIE, status: LeaveStatus.APPROVED, daysOffset: -5, duration: 2, reason: 'Rendez-vous médical' },
        ];

        for (const data of leaveData) {
            const agent = allAgents.find(a => a.firstName === data.agent);
            if (agent) {
                const start = addDays(new Date(), data.daysOffset);
                const end = addDays(start, data.duration);
                await this.leaveRepo.save({
                    tenantId,
                    agent,
                    type: data.type,
                    status: data.status,
                    start,
                    end,
                    reason: data.reason,
                    approvedBy: data.status !== LeaveStatus.PENDING ? agent.manager || undefined : undefined,
                    rejectionReason: data.rejection
                });
            }
        }

        // --- SEED COMPETENCIES ---
        const compDesc = [
            { name: 'AFGSU Niveau 1', category: 'Urgences' },
            { name: 'AFGSU Niveau 2', category: 'Urgences' },
            { name: 'Manipulation Respirateur', category: 'Réanimation' },
            { name: 'Gestion Incendie', category: 'Sécurité' },
            { name: 'Prélèvement Sanguin', category: 'Soins' }
        ];

        const savedComps = [];
        for (const comp of compDesc) {
            savedComps.push(await this.compRepo.save(comp));
        }

        // Assign to a few agents
        for (const agent of allAgents) {
            // Randomize assigning 1 to 3 competencies to everyone
            const numComps = Math.floor(Math.random() * 3) + 1;
            const shuffledComps = savedComps.sort(() => 0.5 - Math.random());
            for (let i = 0; i < numComps; i++) {
                const comp = shuffledComps[i];
                const level = Math.floor(Math.random() * 5) + 1;
                // Expiry: 60% valid, 20% expiring soon, 20% expired
                const rand = Math.random();
                const expiry = new Date();
                if (rand < 0.6) expiry.setFullYear(expiry.getFullYear() + 1);
                else if (rand < 0.8) expiry.setDate(expiry.getDate() + 15);
                else expiry.setMonth(expiry.getMonth() - 2);

                await this.agentCompRepo.save({
                    agent,
                    competency: comp,
                    level,
                    expirationDate: expiry
                });
            }
        }

        // --- SEED GED DOCUMENTS ---
        const fakeDocuments = [
            { title: 'Contrat de travail à durée indéterminée', type: 'Contrat de Travail', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
            { title: 'Attestation de formation AFGSU', type: 'Attestation de Formation', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
            { title: 'Avenant au contrat - Nuit', type: 'Avenant de Garde', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
            { title: 'Fiche de paie Mai', type: 'Fiche de Paie', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        ];

        for (const agent of allAgents) {
            // Assign 1 or 2 random documents to each agent
            const nbDoc = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < nbDoc; i++) {
                const docDesc = fakeDocuments[Math.floor(Math.random() * fakeDocuments.length)];
                
                // Random status
                const randStatus = Math.random();
                let status = DocumentStatus.SIGNED;
                if (randStatus > 0.8) status = DocumentStatus.PENDING_SIGNATURE;

                await this.documentRepo.save({
                    tenantId,
                    title: docDesc.title,
                    type: docDesc.type,
                    status: status,
                    fileUrl: docDesc.fileUrl,
                    agent,
                    // Give OTP to pending docs
                    otpSecret: status === DocumentStatus.PENDING_SIGNATURE ? Math.floor(1000 + Math.random() * 9000).toString() : undefined
                });
            }
        }

        const totalServices = await this.serviceRepo.count({ where: { tenantId } });
        const totalAgents = await this.agentRepo.count({ where: { tenantId } });
        const totalLeaves = await this.leaveRepo.count({ where: { tenantId } });

        return {
            success: true,
            message: 'Seed completed successfully for Hôpital Général de Douala',
            data: {
                tenant: tenantId,
                services: totalServices,
                agents: totalAgents,
                leaves: totalLeaves,
                credentials: {
                    password: 'password123',
                    examples: [
                        'directeur@hgd-douala.cm (Directeur Général)',
                        'p.mbarga@hgd-douala.cm (Chef Chirurgie)',
                        's.ondoa@hgd-douala.cm (Chef Urgences)',
                    ]
                }
            }
        };
    }
}
