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
exports.AgentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_entity_1 = require("./entities/agent.entity");
const bcrypt = __importStar(require("bcrypt"));
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
let AgentsService = class AgentsService {
    agentRepository;
    auditService;
    constructor(agentRepository, auditService) {
        this.agentRepository = agentRepository;
        this.auditService = auditService;
    }
    async create(createAgentDto, actorId) {
        const hashedPassword = await bcrypt.hash(createAgentDto.password || 'password123', 10);
        const agent = this.agentRepository.create({
            ...createAgentDto,
            password: hashedPassword,
        });
        const savedAgent = await this.agentRepository.save(agent);
        await this.auditService.log(createAgentDto.tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.AGENT, savedAgent.id.toString(), { email: savedAgent.email });
        return savedAgent;
    }
    findAll(tenantId) {
        return this.agentRepository.find({
            where: { tenantId },
            relations: ['hospitalService', 'manager', 'grade'],
            order: { nom: 'ASC' },
        });
    }
    async findOne(id, tenantId, actorId) {
        const agent = await this.agentRepository.findOne({
            where: { id, tenantId },
            relations: ['contracts', 'agentCompetencies', 'agentCompetencies.competency', 'hospitalService', 'manager'],
        });
        if (!agent) {
            throw new common_1.NotFoundException(`Agent #${id} not found`);
        }
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.READ, audit_log_entity_1.AuditEntityType.AGENT, id.toString(), { accessedBy: actorId });
        return agent;
    }
    async update(id, updateAgentDto, tenantId, actorId) {
        const agent = await this.findOne(id, tenantId, actorId);
        if (updateAgentDto.password) {
            updateAgentDto.password = await bcrypt.hash(updateAgentDto.password, 10);
        }
        Object.assign(agent, updateAgentDto);
        const updatedAgent = await this.agentRepository.save(agent);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.AGENT, id.toString(), { updatedFields: Object.keys(updateAgentDto) });
        return updatedAgent;
    }
    async remove(id, tenantId, actorId) {
        const agent = await this.findOne(id, tenantId, actorId);
        const result = await this.agentRepository.remove(agent);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.DELETE, audit_log_entity_1.AuditEntityType.AGENT, id.toString(), { email: agent.email });
        return result;
    }
    async getMyTeam(agentId, tenantId) {
        const currentAgent = await this.agentRepository.findOne({
            where: { id: agentId, tenantId },
            relations: ['hospitalService'],
        });
        if (!currentAgent) {
            throw new common_1.NotFoundException(`Agent #${agentId} not found`);
        }
        const directReports = await this.agentRepository.find({
            where: { managerId: agentId, tenantId },
            relations: ['hospitalService'],
            order: { nom: 'ASC' },
        });
        return [currentAgent, ...directReports];
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_service_1.AuditService])
], AgentsService);
//# sourceMappingURL=agents.service.js.map