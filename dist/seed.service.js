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
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_entity_1 = require("./agents/entities/agent.entity");
const shift_entity_1 = require("./planning/entities/shift.entity");
const competency_entity_1 = require("./competencies/entities/competency.entity");
const agent_competency_entity_1 = require("./competencies/entities/agent-competency.entity");
const bcrypt = __importStar(require("bcrypt"));
const date_fns_1 = require("date-fns");
let SeedService = class SeedService {
    agentRepository;
    shiftRepository;
    competencyRepository;
    agentCompRepository;
    constructor(agentRepository, shiftRepository, competencyRepository, agentCompRepository) {
        this.agentRepository = agentRepository;
        this.shiftRepository = shiftRepository;
        this.competencyRepository = competencyRepository;
        this.agentCompRepository = agentCompRepository;
    }
    async seed() {
        try {
            await this.agentRepository.query('TRUNCATE TABLE agent, shift, agent_competency, contract RESTART IDENTITY CASCADE');
        }
        catch (e) {
            console.log('Error clearing tables', e);
        }
        const hashedPassword = await bcrypt.hash('password123', 10);
        const agentsData = [
            {
                nom: 'Admin Mediplan',
                email: 'admin@mediplan.com',
                matricule: 'PLATFORM-001',
                telephone: '+33600000000',
                password: hashedPassword,
                tenantId: 'PLATFORM',
                role: agent_entity_1.UserRole.SUPER_ADMIN,
            },
            {
                nom: 'Jean Dupont',
                email: 'jean.dupont@mediplan.com',
                matricule: 'FR-001',
                telephone: '+33612345678',
                password: hashedPassword,
                tenantId: 'DEFAULT_TENANT',
            },
            {
                nom: "Samuel Eto'o",
                email: 'samuel.etoo@mediplan.com',
                matricule: 'CM-009',
                telephone: '+237612345678',
                password: hashedPassword,
                tenantId: 'DEFAULT_TENANT',
            },
            {
                nom: 'Marie Curie',
                email: 'marie.curie@mediplan.com',
                matricule: 'FR-002',
                telephone: '+33687654321',
                password: hashedPassword,
                tenantId: 'DEFAULT_TENANT',
            },
        ];
        const savedAgents = [];
        for (const agentData of agentsData) {
            const agent = this.agentRepository.create(agentData);
            savedAgents.push(await this.agentRepository.save(agent));
        }
        const [admin, jean, samuel, marie] = savedAgents;
        const comp1 = await this.competencyRepository.save({ name: 'AFGSU Niveau 2', category: 'Urgences' });
        const comp2 = await this.competencyRepository.save({ name: 'Manipulation Respirateur', category: 'Réanimation' });
        const comp3 = await this.competencyRepository.save({ name: 'Gestion Incendie', category: 'Sécurité' });
        const today = new Date();
        const futureDate = new Date();
        futureDate.setFullYear(today.getFullYear() + 2);
        const pastDate = new Date();
        pastDate.setMonth(today.getMonth() - 2);
        const soonDate = new Date();
        soonDate.setDate(today.getDate() + 15);
        await this.agentCompRepository.save([
            { agent: jean, competency: comp1, level: 3, expirationDate: futureDate },
            { agent: jean, competency: comp2, level: 5, expirationDate: pastDate },
            { agent: samuel, competency: comp1, level: 2, expirationDate: soonDate },
            { agent: marie, competency: comp3, level: 4, expirationDate: futureDate }
        ]);
        const startOfCurrentWeek = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
        const shift由于 = [];
        for (let i = 0; i < 5; i++) {
            const day = (0, date_fns_1.addDays)(startOfCurrentWeek, i);
            shift由于.push(this.shiftRepository.create({
                start: (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(day, 0), 8),
                end: (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(day, 0), 16),
                postId: 'MEDECIN_GARDE',
                status: 'VALIDATED',
                agent: samuel,
                tenantId: 'DEFAULT_TENANT',
            }));
        }
        for (let i = 0; i < 5; i++) {
            const day = (0, date_fns_1.addDays)(startOfCurrentWeek, i);
            shift由于.push(this.shiftRepository.create({
                start: (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(day, 0), 14),
                end: (0, date_fns_1.setHours)((0, date_fns_1.setMinutes)(day, 0), 22),
                postId: 'INFIRMIER_NUIT',
                status: 'PENDING',
                agent: jean,
                tenantId: 'DEFAULT_TENANT',
            }));
        }
        await this.shiftRepository.save(shift由于);
        return { message: 'Database seeded successfully', agents: savedAgents.length, shifts: shift由于.length };
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(1, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __param(2, (0, typeorm_1.InjectRepository)(competency_entity_1.Competency)),
    __param(3, (0, typeorm_1.InjectRepository)(agent_competency_entity_1.AgentCompetency)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SeedService);
//# sourceMappingURL=seed.service.js.map