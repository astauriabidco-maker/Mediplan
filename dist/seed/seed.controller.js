"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_entity_1 = require("../agents/entities/agent.entity");
const facility_entity_1 = require("../agents/entities/facility.entity");
const grade_entity_1 = require("../agents/entities/grade.entity");
const hospital_service_entity_1 = require("../agents/entities/hospital-service.entity");
const leave_entity_1 = require("../planning/entities/leave.entity");
const shift_entity_1 = require("../planning/entities/shift.entity");
const competency_entity_1 = require("../competencies/entities/competency.entity");
const agent_competency_entity_1 = require("../competencies/entities/agent-competency.entity");
const document_entity_1 = require("../documents/entities/document.entity");
const contract_entity_1 = require("../agents/entities/contract.entity");
const bonus_template_entity_1 = require("../agents/entities/bonus-template.entity");
const contract_bonus_entity_1 = require("../agents/entities/contract-bonus.entity");
const payroll_rule_entity_1 = require("../payroll/entities/payroll-rule.entity");
const role_entity_1 = require("../auth/entities/role.entity");
const permissions_1 = require("../auth/permissions");
const bcrypt = __importStar(require("bcrypt"));
const date_fns_1 = require("date-fns");
let SeedController = class SeedController {
    agentRepo;
    facilityRepo;
    gradeRepo;
    serviceRepo;
    leaveRepo;
    shiftRepo;
    compRepo;
    agentCompRepo;
    documentRepo;
    contractRepo;
    bonusTemplateRepo;
    contractBonusRepo;
    payrollRuleRepo;
    roleRepo;
    constructor(agentRepo, facilityRepo, gradeRepo, serviceRepo, leaveRepo, shiftRepo, compRepo, agentCompRepo, documentRepo, contractRepo, bonusTemplateRepo, contractBonusRepo, payrollRuleRepo, roleRepo) {
        this.agentRepo = agentRepo;
        this.facilityRepo = facilityRepo;
        this.gradeRepo = gradeRepo;
        this.serviceRepo = serviceRepo;
        this.leaveRepo = leaveRepo;
        this.shiftRepo = shiftRepo;
        this.compRepo = compRepo;
        this.agentCompRepo = agentCompRepo;
        this.documentRepo = documentRepo;
        this.contractRepo = contractRepo;
        this.bonusTemplateRepo = bonusTemplateRepo;
        this.contractBonusRepo = contractBonusRepo;
        this.payrollRuleRepo = payrollRuleRepo;
        this.roleRepo = roleRepo;
    }
    async seedHGD() {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('Seeding is not allowed in production');
        }
        const tenantId = 'HGD-DOUALA';
        const passwordHash = await bcrypt.hash('password123', 10);
        const demoAccounts = [];
        const deterministicPhone = (index) => `+237 6${String(70000000 + index * 137291).padStart(8, '0')}`;
        const deterministicHiringDate = (index) => {
            const year = 2020 + (index % 4);
            const month = String((index % 12) + 1).padStart(2, '0');
            return `${year}-${month}-01`;
        };
        const emailPart = (value) => value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        await this.serviceRepo.update({ tenantId }, { parentServiceId: null });
        await this.serviceRepo.update({ tenantId }, {
            chiefId: null,
            deputyChiefId: null,
            majorId: null,
            nursingManagerId: null,
        });
        await this.payrollRuleRepo.delete({ tenantId });
        await this.contractBonusRepo.createQueryBuilder().delete().execute();
        await this.contractRepo.createQueryBuilder().delete().execute();
        await this.bonusTemplateRepo.delete({ tenantId });
        await this.agentCompRepo.createQueryBuilder().delete().execute();
        await this.compRepo.createQueryBuilder().delete().execute();
        await this.documentRepo.delete({ tenantId });
        await this.shiftRepo.delete({ tenantId });
        await this.leaveRepo.delete({ tenantId });
        await this.agentRepo.delete({ tenantId });
        await this.roleRepo.delete({ tenantId });
        await this.serviceRepo.delete({ tenantId });
        await this.gradeRepo.delete({ tenantId });
        await this.facilityRepo.delete({ tenantId });
        const rolesByName = new Map();
        for (const roleDefinition of Object.values(permissions_1.HOSPITAL_ROLE_PERMISSIONS)) {
            const role = await this.roleRepo.save(this.roleRepo.create({
                ...roleDefinition,
                tenantId,
                isSystem: true,
            }));
            rolesByName.set(role.name, role);
        }
        const getRole = (name) => rolesByName.get(name);
        const hgd = await this.facilityRepo.save({
            tenantId,
            name: 'Hôpital Général de Douala',
            code: 'HGD',
            address: 'Boulevard de la Réunification, Akwa',
            city: 'Douala',
            zipCode: 'BP 4856',
            latitude: 4.0511,
            longitude: 9.7679,
        });
        const annexeBonanjo = await this.facilityRepo.save({
            tenantId,
            name: 'Annexe Bonanjo - Consultations spécialisées',
            code: 'HGD-BNJ',
            address: 'Rue Joss, Bonanjo',
            city: 'Douala',
            zipCode: 'BP 4856',
            latitude: 4.0403,
            longitude: 9.6879,
        });
        const plateauTechnique = await this.facilityRepo.save({
            tenantId,
            name: 'Plateau Technique Logbaba',
            code: 'HGD-LOG',
            address: 'Route de Logbaba',
            city: 'Douala',
            zipCode: 'BP 4856',
            latitude: 4.0597,
            longitude: 9.7837,
        });
        const gradeDirection = await this.gradeRepo.save({
            tenantId,
            name: 'Direction hospitalière',
            code: 'HGD-DIR',
            level: 10,
        });
        const gradeMedSenior = await this.gradeRepo.save({
            tenantId,
            name: 'Médecin senior / Chef de service',
            code: 'HGD-MED-SEN',
            level: 9,
        });
        const gradeMed = await this.gradeRepo.save({
            tenantId,
            name: 'Médecin praticien',
            code: 'HGD-MED',
            level: 7,
        });
        const gradeSageFemme = await this.gradeRepo.save({
            tenantId,
            name: 'Sage-femme diplômée',
            code: 'HGD-SF',
            level: 6,
        });
        const gradeIde = await this.gradeRepo.save({
            tenantId,
            name: "Infirmier diplômé d'État",
            code: 'HGD-IDE',
            level: 5,
        });
        const gradeAideSoignant = await this.gradeRepo.save({
            tenantId,
            name: 'Aide-soignant',
            code: 'HGD-AS',
            level: 3,
        });
        const gradeTech = await this.gradeRepo.save({
            tenantId,
            name: 'Technicien médico-technique',
            code: 'HGD-TECH',
            level: 4,
        });
        const gradeAdmin = await this.gradeRepo.save({
            tenantId,
            name: 'Personnel administratif',
            code: 'HGD-ADM',
            level: 3,
        });
        const gradeByJob = (jobTitle) => {
            if (jobTitle.includes('Directeur'))
                return gradeDirection;
            if (jobTitle.includes('Chef') || jobTitle.includes('Responsable'))
                return gradeMedSenior;
            if (jobTitle.includes('Sage-femme'))
                return gradeSageFemme;
            if (jobTitle.includes('Infirm') || jobTitle.includes('Major'))
                return gradeIde;
            if (jobTitle.includes('Aide-soignant') ||
                jobTitle.includes('Brancardier'))
                return gradeAideSoignant;
            if (jobTitle.includes('Technicien') ||
                jobTitle.includes('Manipulateur') ||
                jobTitle.includes('Pharmacien'))
                return gradeTech;
            if (jobTitle.includes('Gestionnaire') ||
                jobTitle.includes('Agent administratif'))
                return gradeAdmin;
            return gradeMed;
        };
        const poleUrgences = await this.serviceRepo.save({
            name: 'Pôle Urgences - Réanimation - Soins critiques',
            code: 'POLE-URC',
            description: 'Coordination 24/7 des urgences, soins critiques et flux non programmés',
            level: 0,
            tenantId,
            facilityId: hgd.id,
            minAgents: 45,
            maxAgents: 85,
            is24x7: true,
            bedCapacity: 42,
            riskLevel: hospital_service_entity_1.RiskLevel.HIGH,
        });
        const poleChirurgie = await this.serviceRepo.save({
            name: 'Pôle Chirurgie - Anesthésie - Bloc',
            code: 'POLE-CHIR',
            description: 'Bloc opératoire, chirurgie programmée et activité de garde chirurgicale',
            level: 0,
            tenantId,
            facilityId: hgd.id,
            minAgents: 50,
            maxAgents: 100,
            is24x7: true,
            bedCapacity: 86,
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const poleMedecine = await this.serviceRepo.save({
            name: 'Pôle Médecines spécialisées',
            code: 'POLE-MED',
            description: "Médecines d'organes, pédiatrie et maternité",
            level: 0,
            tenantId,
            facilityId: annexeBonanjo.id,
            minAgents: 55,
            maxAgents: 120,
            is24x7: true,
            bedCapacity: 112,
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const poleMedicoTechnique = await this.serviceRepo.save({
            name: 'Pôle Médico-technique et Support',
            code: 'POLE-MTECH',
            description: 'Imagerie, biologie, pharmacie et fonctions support',
            level: 0,
            tenantId,
            facilityId: plateauTechnique.id,
            minAgents: 35,
            maxAgents: 70,
            is24x7: false,
            bedCapacity: 0,
            riskLevel: hospital_service_entity_1.RiskLevel.LOW,
        });
        const urgences = await this.serviceRepo.save({
            name: 'Urgences',
            code: 'URG',
            description: 'Service des urgences médicales et chirurgicales',
            level: 1,
            parentServiceId: poleUrgences.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 15,
            maxAgents: 25,
            is24x7: true,
            bedCapacity: 18,
            contactNumber: '+237 233 42 10 00',
            riskLevel: hospital_service_entity_1.RiskLevel.HIGH,
        });
        const chirurgie = await this.serviceRepo.save({
            name: 'Chirurgie',
            code: 'CHIR',
            description: 'Service de chirurgie générale et spécialisée',
            level: 1,
            parentServiceId: poleChirurgie.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 20,
            maxAgents: 35,
            is24x7: true,
            bedCapacity: 46,
            contactNumber: '+237 233 42 10 21',
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const medecineInterne = await this.serviceRepo.save({
            name: 'Médecine Interne',
            code: 'MED',
            description: 'Service de médecine générale et spécialités médicales',
            level: 1,
            parentServiceId: poleMedecine.id,
            tenantId,
            facilityId: annexeBonanjo.id,
            minAgents: 18,
            maxAgents: 30,
            is24x7: true,
            bedCapacity: 52,
            contactNumber: '+237 233 42 10 31',
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const pediatrie = await this.serviceRepo.save({
            name: 'Pédiatrie',
            code: 'PED',
            description: 'Service de soins pédiatriques',
            level: 1,
            parentServiceId: poleMedecine.id,
            tenantId,
            facilityId: annexeBonanjo.id,
            minAgents: 12,
            maxAgents: 20,
            is24x7: true,
            bedCapacity: 28,
            contactNumber: '+237 233 42 10 41',
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const maternite = await this.serviceRepo.save({
            name: 'Maternité',
            code: 'MAT',
            description: 'Service de gynécologie-obstétrique',
            level: 1,
            parentServiceId: poleMedecine.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 15,
            maxAgents: 25,
            is24x7: true,
            bedCapacity: 34,
            contactNumber: '+237 233 42 10 51',
            riskLevel: hospital_service_entity_1.RiskLevel.HIGH,
        });
        const radiologie = await this.serviceRepo.save({
            name: 'Radiologie & Imagerie',
            code: 'RAD',
            description: "Service d'imagerie médicale",
            level: 1,
            parentServiceId: poleMedicoTechnique.id,
            tenantId,
            facilityId: plateauTechnique.id,
            minAgents: 8,
            maxAgents: 15,
            is24x7: true,
            bedCapacity: 0,
            contactNumber: '+237 233 42 10 61',
            riskLevel: hospital_service_entity_1.RiskLevel.LOW,
        });
        const laboratoire = await this.serviceRepo.save({
            name: 'Laboratoire',
            code: 'LAB',
            description: 'Analyses biologiques et médicales',
            level: 1,
            parentServiceId: poleMedicoTechnique.id,
            tenantId,
            facilityId: plateauTechnique.id,
            minAgents: 10,
            maxAgents: 18,
            is24x7: true,
            bedCapacity: 0,
            contactNumber: '+237 233 42 10 71',
            riskLevel: hospital_service_entity_1.RiskLevel.HIGH,
        });
        const administration = await this.serviceRepo.save({
            name: 'Administration',
            code: 'ADM',
            description: 'Direction et services administratifs',
            level: 1,
            parentServiceId: poleMedicoTechnique.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 8,
            maxAgents: 15,
            is24x7: false,
            bedCapacity: 0,
            contactNumber: '+237 233 42 10 80',
            riskLevel: hospital_service_entity_1.RiskLevel.NONE,
        });
        const pharmacie = await this.serviceRepo.save({
            name: 'Pharmacie Hospitalière',
            code: 'PHARMA',
            description: 'Circuit médicament, stupéfiants et dispositifs médicaux',
            level: 1,
            parentServiceId: poleMedicoTechnique.id,
            tenantId,
            facilityId: plateauTechnique.id,
            minAgents: 5,
            maxAgents: 10,
            is24x7: false,
            bedCapacity: 0,
            contactNumber: '+237 233 42 10 75',
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const reanimation = await this.serviceRepo.save({
            name: 'Réanimation Polyvalente',
            code: 'REA',
            description: 'Soins critiques adultes, ventilation et surveillance continue',
            level: 1,
            parentServiceId: poleUrgences.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 14,
            maxAgents: 28,
            is24x7: true,
            bedCapacity: 12,
            contactNumber: '+237 233 42 10 11',
            riskLevel: hospital_service_entity_1.RiskLevel.CRITICAL,
        });
        const chirurgieViscerale = await this.serviceRepo.save({
            name: 'Chirurgie Viscérale',
            code: 'CHIR-VIS',
            description: 'Chirurgie digestive et viscérale',
            level: 2,
            parentServiceId: chirurgie.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 6,
            maxAgents: 10,
            is24x7: true,
            bedCapacity: 18,
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const chirurgieOrtho = await this.serviceRepo.save({
            name: 'Chirurgie Orthopédique',
            code: 'CHIR-ORT',
            description: 'Traumatologie et orthopédie',
            level: 2,
            parentServiceId: chirurgie.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 8,
            maxAgents: 12,
            is24x7: true,
            bedCapacity: 20,
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const chirurgieCardio = await this.serviceRepo.save({
            name: 'Chirurgie Cardiaque',
            code: 'CHIR-CAR',
            description: 'Chirurgie cardiovasculaire',
            level: 2,
            parentServiceId: chirurgie.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 6,
            maxAgents: 10,
            is24x7: true,
            bedCapacity: 8,
            riskLevel: hospital_service_entity_1.RiskLevel.HIGH,
        });
        const cardiologie = await this.serviceRepo.save({
            name: 'Cardiologie',
            code: 'CARD',
            description: 'Pathologies cardiovasculaires',
            level: 2,
            parentServiceId: medecineInterne.id,
            tenantId,
            facilityId: annexeBonanjo.id,
            minAgents: 6,
            maxAgents: 10,
            is24x7: true,
            bedCapacity: 16,
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const pneumologie = await this.serviceRepo.save({
            name: 'Pneumologie',
            code: 'PNEU',
            description: 'Pathologies respiratoires',
            level: 2,
            parentServiceId: medecineInterne.id,
            tenantId,
            facilityId: annexeBonanjo.id,
            minAgents: 5,
            maxAgents: 8,
            is24x7: true,
            bedCapacity: 14,
            riskLevel: hospital_service_entity_1.RiskLevel.MEDIUM,
        });
        const gastro = await this.serviceRepo.save({
            name: 'Gastro-entérologie',
            code: 'GAST',
            description: 'Pathologies digestives',
            level: 2,
            parentServiceId: medecineInterne.id,
            tenantId,
            facilityId: annexeBonanjo.id,
            minAgents: 5,
            maxAgents: 8,
            is24x7: false,
            bedCapacity: 12,
            riskLevel: hospital_service_entity_1.RiskLevel.LOW,
        });
        const neonatologie = await this.serviceRepo.save({
            name: 'Néonatologie',
            code: 'NEONAT',
            description: 'Surveillance néonatale et prématurité',
            level: 2,
            parentServiceId: pediatrie.id,
            tenantId,
            facilityId: hgd.id,
            minAgents: 6,
            maxAgents: 12,
            is24x7: true,
            bedCapacity: 10,
            riskLevel: hospital_service_entity_1.RiskLevel.HIGH,
        });
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
            facilityId: hgd.id,
            gradeId: gradeDirection.id,
            gradeLegacy: gradeDirection.name,
            step: 'HC',
            index: '1027',
            workTimePercentage: 100,
            niu: 'M021800001234K',
            cnpsNumber: 'CNPS-HGD-0001',
            categorieEchelon: 'Catégorie 12, Échelon E',
            tenantId,
            role: agent_entity_1.UserRole.ADMIN,
            roleId: getRole('DIRECTION')?.id,
            password: passwordHash,
        });
        demoAccounts.push({
            email: directeur.email,
            role: 'DIRECTION',
            label: 'Directeur Général',
        });
        const superAdmin = await this.agentRepo.save({
            nom: 'MEDIPLAN DEMO',
            firstName: 'Superadmin',
            email: 'superadmin@mediplan.demo',
            matricule: 'DEMO-SUPERADMIN-001',
            telephone: '+237 699 000 001',
            gender: 'F',
            jobTitle: 'Super administratrice plateforme',
            contractType: 'CDI',
            hiringDate: '2020-01-01',
            hospitalServiceId: administration.id,
            facilityId: hgd.id,
            gradeId: gradeAdmin.id,
            gradeLegacy: gradeAdmin.name,
            step: '3',
            index: '468',
            workTimePercentage: 100,
            tenantId,
            role: agent_entity_1.UserRole.SUPER_ADMIN,
            roleId: getRole(agent_entity_1.UserRole.SUPER_ADMIN)?.id,
            password: passwordHash,
        });
        demoAccounts.push({
            email: superAdmin.email,
            role: agent_entity_1.UserRole.SUPER_ADMIN,
            label: 'Superadmin plateforme',
        });
        const rhManager = await this.agentRepo.save({
            nom: 'MBOCK TCHUENTE',
            firstName: 'Ariane',
            email: 'rh@hgd-douala.cm',
            matricule: 'DEMO-RH-001',
            telephone: '+237 699 000 002',
            gender: 'F',
            jobTitle: 'Responsable RH',
            contractType: 'CDI',
            hiringDate: '2019-09-01',
            hospitalServiceId: administration.id,
            facilityId: hgd.id,
            gradeId: gradeAdmin.id,
            gradeLegacy: gradeAdmin.name,
            step: '4',
            index: '529',
            workTimePercentage: 100,
            managerId: directeur.id,
            tenantId,
            role: agent_entity_1.UserRole.ADMIN,
            roleId: getRole('HR_MANAGER')?.id,
            password: passwordHash,
        });
        demoAccounts.push({
            email: rhManager.email,
            role: 'HR_MANAGER',
            label: 'Responsable RH',
        });
        const auditor = await this.agentRepo.save({
            nom: 'TALLA MVE',
            firstName: 'Cedric',
            email: 'audit@hgd-douala.cm',
            matricule: 'DEMO-AUDIT-001',
            telephone: '+237 699 000 003',
            gender: 'M',
            jobTitle: 'Auditeur interne',
            contractType: 'CDI',
            hiringDate: '2021-03-01',
            hospitalServiceId: administration.id,
            facilityId: hgd.id,
            gradeId: gradeAdmin.id,
            gradeLegacy: gradeAdmin.name,
            step: '2',
            index: '421',
            workTimePercentage: 80,
            managerId: directeur.id,
            tenantId,
            role: agent_entity_1.UserRole.AGENT,
            roleId: getRole('AUDITOR')?.id,
            password: passwordHash,
        });
        demoAccounts.push({
            email: auditor.email,
            role: 'AUDITOR',
            label: 'Audit conformité',
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
            facilityId: hgd.id,
            gradeId: gradeMedSenior.id,
            gradeLegacy: gradeMedSenior.name,
            step: '4',
            index: '861',
            workTimePercentage: 100,
            niu: 'M031900002345L',
            cnpsNumber: 'CNPS-HGD-0101',
            categorieEchelon: 'Catégorie 11, Échelon D',
            managerId: directeur.id,
            tenantId,
            role: agent_entity_1.UserRole.MANAGER,
            roleId: getRole(agent_entity_1.UserRole.MANAGER)?.id,
            password: passwordHash,
        });
        demoAccounts.push({
            email: chefChirurgie.email,
            role: agent_entity_1.UserRole.MANAGER,
            label: 'Manager Chirurgie',
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
            facilityId: hgd.id,
            gradeId: gradeMed.id,
            gradeLegacy: gradeMed.name,
            step: '3',
            index: '705',
            workTimePercentage: 80,
            niu: 'M062000003456M',
            cnpsNumber: 'CNPS-HGD-0102',
            categorieEchelon: 'Catégorie 10, Échelon C',
            managerId: chefChirurgie.id,
            tenantId,
            password: passwordHash,
        });
        await this.serviceRepo.update(chirurgie.id, {
            deputyChiefId: adjointChirurgie.id,
        });
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
            facilityId: hgd.id,
            gradeId: gradeIde.id,
            gradeLegacy: gradeIde.name,
            step: '5',
            index: '512',
            workTimePercentage: 100,
            niu: 'F091700004567N',
            cnpsNumber: 'CNPS-HGD-0103',
            categorieEchelon: 'Catégorie 8, Échelon E',
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
            facilityId: hgd.id,
            gradeId: gradeMedSenior.id,
            gradeLegacy: gradeMedSenior.name,
            step: '4',
            index: '840',
            workTimePercentage: 100,
            niu: 'F051800005678P',
            cnpsNumber: 'CNPS-HGD-0201',
            categorieEchelon: 'Catégorie 11, Échelon D',
            managerId: directeur.id,
            tenantId,
            role: agent_entity_1.UserRole.MANAGER,
            roleId: getRole(agent_entity_1.UserRole.MANAGER)?.id,
            password: passwordHash,
        });
        demoAccounts.push({
            email: chefUrgences.email,
            role: agent_entity_1.UserRole.MANAGER,
            label: 'Manager Urgences',
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
            facilityId: hgd.id,
            gradeId: gradeIde.id,
            gradeLegacy: gradeIde.name,
            step: '4',
            index: '493',
            workTimePercentage: 100,
            niu: 'M021900006789Q',
            cnpsNumber: 'CNPS-HGD-0202',
            categorieEchelon: 'Catégorie 8, Échelon D',
            managerId: chefUrgences.id,
            tenantId,
            password: passwordHash,
        });
        await this.serviceRepo.update(urgences.id, { majorId: majorUrgences.id });
        const facilityByService = new Map([
            [urgences.id, hgd.id],
            [reanimation.id, hgd.id],
            [chirurgie.id, hgd.id],
            [chirurgieViscerale.id, hgd.id],
            [chirurgieOrtho.id, hgd.id],
            [chirurgieCardio.id, hgd.id],
            [medecineInterne.id, annexeBonanjo.id],
            [cardiologie.id, annexeBonanjo.id],
            [pneumologie.id, annexeBonanjo.id],
            [gastro.id, annexeBonanjo.id],
            [pediatrie.id, annexeBonanjo.id],
            [neonatologie.id, hgd.id],
            [maternite.id, hgd.id],
            [radiologie.id, plateauTechnique.id],
            [laboratoire.id, plateauTechnique.id],
            [pharmacie.id, plateauTechnique.id],
            [administration.id, hgd.id],
        ]);
        const agents = [
            {
                nom: 'ATEBA NANA',
                firstName: 'Thomas',
                service: chirurgieViscerale.id,
                manager: chefChirurgie.id,
                jobTitle: 'Responsable - Chirurgie Viscérale',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'NGUEMA OBIANG',
                firstName: 'André',
                service: chirurgieViscerale.id,
                manager: chefChirurgie.id,
                jobTitle: 'Chirurgien',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'MBASSI NDONGO',
                firstName: 'Élise',
                service: chirurgieViscerale.id,
                manager: chefChirurgie.id,
                jobTitle: 'Infirmière',
                contractType: 'CDD',
                workTimePercentage: 80,
                contractEndDate: '2026-07-31',
            },
            {
                nom: 'OWONA MBALLA',
                firstName: 'Patrick',
                service: chirurgieOrtho.id,
                manager: chefChirurgie.id,
                jobTitle: 'Chirurgien Orthopédiste',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'BELLA EYOUM',
                firstName: 'Catherine',
                service: chirurgieOrtho.id,
                manager: chefChirurgie.id,
                jobTitle: 'Infirmière',
                contractType: 'CDI',
                workTimePercentage: 50,
            },
            {
                nom: 'FOUDA MANI',
                firstName: 'Jacques',
                service: chirurgieCardio.id,
                manager: chefChirurgie.id,
                jobTitle: 'Chirurgien Cardiologue',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'ZAMBO ANGUISSA',
                firstName: 'Léon',
                service: urgences.id,
                manager: chefUrgences.id,
                jobTitle: 'Médecin Urgentiste',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'MEKA BILONG',
                firstName: 'Jeanne',
                service: urgences.id,
                manager: majorUrgences.id,
                jobTitle: 'Infirmière de nuit',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'ABENA MANGA',
                firstName: 'Robert',
                service: urgences.id,
                manager: majorUrgences.id,
                jobTitle: 'Aide-soignant',
                contractType: 'CDD',
                workTimePercentage: 100,
                contractEndDate: '2026-05-31',
            },
            {
                nom: 'NGONO EBOGO',
                firstName: 'Pauline',
                service: urgences.id,
                manager: majorUrgences.id,
                jobTitle: 'Infirmière',
                contractType: 'CDI',
                workTimePercentage: 90,
            },
            {
                nom: 'MOUNA EYIDI',
                firstName: 'Diane',
                service: reanimation.id,
                manager: chefUrgences.id,
                jobTitle: 'Infirmière réanimation',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'BILOA EKANI',
                firstName: 'Serge',
                service: reanimation.id,
                manager: chefUrgences.id,
                jobTitle: 'Médecin Réanimateur',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'ETOA ABENA',
                firstName: 'Bernard',
                service: medecineInterne.id,
                manager: directeur.id,
                jobTitle: 'Chef de Service - Médecine Interne',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'MENDO ZE',
                firstName: 'Christophe',
                service: cardiologie.id,
                manager: directeur.id,
                jobTitle: 'Cardiologue',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'BISSEK OWONO',
                firstName: 'Aline',
                service: pneumologie.id,
                manager: directeur.id,
                jobTitle: 'Pneumologue',
                contractType: 'VACATION',
                workTimePercentage: 40,
                contractEndDate: '2026-06-15',
            },
            {
                nom: 'TCHUENTE KONO',
                firstName: 'Brice',
                service: gastro.id,
                manager: directeur.id,
                jobTitle: 'Médecin gastro-entérologue',
                contractType: 'CDD',
                workTimePercentage: 60,
                contractEndDate: '2026-08-31',
            },
            {
                nom: 'NANGA MBARGA',
                firstName: 'Hélène',
                service: pediatrie.id,
                manager: directeur.id,
                jobTitle: 'Chef de Service - Pédiatrie',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'EBOGO YANA',
                firstName: 'Flore',
                service: neonatologie.id,
                manager: directeur.id,
                jobTitle: 'Infirmière puéricultrice',
                contractType: 'CDI',
                workTimePercentage: 80,
            },
            {
                nom: 'BIKORO ASSIGA',
                firstName: 'Monique',
                service: maternite.id,
                manager: directeur.id,
                jobTitle: 'Chef de Service - Maternité',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'NGALLE MOUKOURI',
                firstName: 'Irène',
                service: maternite.id,
                manager: directeur.id,
                jobTitle: 'Sage-femme de nuit',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'MVONDO ASSAM',
                firstName: 'Emmanuel',
                service: radiologie.id,
                manager: directeur.id,
                jobTitle: 'Chef de Service - Radiologie',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'KOUAM TIENTCHEU',
                firstName: 'Oscar',
                service: radiologie.id,
                manager: directeur.id,
                jobTitle: 'Manipulateur radio',
                contractType: 'CDD',
                workTimePercentage: 80,
                contractEndDate: '2026-12-31',
            },
            {
                nom: 'OLINGA OLINGA',
                firstName: 'Thérèse',
                service: laboratoire.id,
                manager: directeur.id,
                jobTitle: 'Chef de Service - Laboratoire',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'MEFOUET AWONO',
                firstName: 'Gaëlle',
                service: laboratoire.id,
                manager: directeur.id,
                jobTitle: 'Technicienne de laboratoire',
                contractType: 'CDI',
                workTimePercentage: 70,
            },
            {
                nom: 'KAMGA TALLA',
                firstName: 'Thérèse',
                service: pharmacie.id,
                manager: directeur.id,
                jobTitle: 'Pharmacien Gérant',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
            {
                nom: 'NDOUMBE FOTSO',
                firstName: 'Yves',
                service: administration.id,
                manager: rhManager.id,
                jobTitle: 'Gestionnaire paie',
                contractType: 'CDI',
                workTimePercentage: 100,
            },
        ];
        for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            const grade = gradeByJob(a.jobTitle);
            await this.agentRepo.save({
                nom: a.nom,
                firstName: a.firstName,
                email: `${emailPart(a.firstName)}.${emailPart(a.nom.split(' ')[0])}@hgd-douala.cm`,
                matricule: `HGD-${String(i + 100).padStart(3, '0')}`,
                telephone: deterministicPhone(i + 1),
                gender: [
                    'André',
                    'Thomas',
                    'Patrick',
                    'Jacques',
                    'Léon',
                    'Robert',
                    'Bernard',
                    'Christophe',
                    'Emmanuel',
                    'Serge',
                    'Brice',
                    'Oscar',
                    'Yves',
                ].includes(a.firstName)
                    ? 'M'
                    : 'F',
                jobTitle: a.jobTitle,
                contractType: a.contractType,
                hiringDate: deterministicHiringDate(i),
                contractEndDate: a.contractEndDate,
                hospitalServiceId: a.service,
                facilityId: facilityByService.get(a.service),
                gradeId: grade.id,
                gradeLegacy: grade.name,
                step: String((i % 5) + 1),
                index: String(360 + (i % 8) * 43),
                workTimePercentage: a.workTimePercentage,
                niu: `HGD${String(202000000 + i * 97).padStart(10, '0')}`,
                cnpsNumber: `CNPS-HGD-${String(i + 100).padStart(4, '0')}`,
                categorieEchelon: `Catégorie ${grade.level + 3}, Échelon ${String.fromCharCode(65 + (i % 5))}`,
                managerId: a.manager,
                tenantId,
                password: passwordHash,
            });
        }
        const bonusTemplates = await Promise.all([
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({
                tenantId,
                name: 'Prime de Transport',
                amount: 25000,
                isTaxable: false,
            })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({
                tenantId,
                name: 'Prime de Technicité Médicale',
                amount: 45000,
                isTaxable: true,
            })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({
                tenantId,
                name: 'Prime de Risque (Laboratoire/Radio)',
                amount: 35000,
                isTaxable: false,
            })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({
                tenantId,
                name: 'Indemnité de Garde Forfaitaire',
                amount: 60000,
                isTaxable: true,
            })),
            this.bonusTemplateRepo.save(this.bonusTemplateRepo.create({
                tenantId,
                name: 'Prime de Santé Publique',
                amount: 20000,
                isTaxable: true,
            })),
        ]);
        const allAgents = await this.agentRepo.find({
            where: { tenantId },
            relations: ['manager'],
        });
        for (const agent of allAgents) {
            let baseSalary = 150000;
            let hourlyRate = 1200;
            if (agent.role === agent_entity_1.UserRole.ADMIN ||
                agent.jobTitle?.includes('Directeur')) {
                baseSalary = 800000;
                hourlyRate = 5000;
            }
            else if (agent.jobTitle?.includes('Chef') ||
                agent.jobTitle?.includes('Médecin') ||
                agent.jobTitle?.includes('Chirurgien')) {
                baseSalary = 500000;
                hourlyRate = 3000;
            }
            else if (agent.jobTitle?.includes('Infirmière') ||
                agent.jobTitle?.includes('Major')) {
                baseSalary = 250000;
                hourlyRate = 1800;
            }
            const workRatio = (agent.workTimePercentage || 100) / 100;
            const contract = await this.contractRepo.save({
                agent,
                type: agent.contractType || 'CDI',
                date_debut: new Date(agent.hiringDate || '2020-01-01'),
                solde_conges: Math.round((10 + (agent.id % 20)) * workRatio * 2) / 2,
                baseSalary: Math.round(baseSalary * workRatio),
                hourlyRate,
            });
            if (agent.jobTitle?.includes('Chef')) {
                await this.contractBonusRepo.save({
                    contract,
                    bonusTemplate: bonusTemplates[1],
                });
            }
            if (agent.hospitalServiceId === urgences?.id) {
                await this.contractBonusRepo.save({
                    contract,
                    bonusTemplate: bonusTemplates[3],
                });
            }
            if (agent.contractType === 'CDI') {
                await this.contractBonusRepo.save({
                    contract,
                    bonusTemplate: bonusTemplates[2],
                });
            }
        }
        const contractCases = [
            {
                firstName: 'Jeanne',
                type: 'Avenant nuit urgences',
                hourlyRate: 2400,
                baseSalary: 0,
                solde_conges: 0,
            },
            {
                firstName: 'Paul',
                type: 'Avenant astreinte chirurgie',
                hourlyRate: 4500,
                baseSalary: 0,
                solde_conges: 0,
            },
            {
                firstName: 'Aline',
                type: 'Vacation pneumologie lundi-jeudi',
                hourlyRate: 6500,
                baseSalary: 0,
                solde_conges: 2,
            },
            {
                firstName: 'Brice',
                type: 'CDD renfort gastro 60%',
                hourlyRate: 3200,
                baseSalary: 300000,
                solde_conges: 6,
            },
        ];
        for (const contractCase of contractCases) {
            const agent = allAgents.find((a) => a.firstName === contractCase.firstName);
            if (agent) {
                await this.contractRepo.save({
                    agent,
                    type: contractCase.type,
                    date_debut: (0, date_fns_1.subDays)(new Date(), 45),
                    solde_conges: contractCase.solde_conges,
                    baseSalary: contractCase.baseSalary,
                    hourlyRate: contractCase.hourlyRate,
                });
            }
        }
        const rules = [
            {
                code: 'GROSS_TAXABLE',
                name: 'Brut Imposable',
                type: payroll_rule_entity_1.PayrollRuleType.CALCULATION,
                formula: 'baseSalary + taxableAllowances',
                executionOrder: 1,
                isActive: true,
            },
            {
                code: 'CNPS_TAX',
                name: 'Cotisation CNPS (4.2%)',
                type: payroll_rule_entity_1.PayrollRuleType.TAX,
                formula: 'min(GROSS_TAXABLE, 750000) * 0.042',
                executionOrder: 2,
                isActive: true,
            },
            {
                code: 'IRPP_BASE',
                name: 'Base Nette Imposable',
                type: payroll_rule_entity_1.PayrollRuleType.CALCULATION,
                formula: 'GROSS_TAXABLE - (GROSS_TAXABLE * 0.30) - CNPS_TAX',
                executionOrder: 3,
                isActive: true,
            },
            {
                code: 'IRPP_ANNUAL',
                name: 'Base Annuelle IRPP',
                type: payroll_rule_entity_1.PayrollRuleType.CALCULATION,
                formula: 'max((IRPP_BASE * 12) - 500000, 0)',
                executionOrder: 4,
                isActive: true,
            },
            {
                code: 'IRPP_TAX_ANNUAL',
                name: 'Calcul IRPP Annuel (Barème Progressif)',
                type: payroll_rule_entity_1.PayrollRuleType.CALCULATION,
                formula: 'IRPP_ANNUAL <= 2000000 ? IRPP_ANNUAL * 0.1 : (IRPP_ANNUAL <= 3000000 ? 200000 + ((IRPP_ANNUAL - 2000000) * 0.15) : (IRPP_ANNUAL <= 5000000 ? 350000 + ((IRPP_ANNUAL - 3000000)*0.25) : 850000 + ((IRPP_ANNUAL - 5000000)*0.33)))',
                executionOrder: 5,
                isActive: true,
            },
            {
                code: 'IRPP_TAX',
                name: 'IRPP (10 à 33%)',
                type: payroll_rule_entity_1.PayrollRuleType.TAX,
                formula: 'IRPP_TAX_ANNUAL / 12',
                executionOrder: 6,
                isActive: true,
            },
            {
                code: 'CAC_TAX',
                name: 'Centimes Additionnels Communaux (10%)',
                type: payroll_rule_entity_1.PayrollRuleType.TAX,
                formula: 'IRPP_TAX * 0.1',
                executionOrder: 7,
                isActive: true,
            },
            {
                code: 'CCF_TAX',
                name: 'Crédit Foncier (1%)',
                type: payroll_rule_entity_1.PayrollRuleType.TAX,
                formula: 'GROSS_TAXABLE * 0.01',
                executionOrder: 8,
                isActive: true,
            },
            {
                code: 'RAV_TAX',
                name: 'Redevance Audiovisuelle (RAV)',
                type: payroll_rule_entity_1.PayrollRuleType.TAX,
                formula: 'GROSS_TAXABLE >= 1000000 ? 13000 : GROSS_TAXABLE >= 900000 ? 12350 : GROSS_TAXABLE >= 800000 ? 11050 : GROSS_TAXABLE >= 700000 ? 9750 : GROSS_TAXABLE >= 600000 ? 8450 : GROSS_TAXABLE >= 500000 ? 7150 : GROSS_TAXABLE >= 400000 ? 5850 : GROSS_TAXABLE >= 300000 ? 4550 : GROSS_TAXABLE >= 200000 ? 3250 : GROSS_TAXABLE >= 100000 ? 1950 : GROSS_TAXABLE > 50000 ? 750 : 0',
                executionOrder: 9,
                isActive: true,
            },
            {
                code: 'TC_TAX',
                name: 'Taxe Communale (TC)',
                type: payroll_rule_entity_1.PayrollRuleType.TAX,
                formula: 'GROSS_TAXABLE >= 500000 ? 3000 : GROSS_TAXABLE >= 400000 ? 2500 : GROSS_TAXABLE >= 300000 ? 2000 : GROSS_TAXABLE >= 200000 ? 1500 : GROSS_TAXABLE >= 100000 ? 1000 : 0',
                executionOrder: 10,
                isActive: true,
            },
        ];
        for (const rule of rules) {
            await this.payrollRuleRepo.save(this.payrollRuleRepo.create({ ...rule, tenantId }));
        }
        const leaveData = [
            {
                agent: 'Thomas',
                type: leave_entity_1.LeaveType.CONGE_ANNUEL,
                status: leave_entity_1.LeaveStatus.APPROVED,
                daysOffset: -10,
                duration: 5,
                reason: 'Congés annuels',
            },
            {
                agent: 'André',
                type: leave_entity_1.LeaveType.MALADIE,
                status: leave_entity_1.LeaveStatus.APPROVED,
                daysOffset: -2,
                duration: 3,
                reason: 'Grippe',
            },
            {
                agent: 'Élise',
                type: leave_entity_1.LeaveType.RECUPERATION,
                status: leave_entity_1.LeaveStatus.PENDING,
                daysOffset: 5,
                duration: 1,
                reason: 'Récupération après garde',
            },
            {
                agent: 'Patrick',
                type: leave_entity_1.LeaveType.CONGE_ANNUEL,
                status: leave_entity_1.LeaveStatus.PENDING,
                daysOffset: 15,
                duration: 10,
                reason: 'Voyage familial',
            },
            {
                agent: 'Catherine',
                type: leave_entity_1.LeaveType.AUTRE,
                status: leave_entity_1.LeaveStatus.REJECTED,
                daysOffset: 2,
                duration: 2,
                reason: 'Événement personnel',
                rejection: 'Effectif insuffisant sur cette période',
            },
            {
                agent: 'Jean-Baptiste',
                type: leave_entity_1.LeaveType.CONGE_ANNUEL,
                status: leave_entity_1.LeaveStatus.APPROVED,
                daysOffset: -20,
                duration: 15,
                reason: 'Vacances',
            },
            {
                agent: 'Paul',
                type: leave_entity_1.LeaveType.MALADIE,
                status: leave_entity_1.LeaveStatus.APPROVED,
                daysOffset: -5,
                duration: 2,
                reason: 'Rendez-vous médical',
            },
            {
                agent: 'Jeanne',
                type: leave_entity_1.LeaveType.RECUPERATION,
                status: leave_entity_1.LeaveStatus.APPROVED,
                daysOffset: 1,
                duration: 1,
                reason: 'Récupération après trois nuits consécutives',
            },
            {
                agent: 'Robert',
                type: leave_entity_1.LeaveType.MALADIE,
                status: leave_entity_1.LeaveStatus.PENDING,
                daysOffset: -1,
                duration: 7,
                reason: 'Arrêt maladie avec certificat transmis tardivement',
            },
            {
                agent: 'Aline',
                type: leave_entity_1.LeaveType.CONGE_ANNUEL,
                status: leave_entity_1.LeaveStatus.REJECTED,
                daysOffset: 3,
                duration: 4,
                reason: 'Demande de vacation incompatible avec planning pneumologie',
                rejection: 'Vacation déjà planifiée et remplaçant non identifié',
            },
            {
                agent: 'Catherine',
                type: leave_entity_1.LeaveType.MALADIE,
                status: leave_entity_1.LeaveStatus.APPROVED,
                daysOffset: -35,
                duration: 30,
                reason: 'Arrêt long avec visite de reprise à organiser',
            },
        ];
        for (const data of leaveData) {
            const agent = allAgents.find((a) => a.firstName === data.agent);
            if (agent) {
                const start = (0, date_fns_1.addDays)(new Date(), data.daysOffset);
                const end = (0, date_fns_1.addDays)(start, data.duration);
                await this.leaveRepo.save({
                    tenantId,
                    agent,
                    type: data.type,
                    status: data.status,
                    start,
                    end,
                    reason: data.reason,
                    approvedBy: data.status !== leave_entity_1.LeaveStatus.PENDING
                        ? agent.manager || undefined
                        : undefined,
                    rejectionReason: data.rejection,
                });
            }
        }
        const startOfCurrentWeek = (0, date_fns_1.startOfWeek)(new Date(), { weekStartsOn: 1 });
        const findAgent = (firstName) => allAgents.find((agent) => agent.firstName === firstName);
        const buildDate = (dayOffset, hour) => (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)((0, date_fns_1.addDays)(startOfCurrentWeek, dayOffset), 0), hour);
        const shiftsToCreate = [];
        const addShift = (firstName, dayOffset, startHour, endDayOffset, endHour, postId, type, status = 'PUBLISHED', complianceExceptionReason) => {
            const agent = findAgent(firstName);
            if (!agent)
                return;
            shiftsToCreate.push({
                tenantId,
                facilityId: agent.facilityId,
                agent,
                start: buildDate(dayOffset, startHour),
                end: buildDate(endDayOffset, endHour),
                postId,
                type,
                status,
                complianceExceptionApproved: Boolean(complianceExceptionReason),
                complianceExceptionReason: complianceExceptionReason || null,
                complianceExceptionApprovedById: complianceExceptionReason
                    ? directeur.id
                    : null,
                complianceExceptionApprovedAt: complianceExceptionReason
                    ? new Date()
                    : null,
            });
        };
        for (let day = 0; day < 5; day++) {
            addShift('Léon', day, 8, day, 20, `URG-JOUR-MED-${day + 1}`, shift_entity_1.ShiftType.NORMAL);
            addShift('Pauline', day, 8, day, 20, `URG-JOUR-IDE-${day + 1}`, shift_entity_1.ShiftType.NORMAL);
            addShift('Jeanne', day, 20, day + 1, 8, `URG-NUIT-IDE-${day + 1}`, shift_entity_1.ShiftType.GARDE_SUR_PLACE);
        }
        addShift('Jeanne', -3, 20, -2, 8, 'URG-NUIT-SURCHARGE-1', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'VALIDATED', 'Surcharge volontaire pour absence imprévue IDE nuit');
        addShift('Jeanne', -2, 20, -1, 8, 'URG-NUIT-SURCHARGE-2', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'VALIDATED', 'Dépassement repos minimal accepté en préprod');
        addShift('Jeanne', -1, 20, 0, 8, 'URG-NUIT-SURCHARGE-3', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'VALIDATED', 'Troisième nuit consécutive pour test fatigue');
        addShift('Paul', 0, 20, 1, 8, 'CHIR-ASTREINTE-LUN', shift_entity_1.ShiftType.ASTREINTE, 'VALIDATED');
        addShift('Paul', 2, 20, 3, 8, 'CHIR-ASTREINTE-MER', shift_entity_1.ShiftType.ASTREINTE, 'VALIDATED');
        addShift('Paul', 5, 8, 6, 8, 'CHIR-GARDE-WEEKEND-24H', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'VALIDATED', 'Garde 24h week-end validée par direction médicale');
        addShift('Aline', 1, 8, 1, 14, 'PNEU-VAC-MARDI', shift_entity_1.ShiftType.NORMAL, 'PUBLISHED');
        addShift('Aline', 3, 8, 3, 14, 'PNEU-VAC-JEUDI', shift_entity_1.ShiftType.NORMAL, 'PUBLISHED');
        addShift('Robert', 0, 8, 0, 20, 'URG-AS-CERTIF-PENDING', shift_entity_1.ShiftType.NORMAL, 'PUBLISHED', 'Shift maintenu malgré certificat maladie en attente');
        addShift('Diane', 0, 20, 1, 8, 'REA-NUIT-VENTILATION', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'PUBLISHED');
        addShift('Serge', 1, 20, 2, 8, 'REA-MED-NUIT', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'PUBLISHED');
        addShift('Irène', 4, 20, 5, 8, 'MAT-NUIT-ACCOUCHEMENT', shift_entity_1.ShiftType.GARDE_SUR_PLACE, 'PUBLISHED');
        addShift('Oscar', 5, 8, 5, 20, 'RAD-WEEKEND-IRM', shift_entity_1.ShiftType.NORMAL, 'PENDING');
        await this.shiftRepo.save(shiftsToCreate.map((shift) => this.shiftRepo.create(shift)));
        const compDesc = [
            {
                name: 'AFGSU Niveau 1',
                category: 'Urgences',
                type: competency_entity_1.CompetencyType.SKILL,
                isMandatoryToWork: false,
            },
            {
                name: 'AFGSU Niveau 2',
                category: 'Urgences',
                type: competency_entity_1.CompetencyType.LEGAL_CERTIFICATION,
                isMandatoryToWork: true,
            },
            {
                name: 'Manipulation Respirateur',
                category: 'Réanimation',
                type: competency_entity_1.CompetencyType.SKILL,
                isMandatoryToWork: false,
            },
            {
                name: 'Gestion Incendie',
                category: 'Sécurité',
                type: competency_entity_1.CompetencyType.LEGAL_CERTIFICATION,
                isMandatoryToWork: true,
            },
            {
                name: 'Prélèvement Sanguin',
                category: 'Soins',
                type: competency_entity_1.CompetencyType.SKILL,
                isMandatoryToWork: false,
            },
            {
                name: 'Circuit des stupéfiants',
                category: 'Pharmacie',
                type: competency_entity_1.CompetencyType.LEGAL_CERTIFICATION,
                isMandatoryToWork: true,
            },
            {
                name: 'Radioprotection patient',
                category: 'Imagerie',
                type: competency_entity_1.CompetencyType.LEGAL_CERTIFICATION,
                isMandatoryToWork: true,
            },
            {
                name: 'Surveillance nouveau-né à risque',
                category: 'Néonatologie',
                type: competency_entity_1.CompetencyType.SKILL,
                isMandatoryToWork: false,
            },
        ];
        const savedComps = [];
        for (const comp of compDesc) {
            savedComps.push(await this.compRepo.save(comp));
        }
        for (const agent of allAgents) {
            const numComps = (agent.id % 3) + 1;
            for (let i = 0; i < numComps; i++) {
                const comp = savedComps[(agent.id + i) % savedComps.length];
                const level = ((agent.id + i) % 5) + 1;
                const expiry = new Date();
                const expiryCase = (agent.id + i) % 5;
                if (expiryCase < 3)
                    expiry.setFullYear(expiry.getFullYear() + 1);
                else if (expiryCase === 3)
                    expiry.setDate(expiry.getDate() + 15);
                else
                    expiry.setMonth(expiry.getMonth() - 2);
                await this.agentCompRepo.save({
                    agent,
                    competency: comp,
                    level,
                    expirationDate: expiry,
                });
            }
        }
        const competencyByName = new Map(savedComps.map((comp) => [comp.name, comp]));
        const competencyCases = [
            {
                firstName: 'Thérèse',
                competency: 'Circuit des stupéfiants',
                level: 4,
                days: 180,
            },
            {
                firstName: 'Oscar',
                competency: 'Radioprotection patient',
                level: 4,
                days: -10,
            },
            {
                firstName: 'Diane',
                competency: 'Manipulation Respirateur',
                level: 5,
                days: 365,
            },
            {
                firstName: 'Serge',
                competency: 'Manipulation Respirateur',
                level: 5,
                days: 21,
            },
            {
                firstName: 'Flore',
                competency: 'Surveillance nouveau-né à risque',
                level: 4,
                days: 120,
            },
            { firstName: 'Robert', competency: 'AFGSU Niveau 2', level: 3, days: -2 },
            { firstName: 'Jeanne', competency: 'AFGSU Niveau 2', level: 4, days: 45 },
        ];
        for (const competencyCase of competencyCases) {
            const agent = findAgent(competencyCase.firstName);
            const competency = competencyByName.get(competencyCase.competency);
            if (agent && competency) {
                await this.agentCompRepo.save({
                    agent,
                    competency,
                    level: competencyCase.level,
                    expirationDate: (0, date_fns_1.addDays)(new Date(), competencyCase.days),
                });
            }
        }
        await this.serviceRepo.update(urgences.id, {
            coverageRules: {
                minStaffing: [
                    {
                        name: 'Médecin urgentiste présent',
                        jobTitle: 'Médecin Urgentiste',
                        minCount: 1,
                    },
                    {
                        name: 'IDE urgence AFGSU2',
                        jobTitle: 'Infirmière',
                        competencyName: 'AFGSU Niveau 2',
                        minCount: 2,
                    },
                ],
            },
        });
        await this.serviceRepo.update(reanimation.id, {
            coverageRules: {
                minStaffing: [
                    { name: 'Réanimateur', jobTitle: 'Médecin Réanimateur', minCount: 1 },
                    {
                        name: 'Respirateur',
                        competencyName: 'Manipulation Respirateur',
                        minCount: 1,
                    },
                ],
            },
        });
        await this.serviceRepo.update(pharmacie.id, {
            coverageRules: {
                minStaffing: [
                    {
                        name: 'Circuit stupéfiants',
                        competencyName: 'Circuit des stupéfiants',
                        minCount: 1,
                    },
                ],
            },
        });
        const fakeDocuments = [
            {
                title: 'Contrat de travail à durée indéterminée',
                type: 'Contrat de Travail',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            },
            {
                title: 'Attestation de formation AFGSU',
                type: 'Attestation de Formation',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            },
            {
                title: 'Avenant au contrat - Nuit',
                type: 'Avenant de Garde',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            },
            {
                title: 'Fiche de paie Mai',
                type: 'Fiche de Paie',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            },
            {
                title: 'Certificat médical arrêt maladie',
                type: 'Certificat Médical',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            },
        ];
        for (const agent of allAgents) {
            const nbDoc = (agent.id % 2) + 1;
            for (let i = 0; i < nbDoc; i++) {
                const docDesc = fakeDocuments[(agent.id + i) % fakeDocuments.length];
                let status = document_entity_1.DocumentStatus.SIGNED;
                if ((agent.id + i) % 5 === 0)
                    status = document_entity_1.DocumentStatus.PENDING_SIGNATURE;
                await this.documentRepo.save({
                    tenantId,
                    title: docDesc.title,
                    type: docDesc.type,
                    status: status,
                    fileUrl: docDesc.fileUrl,
                    agent,
                    otpSecret: status === document_entity_1.DocumentStatus.PENDING_SIGNATURE
                        ? String(1000 + ((agent.id + i) % 9000))
                        : undefined,
                });
            }
        }
        const documentCases = [
            {
                firstName: 'Robert',
                title: 'Certificat maladie reçu hors délai',
                type: 'Certificat Médical',
                status: document_entity_1.DocumentStatus.PENDING_SIGNATURE,
                otpSecret: '2405',
            },
            {
                firstName: 'Oscar',
                title: 'Attestation radioprotection expirée',
                type: 'Attestation de Formation',
                status: document_entity_1.DocumentStatus.ARCHIVED,
            },
            {
                firstName: 'Jeanne',
                title: 'Avenant nuits consécutives urgences',
                type: 'Avenant de Garde',
                status: document_entity_1.DocumentStatus.SIGNED,
            },
            {
                firstName: 'Catherine',
                title: 'Certificat arrêt long - visite de reprise requise',
                type: 'Certificat Médical',
                status: document_entity_1.DocumentStatus.SIGNED,
            },
        ];
        for (const documentCase of documentCases) {
            const agent = findAgent(documentCase.firstName);
            if (agent) {
                await this.documentRepo.save({
                    tenantId,
                    title: documentCase.title,
                    type: documentCase.type,
                    status: documentCase.status,
                    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    agent,
                    otpSecret: documentCase.otpSecret,
                });
            }
        }
        const totalServices = await this.serviceRepo.count({ where: { tenantId } });
        const totalAgents = await this.agentRepo.count({ where: { tenantId } });
        const totalLeaves = await this.leaveRepo.count({ where: { tenantId } });
        const totalFacilities = await this.facilityRepo.count({
            where: { tenantId },
        });
        const totalGrades = await this.gradeRepo.count({ where: { tenantId } });
        const totalShifts = await this.shiftRepo.count({ where: { tenantId } });
        const totalRoles = await this.roleRepo.count({ where: { tenantId } });
        return {
            success: true,
            message: 'Seed completed successfully for Hôpital Général de Douala',
            data: {
                tenant: tenantId,
                facilities: totalFacilities,
                services: totalServices,
                grades: totalGrades,
                agents: totalAgents,
                leaves: totalLeaves,
                shifts: totalShifts,
                roles: totalRoles,
                credentials: {
                    password: 'password123',
                    tenantId,
                    accounts: demoAccounts,
                },
            },
        };
    }
};
exports.SeedController = SeedController;
__decorate([
    (0, common_1.Post)('hgd'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "seedHGD", null);
exports.SeedController = SeedController = __decorate([
    (0, common_1.Controller)('seed'),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(1, (0, typeorm_1.InjectRepository)(facility_entity_1.Facility)),
    __param(2, (0, typeorm_1.InjectRepository)(grade_entity_1.Grade)),
    __param(3, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __param(4, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __param(5, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(6, (0, typeorm_1.InjectRepository)(competency_entity_1.Competency)),
    __param(7, (0, typeorm_1.InjectRepository)(agent_competency_entity_1.AgentCompetency)),
    __param(8, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __param(9, (0, typeorm_1.InjectRepository)(contract_entity_1.Contract)),
    __param(10, (0, typeorm_1.InjectRepository)(bonus_template_entity_1.BonusTemplate)),
    __param(11, (0, typeorm_1.InjectRepository)(contract_bonus_entity_1.ContractBonus)),
    __param(12, (0, typeorm_1.InjectRepository)(payroll_rule_entity_1.PayrollRule)),
    __param(13, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SeedController);
//# sourceMappingURL=seed.controller.js.map