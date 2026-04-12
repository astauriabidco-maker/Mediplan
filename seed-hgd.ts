import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AgentsService } from './src/agents/agents.service';
import { HospitalServicesService } from './src/agents/hospital-services.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent, UserRole } from './src/agents/entities/agent.entity';
import { HospitalService } from './src/agents/entities/hospital-service.entity';
import { Competency, CompetencyType } from './src/competencies/entities/competency.entity';
import { AgentCompetency } from './src/competencies/entities/agent-competency.entity';
import { Shift, ShiftType } from './src/planning/entities/shift.entity';
import { Repository } from 'typeorm';

import { DataSource } from 'typeorm';

async function bootstrap() {
    console.log('🌱 Starting seed for Hôpital Général de Douala...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    const agentRepo = app.get<Repository<Agent>>(getRepositoryToken(Agent));
    const serviceRepo = app.get<Repository<HospitalService>>(getRepositoryToken(HospitalService));
    const compRepo = app.get<Repository<Competency>>(getRepositoryToken(Competency));
    const agentCompRepo = app.get<Repository<AgentCompetency>>(getRepositoryToken(AgentCompetency));
    const shiftRepo = app.get<Repository<Shift>>(getRepositoryToken(Shift));

    const tenantId = 'HGD-DOUALA';

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    try {
        await dataSource.query('TRUNCATE TABLE agent, hospital_service, leave, shift, contract, agent_competency, competency RESTART IDENTITY CASCADE');
    } catch (error) {
        console.warn('⚠️  Could not truncate tables (might be first run):', error.message);
    }
    // await agentRepo.delete({ tenantId });
    // await serviceRepo.delete({ tenantId });

    // Create services
    console.log('\n📁 Creating Hospital Services...');

    const urgences = await serviceRepo.save({
        name: 'Urgences',
        code: 'URG',
        description: 'Service des urgences médicales et chirurgicales',
        level: 1,
        tenantId,
        minAgents: 15,
        maxAgents: 25,
    });

    const chirurgie = await serviceRepo.save({
        name: 'Chirurgie',
        code: 'CHIR',
        description: 'Service de chirurgie générale et spécialisée',
        level: 1,
        tenantId,
        minAgents: 20,
        maxAgents: 35,
    });

    const medecineInterne = await serviceRepo.save({
        name: 'Médecine Interne',
        code: 'MED',
        description: 'Service de médecine générale et spécialités médicales',
        level: 1,
        tenantId,
        minAgents: 18,
        maxAgents: 30,
    });

    const pediatrie = await serviceRepo.save({
        name: 'Pédiatrie',
        code: 'PED',
        description: 'Service de soins pédiatriques',
        level: 1,
        tenantId,
        minAgents: 12,
        maxAgents: 20,
    });

    const maternite = await serviceRepo.save({
        name: 'Maternité',
        code: 'MAT',
        description: 'Service de gynécologie-obstétrique',
        level: 1,
        tenantId,
        minAgents: 15,
        maxAgents: 25,
    });

    const radiologie = await serviceRepo.save({
        name: 'Radiologie & Imagerie',
        code: 'RAD',
        description: 'Service d\'imagerie médicale',
        level: 1,
        tenantId,
        minAgents: 8,
        maxAgents: 15,
    });

    const laboratoire = await serviceRepo.save({
        name: 'Laboratoire',
        code: 'LAB',
        description: 'Analyses biologiques et médicales',
        level: 1,
        tenantId,
        minAgents: 10,
        maxAgents: 18,
    });

    const administration = await serviceRepo.save({
        name: 'Administration',
        code: 'ADM',
        description: 'Direction et services administratifs',
        level: 1,
        tenantId,
        minAgents: 8,
        maxAgents: 15,
    });

    const pharmacie = await serviceRepo.save({
        name: 'Pharmacie Hospitalière',
        code: 'PHARMA',
        description: 'Gestion des médicaments et dispositifs médicaux',
        level: 1,
        tenantId,
        minAgents: 5,
        maxAgents: 10,
    });

    // Sub-services
    const chirurgieViscerale = await serviceRepo.save({
        name: 'Chirurgie Viscérale',
        code: 'CHIR-VIS',
        description: 'Chirurgie digestive et viscérale',
        level: 2,
        parentServiceId: chirurgie.id,
        tenantId,
        minAgents: 6,
        maxAgents: 10,
    });

    const chirurgieOrtho = await serviceRepo.save({
        name: 'Chirurgie Orthopédique',
        code: 'CHIR-ORT',
        description: 'Traumatologie et orthopédie',
        level: 2,
        parentServiceId: chirurgie.id,
        tenantId,
        minAgents: 8,
        maxAgents: 12,
    });

    const cardiologie = await serviceRepo.save({
        name: 'Cardiologie',
        code: 'CARD',
        description: 'Pathologies cardiovasculaires',
        level: 2,
        parentServiceId: medecineInterne.id,
        tenantId,
        minAgents: 6,
        maxAgents: 10,
    });

    console.log(`✅ Created ${await serviceRepo.count({ where: { tenantId } })} services`);

    // --- SETUP COMPLIANCE RULES (Phase 2) ---
    console.log('\n📜 Setting up Coverage Rules (Compliance Engine)...');

    // Rule for Pharmacy: Minimum 1 agent with 'Délégation Stupéfiants' (Competency ID certPharmacie)
    // We'll update it later once certPharmacie is created or we use its name (but engine uses ID in checkRuleSatisfied for now)
    
    // Rule for Urgences: 1 Médecin Urgentiste + 2 Infirmières
    // We'll update Urgences with its rules
    await serviceRepo.update(urgences.id, {
        coverageRules: {
            minStaffing: [
                { name: 'Effectif Médical Minimum', jobTitle: 'Médecin Urgentiste', minCount: 1 },
                { name: 'Effectif Paramédical Minimum', jobTitle: 'Infirmière', minCount: 2 }
            ]
        }
    });

    // Create agents
    console.log('\n👥 Creating Agents...\n');

    const directeur = await agentRepo.save({
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
        password: '$2b$10$dNYDjlPp7KksILDRWu1Z0u54QcsdTdxxVqk8u27gVl0zmbwkD2d5m', // password123
    });

    const chefChirurgie = await agentRepo.save({
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
        password: '$2b$10$dNYDjlPp7KksILDRWu1Z0u54QcsdTdxxVqk8u27gVl0zmbwkD2d5m',
    });

    await serviceRepo.update(chirurgie.id, { chiefId: chefChirurgie.id });

    const majorChirurgie = await agentRepo.save({
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
        password: '$2b$10$dNYDjlPp7KksILDRWu1Z0u54QcsdTdxxVqk8u27gVl0zmbwkD2d5m',
    });

    await serviceRepo.update(chirurgie.id, { majorId: majorChirurgie.id });

    const chefUrgences = await agentRepo.save({
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
        password: '$2b$10$dNYDjlPp7KksILDRWu1Z0u54QcsdTdxxVqk8u27gVl0zmbwkD2d5m',
    });

    await serviceRepo.update(urgences.id, { chiefId: chefUrgences.id });

    // Add more agents...
    const agents = [
        { nom: 'NKOLO FOMO', firstName: 'Marie-Claire', service: chirurgie.id, manager: chefChirurgie.id, jobTitle: 'Médecin Adjoint', contractType: 'CDI' },
        { nom: 'ATEBA NANA', firstName: 'Thomas', service: chirurgieViscerale.id, manager: chefChirurgie.id, jobTitle: 'Chirurgien', contractType: 'CDI' },
        { nom: 'NGUEMA OBIANG', firstName: 'André', service: chirurgieOrtho.id, manager: chefChirurgie.id, jobTitle: 'Chirurgien Orthopédiste', contractType: 'CDI' },
        { nom: 'MBASSI NDONGO', firstName: 'Élise', service: chirurgie.id, manager: majorChirurgie.id, jobTitle: 'Infirmière', contractType: 'CDD' },
        { nom: 'EBODE TALLA', firstName: 'Martin', service: urgences.id, manager: chefUrgences.id, jobTitle: 'Major - Urgences', contractType: 'CDI' },
        { nom: 'ZAMBO ANGUISSA', firstName: 'Léon', service: urgences.id, manager: chefUrgences.id, jobTitle: 'Médecin Urgentiste', contractType: 'CDI' },
        { nom: 'MEKA BILONG', firstName: 'Jeanne', service: urgences.id, manager: chefUrgences.id, jobTitle: 'Infirmière', contractType: 'CDI' },
        { nom: 'ETOA ABENA', firstName: 'Bernard', service: medecineInterne.id, manager: directeur.id, jobTitle: 'Chef de Service - Médecine', contractType: 'CDI' },
        { nom: 'MENDO ZE', firstName: 'Christophe', service: cardiologie.id, manager: directeur.id, jobTitle: 'Cardiologue', contractType: 'CDI' },
        { nom: 'NANGA MBARGA', firstName: 'Hélène', service: pediatrie.id, manager: directeur.id, jobTitle: 'Chef de Service - Pédiatrie', contractType: 'CDI' },
    ];

    for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        await agentRepo.save({
            nom: a.nom,
            firstName: a.firstName,
            email: `${a.firstName.toLowerCase()}.${a.nom.toLowerCase().split(' ')[0]}@hgd-douala.cm`,
            matricule: `HGD-${String(i + 100).padStart(3, '0')}`,
            telephone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
            gender: ['André', 'Thomas', 'Martin', 'Léon', 'Bernard', 'Christophe'].includes(a.firstName) ? 'M' : 'F',
            jobTitle: a.jobTitle,
            contractType: a.contractType,
            hiringDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
            hospitalServiceId: a.service,
            managerId: a.manager,
            tenantId,
            password: '$2b$10$dNYDjlPp7KksILDRWu1Z0u54QcsdTdxxVqk8u27gVl0zmbwkD2d5m',
        });
    }

    // Add a Pharmacist
    const pharmacien = await agentRepo.save({
        nom: 'KAMGA',
        firstName: 'Thérèse',
        email: 't.kamga@hgd-douala.cm',
        matricule: 'HGD-PHA-001',
        telephone: '+237 699 999 888',
        gender: 'F',
        jobTitle: 'Pharmacien Gérant',
        contractType: 'CDI',
        hiringDate: '2020-01-01',
        hospitalServiceId: pharmacie.id,
        tenantId,
        password: '$2b$10$dNYDjlPp7KksILDRWu1Z0u54QcsdTdxxVqk8u27gVl0zmbwkD2d5m',
    });

    // Create Competencies
    console.log('\n🏅 Creating Competencies & Mandatory Certifications...');
    
    const certPharmacie = await compRepo.save({
        name: 'Délégation Stupéfiants & Gérance',
        category: 'Légal',
        type: CompetencyType.LEGAL_CERTIFICATION,
        isMandatoryToWork: true
    });

    const certElec = await compRepo.save({
        name: 'Habilitation Électrique H0B0',
        category: 'Sécurité',
        type: CompetencyType.LEGAL_CERTIFICATION,
        isMandatoryToWork: true
    });

    const skillUrg = await compRepo.save({
        name: 'Soins d\'Urgence Avancés',
        category: 'Médical',
        type: CompetencyType.SKILL,
        isMandatoryToWork: false
    });

    // Assign to some agents
    const agentsHgd = await agentRepo.find({ where: { tenantId } });
    
    // Assign Legal to NKOTTO (Directeur) just for testing
    const now = new Date();
    const expiredDate = new Date();
    expiredDate.setDate(now.getDate() - 5); // Expired 5 days ago

    const validDate = new Date();
    validDate.setDate(now.getDate() + 45); // Valid 45 more days

    await agentCompRepo.save({
        agent: directeur,
        competency: certElec,
        level: 4,
        expirationDate: expiredDate // EXPIRED -> should block planning
    });

    // Assign Valid Skill
    await agentCompRepo.save({
        agent: chefUrgences,
        competency: skillUrg,
        level: 4,
        expirationDate: validDate
    });

    // Assign Pharmacie mandatory to pharmacien
    await agentCompRepo.save({
        agent: pharmacien,
        competency: certPharmacie,
        level: 4,
        expirationDate: validDate
    });

    // Update Pharmacy rule with the correct Competency ID
    await serviceRepo.update(pharmacie.id, {
        coverageRules: {
            minStaffing: [
                { name: 'Autorisation Gérance', competencyId: certPharmacie.id, competencyName: certPharmacie.name, minCount: 1 }
            ]
        }
    });

    // --- CREATE EXTREME SHIFTS (Phase 3: Burn-out Test) ---
    console.log('\n😴 Creating extreme shifts for fatigue testing...');
    
    // Pour NKOLO FOMO Marie-Claire (Infirmière)
    const targetAgent = agentsHgd.find(a => a.nom === 'NKOLO FOMO');
    if (targetAgent) {
        // Créer 4 gardes de nuit de 12h dans la semaine passée
        for (let i = 1; i <= 4; i++) {
            const startStr = new Date();
            startStr.setDate(now.getDate() - i);
            startStr.setHours(20, 0, 0, 0); // 20:00

            const endStr = new Date(startStr);
            endStr.setHours(startStr.getHours() + 12); // till 08:00

            await shiftRepo.save({
                tenantId,
                agent: targetAgent,
                start: startStr,
                end: endStr,
                type: ShiftType.GARDE_SUR_PLACE,
                postId: `URG-NIGHT-${i}`,
                status: 'PUBLISHED'
            });
        }
    }

    console.log('✅ Mandatory certifications and Coverage Rules seeded.');

    const totalServices = await serviceRepo.count({ where: { tenantId } });
    const totalAgents = await agentRepo.count({ where: { tenantId } });

    console.log('\n✨ Seed completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Services: ${totalServices}`);
    console.log(`   - Agents: ${totalAgents}`);
    console.log(`   - Tenant: ${tenantId}`);
    console.log(`\n🔐 Default password for all agents: password123`);
    console.log(`\n📧 Login examples:`);
    console.log(`   - directeur@hgd-douala.cm (Directeur Général)`);
    console.log(`   - p.mbarga@hgd-douala.cm (Chef Chirurgie)`);
    console.log(`   - s.ondoa@hgd-douala.cm (Chef Urgences)`);

    await app.close();
}

bootstrap().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
