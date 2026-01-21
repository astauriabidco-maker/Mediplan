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
const hospital_service_entity_1 = require("../agents/entities/hospital-service.entity");
const leave_entity_1 = require("../planning/entities/leave.entity");
const bcrypt = __importStar(require("bcrypt"));
const date_fns_1 = require("date-fns");
let SeedController = class SeedController {
    agentRepo;
    serviceRepo;
    leaveRepo;
    constructor(agentRepo, serviceRepo, leaveRepo) {
        this.agentRepo = agentRepo;
        this.serviceRepo = serviceRepo;
        this.leaveRepo = leaveRepo;
    }
    async seedHGD() {
        const tenantId = 'HGD-DOUALA';
        const passwordHash = await bcrypt.hash('password123', 10);
        await this.serviceRepo.update({ tenantId }, { parentServiceId: null });
        await this.serviceRepo.update({ tenantId }, {
            chiefId: null,
            deputyChiefId: null,
            majorId: null,
            nursingManagerId: null
        });
        await this.leaveRepo.delete({ tenantId });
        await this.agentRepo.delete({ tenantId });
        await this.serviceRepo.delete({ tenantId });
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
            role: agent_entity_1.UserRole.ADMIN,
            password: passwordHash,
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
        const allAgents = await this.agentRepo.find({ where: { tenantId }, relations: ['manager'] });
        const leaveData = [
            { agent: 'Thomas', type: leave_entity_1.LeaveType.CONGE_ANNUEL, status: leave_entity_1.LeaveStatus.APPROVED, daysOffset: -10, duration: 5, reason: 'Congés annuels' },
            { agent: 'André', type: leave_entity_1.LeaveType.MALADIE, status: leave_entity_1.LeaveStatus.APPROVED, daysOffset: -2, duration: 3, reason: 'Grippe' },
            { agent: 'Élise', type: leave_entity_1.LeaveType.RECUPERATION, status: leave_entity_1.LeaveStatus.PENDING, daysOffset: 5, duration: 1, reason: 'Récupération après garde' },
            { agent: 'Patrick', type: leave_entity_1.LeaveType.CONGE_ANNUEL, status: leave_entity_1.LeaveStatus.PENDING, daysOffset: 15, duration: 10, reason: 'Voyage familial' },
            { agent: 'Catherine', type: leave_entity_1.LeaveType.AUTRE, status: leave_entity_1.LeaveStatus.REJECTED, daysOffset: 2, duration: 2, reason: 'Événement personnel', rejection: 'Effectif insuffisant sur cette période' },
            { agent: 'Jean-Baptiste', type: leave_entity_1.LeaveType.CONGE_ANNUEL, status: leave_entity_1.LeaveStatus.APPROVED, daysOffset: -20, duration: 15, reason: 'Vacances' },
            { agent: 'Paul', type: leave_entity_1.LeaveType.MALADIE, status: leave_entity_1.LeaveStatus.APPROVED, daysOffset: -5, duration: 2, reason: 'Rendez-vous médical' },
        ];
        for (const data of leaveData) {
            const agent = allAgents.find(a => a.firstName === data.agent);
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
                    approvedBy: data.status !== leave_entity_1.LeaveStatus.PENDING ? agent.manager || undefined : undefined,
                    rejectionReason: data.rejection
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
    __param(1, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __param(2, (0, typeorm_1.InjectRepository)(leave_entity_1.Leave)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SeedController);
//# sourceMappingURL=seed.controller.js.map