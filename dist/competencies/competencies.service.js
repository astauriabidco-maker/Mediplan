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
exports.CompetenciesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_competency_entity_1 = require("./entities/agent-competency.entity");
const agent_entity_1 = require("../agents/entities/agent.entity");
const competency_entity_1 = require("./entities/competency.entity");
const shift_entity_1 = require("../planning/entities/shift.entity");
const bcrypt = __importStar(require("bcrypt"));
let CompetenciesService = class CompetenciesService {
    agentCompetencyRepository;
    agentRepository;
    competencyRepository;
    shiftRepository;
    constructor(agentCompetencyRepository, agentRepository, competencyRepository, shiftRepository) {
        this.agentCompetencyRepository = agentCompetencyRepository;
        this.agentRepository = agentRepository;
        this.competencyRepository = competencyRepository;
        this.shiftRepository = shiftRepository;
    }
    async findAllMatrix(tenantId) {
        const agents = await this.agentRepository.find({
            where: { tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency', 'hospitalService'],
            order: { nom: 'ASC' },
        });
        const competencies = await this.competencyRepository.find({
            order: { name: 'ASC' },
        });
        return { agents, competencies };
    }
    async findValidByAgent(agentId) {
        return this.agentCompetencyRepository.find({
            where: {
                agent: { id: agentId },
                expirationDate: (0, typeorm_2.MoreThan)(new Date()),
            },
            relations: ['competency'],
        });
    }
    async create(name, category) {
        return this.competencyRepository.save({ name, category });
    }
    async assignToAgent(agentId, competencyId, level, expirationDate) {
        let agentComp = await this.agentCompetencyRepository.findOne({
            where: {
                agent: { id: agentId },
                competency: { id: competencyId }
            }
        });
        if (agentComp) {
            agentComp.level = level;
            if (expirationDate)
                agentComp.expirationDate = expirationDate;
        }
        else {
            agentComp = this.agentCompetencyRepository.create({
                agent: { id: agentId },
                competency: { id: competencyId },
                level,
                expirationDate
            });
        }
        return this.agentCompetencyRepository.save(agentComp);
    }
    async seedTestData() {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const agent = await this.agentRepository.save({
            nom: 'Test Agent',
            email: `test-${Date.now()}@mediplan.com`,
            matricule: `MAT-${Date.now()}`,
            telephone: '+33123456789',
            password: hashedPassword,
            tenantId: 'DEFAULT_TENANT'
        });
        const skill1 = await this.competencyRepository.save({ name: 'JavaScript', category: 'Tech' });
        const now = new Date();
        const future = new Date();
        future.setFullYear(now.getFullYear() + 1);
        await this.agentCompetencyRepository.save([
            { agent, competency: skill1, level: 3, expirationDate: future },
        ]);
        const startOfWeek = new Date();
        startOfWeek.setHours(8, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        const shifts = [];
        for (let i = 0; i < 3; i++) {
            const s = new Date(startOfWeek);
            s.setDate(startOfWeek.getDate() + i);
            const e = new Date(s);
            e.setHours(18, 0, 0, 0);
            shifts.push({ agent, start: s, end: e, postId: 'POST-A', tenantId: 'DEFAULT_TENANT' });
        }
        await this.shiftRepository.save(shifts);
        return {
            message: 'Test data seeded!',
            agentId: agent.id,
            agentEmail: agent.email,
            info: 'Created agent with 30h of shifts this week (1 valid competency).',
        };
    }
};
exports.CompetenciesService = CompetenciesService;
exports.CompetenciesService = CompetenciesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_competency_entity_1.AgentCompetency)),
    __param(1, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(2, (0, typeorm_1.InjectRepository)(competency_entity_1.Competency)),
    __param(3, (0, typeorm_1.InjectRepository)(shift_entity_1.Shift)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CompetenciesService);
//# sourceMappingURL=competencies.service.js.map