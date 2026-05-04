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
const hospital_service_entity_1 = require("./entities/hospital-service.entity");
const health_record_entity_1 = require("./entities/health-record.entity");
const bcrypt = __importStar(require("bcrypt"));
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
let AgentsService = class AgentsService {
    agentRepository;
    healthRecordRepository;
    hospitalServiceRepository;
    auditService;
    constructor(agentRepository, healthRecordRepository, hospitalServiceRepository, auditService) {
        this.agentRepository = agentRepository;
        this.healthRecordRepository = healthRecordRepository;
        this.hospitalServiceRepository = hospitalServiceRepository;
        this.auditService = auditService;
    }
    async create(createAgentDto, actorId) {
        await this.assertUniqueIdentity(createAgentDto.tenantId, createAgentDto.email, createAgentDto.matricule);
        await this.assertRelationsBelongToTenant(createAgentDto.tenantId, createAgentDto);
        const hashedPassword = await bcrypt.hash(createAgentDto.password || 'password123', 10);
        const agent = this.agentRepository.create({
            ...createAgentDto,
            password: hashedPassword,
        });
        const savedAgent = await this.agentRepository.save(agent);
        await this.auditService.log(createAgentDto.tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.AGENT, savedAgent.id.toString(), {
            hospitalServiceId: savedAgent.hospitalServiceId,
            managerId: savedAgent.managerId,
            role: savedAgent.role,
            status: savedAgent.status,
        });
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
        const agent = await this.getAgentOrThrow(id, tenantId, ['contracts', 'agentCompetencies', 'agentCompetencies.competency', 'hospitalService', 'manager']);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.READ, audit_log_entity_1.AuditEntityType.AGENT, id.toString(), { accessedBy: actorId });
        return agent;
    }
    async update(id, updateAgentDto, tenantId, actorId) {
        const agent = await this.getAgentOrThrow(id, tenantId, ['hospitalService', 'manager', 'grade']);
        await this.assertUniqueIdentity(tenantId, updateAgentDto.email, updateAgentDto.matricule, id);
        await this.assertRelationsBelongToTenant(tenantId, updateAgentDto);
        if (updateAgentDto.password) {
            updateAgentDto.password = await bcrypt.hash(updateAgentDto.password, 10);
        }
        const previousSnapshot = this.getAuditSnapshot(agent);
        Object.assign(agent, updateAgentDto);
        agent.tenantId = tenantId;
        const updatedAgent = await this.agentRepository.save(agent);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.AGENT, id.toString(), {
            updatedFields: Object.keys(updateAgentDto).filter((field) => field !== 'password'),
            before: previousSnapshot,
            after: this.getAuditSnapshot(updatedAgent),
            passwordChanged: Boolean(updateAgentDto.password),
        });
        return updatedAgent;
    }
    async remove(id, tenantId, actorId) {
        const agent = await this.getAgentOrThrow(id, tenantId);
        const previousSnapshot = this.getAuditSnapshot(agent);
        agent.status = agent_entity_1.UserStatus.DISABLED;
        const result = await this.agentRepository.save(agent);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.DELETE, audit_log_entity_1.AuditEntityType.AGENT, id.toString(), {
            action: 'DISABLE_AGENT',
            before: previousSnapshot,
            after: this.getAuditSnapshot(result),
        });
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
    async getHealthRecords(agentId, tenantId) {
        const records = await this.healthRecordRepository.find({
            where: { agentId, tenantId },
            order: { expirationDate: 'ASC' }
        });
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let hasUpdates = false;
        for (const record of records) {
            if (record.expirationDate) {
                const expDate = new Date(record.expirationDate);
                expDate.setHours(0, 0, 0, 0);
                const diffTime = expDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                let newStatus = record.status;
                if (diffDays < 0) {
                    newStatus = health_record_entity_1.HealthRecordStatus.EXPIRED;
                }
                else if (diffDays <= 30) {
                    newStatus = health_record_entity_1.HealthRecordStatus.EXPIRING_SOON;
                }
                else {
                    newStatus = health_record_entity_1.HealthRecordStatus.VALID;
                }
                if (newStatus !== record.status) {
                    record.status = newStatus;
                    hasUpdates = true;
                }
            }
        }
        if (hasUpdates) {
            await this.healthRecordRepository.save(records);
        }
        return records;
    }
    async addHealthRecord(agentId, tenantId, data, actorId) {
        const newRecord = this.healthRecordRepository.create({
            ...data,
            agentId,
            tenantId,
        });
        const saved = await this.healthRecordRepository.save(newRecord);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.AGENT, agentId.toString(), {
            action: 'ADD_HEALTH_RECORD',
            recordTitle: saved.title
        });
        return saved;
    }
    async deleteHealthRecord(id, tenantId, actorId) {
        const record = await this.healthRecordRepository.findOne({ where: { id, tenantId } });
        if (!record)
            throw new common_1.NotFoundException('Health record not found');
        await this.healthRecordRepository.remove(record);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.DELETE, audit_log_entity_1.AuditEntityType.AGENT, record.agentId.toString(), {
            action: 'DELETE_HEALTH_RECORD',
            recordTitle: record.title
        });
        return { success: true };
    }
    async getAgentOrThrow(id, tenantId, relations = []) {
        const agent = await this.agentRepository.findOne({
            where: { id, tenantId },
            relations,
        });
        if (!agent) {
            throw new common_1.NotFoundException(`Agent #${id} not found`);
        }
        return agent;
    }
    async assertUniqueIdentity(tenantId, email, matricule, excludeAgentId) {
        if (email) {
            const existingEmail = await this.agentRepository.findOne({
                where: {
                    tenantId,
                    email,
                    ...(excludeAgentId ? { id: (0, typeorm_2.Not)(excludeAgentId) } : {}),
                },
            });
            if (existingEmail) {
                throw new common_1.ConflictException('Agent email already exists for this tenant');
            }
        }
        if (matricule) {
            const existingMatricule = await this.agentRepository.findOne({
                where: {
                    tenantId,
                    matricule,
                    ...(excludeAgentId ? { id: (0, typeorm_2.Not)(excludeAgentId) } : {}),
                },
            });
            if (existingMatricule) {
                throw new common_1.ConflictException('Agent matricule already exists for this tenant');
            }
        }
    }
    async assertRelationsBelongToTenant(tenantId, data) {
        if (data.hospitalServiceId) {
            const service = await this.hospitalServiceRepository.findOne({
                where: { id: data.hospitalServiceId, tenantId },
            });
            if (!service) {
                throw new common_1.NotFoundException(`Hospital service #${data.hospitalServiceId} not found`);
            }
        }
        if (data.managerId) {
            await this.getAgentOrThrow(data.managerId, tenantId);
        }
    }
    getAuditSnapshot(agent) {
        return {
            id: agent.id,
            role: agent.role,
            roleId: agent.roleId,
            status: agent.status,
            hospitalServiceId: agent.hospitalServiceId,
            managerId: agent.managerId,
            gradeId: agent.gradeId,
            facilityId: agent.facilityId,
        };
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __param(1, (0, typeorm_1.InjectRepository)(health_record_entity_1.HealthRecord)),
    __param(2, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], AgentsService);
//# sourceMappingURL=agents.service.js.map