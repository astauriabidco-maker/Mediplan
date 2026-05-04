"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalServicesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const hospital_service_entity_1 = require("./entities/hospital-service.entity");
const agent_entity_1 = require("./entities/agent.entity");
const audit_service_1 = require("../audit/audit.service");
const audit_log_entity_1 = require("../audit/entities/audit-log.entity");
let HospitalServicesService = class HospitalServicesService {
    hospitalServiceRepository;
    agentRepository;
    auditService;
    constructor(hospitalServiceRepository, agentRepository, auditService) {
        this.hospitalServiceRepository = hospitalServiceRepository;
        this.agentRepository = agentRepository;
        this.auditService = auditService;
    }
    async findAll(tenantId) {
        return this.hospitalServiceRepository.find({
            where: { tenantId },
            relations: ['agents', 'chief', 'deputyChief', 'major', 'nursingManager', 'parentService']
        });
    }
    async create(tenantId, data, actorId) {
        await this.assertUniqueServiceIdentity(tenantId, data.name, data.code);
        await this.assertResponsibleAgentsBelongToTenant(tenantId, data);
        const service = this.hospitalServiceRepository.create({
            ...data,
            tenantId,
            level: data.level || 1,
        });
        const saved = await this.hospitalServiceRepository.save(service);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.HOSPITAL_SERVICE, saved.id, this.getAuditSnapshot(saved));
        return saved;
    }
    async findOne(tenantId, id) {
        return this.getServiceOrThrow(tenantId, id, [
            'agents',
            'chief',
            'deputyChief',
            'major',
            'nursingManager',
            'parentService',
            'subServices'
        ]);
    }
    async update(tenantId, id, data, actorId) {
        const service = await this.getServiceOrThrow(tenantId, id, ['agents', 'subServices']);
        await this.assertUniqueServiceIdentity(tenantId, data.name, data.code, id);
        await this.assertResponsibleAgentsBelongToTenant(tenantId, data);
        const before = this.getAuditSnapshot(service);
        Object.assign(service, data);
        service.tenantId = tenantId;
        const updated = await this.hospitalServiceRepository.save(service);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.HOSPITAL_SERVICE, updated.id, {
            updatedFields: Object.keys(data),
            before,
            after: this.getAuditSnapshot(updated),
        });
        return updated;
    }
    async remove(tenantId, id, actorId) {
        const service = await this.getServiceOrThrow(tenantId, id, ['agents', 'subServices']);
        if (service.agents && service.agents.length > 0) {
            throw new common_1.BadRequestException(`Cannot disable service with ${service.agents.length} assigned agents`);
        }
        if (service.subServices && service.subServices.length > 0) {
            throw new common_1.BadRequestException(`Cannot disable service with ${service.subServices.length} sub-services`);
        }
        const before = this.getAuditSnapshot(service);
        service.isActive = false;
        const updated = await this.hospitalServiceRepository.save(service);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.DELETE, audit_log_entity_1.AuditEntityType.HOSPITAL_SERVICE, updated.id, {
            action: 'DISABLE_HOSPITAL_SERVICE',
            before,
            after: this.getAuditSnapshot(updated),
        });
    }
    async getStats(tenantId) {
        const services = await this.findAll(tenantId);
        return {
            totalServices: services.length,
            services: services.map(service => ({
                id: service.id,
                name: service.name,
                code: service.code,
                agentCount: service.agents?.length || 0,
                level: service.level,
                hasChief: !!service.chiefId
            })),
            totalAgents: services.reduce((sum, s) => sum + (s.agents?.length || 0), 0)
        };
    }
    async getServiceTree(tenantId) {
        const rootServices = await this.hospitalServiceRepository.find({
            where: { tenantId, level: 1, isActive: true },
            relations: [
                'subServices',
                'subServices.subServices',
                'agents',
                'chief',
                'deputyChief',
                'major',
                'nursingManager',
                'subServices.chief',
                'subServices.deputyChief',
                'subServices.major',
                'subServices.nursingManager'
            ],
            order: { name: 'ASC' }
        });
        return rootServices;
    }
    async getServiceHierarchy(tenantId, serviceId) {
        return this.hospitalServiceRepository.findOne({
            where: { id: serviceId, tenantId },
            relations: [
                'parentService',
                'subServices',
                'agents',
                'chief',
                'deputyChief',
                'major',
                'nursingManager',
                'subServices.agents'
            ]
        });
    }
    async createSubService(tenantId, parentId, data, actorId) {
        const parent = await this.getServiceOrThrow(tenantId, parentId);
        await this.assertUniqueServiceIdentity(tenantId, data.name, data.code);
        await this.assertResponsibleAgentsBelongToTenant(tenantId, data);
        const subService = this.hospitalServiceRepository.create({
            ...data,
            tenantId,
            parentServiceId: parentId,
            level: parent.level + 1
        });
        const saved = await this.hospitalServiceRepository.save(subService);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.CREATE, audit_log_entity_1.AuditEntityType.HOSPITAL_SERVICE, saved.id, {
            ...this.getAuditSnapshot(saved),
            parentServiceId: parentId,
        });
        return saved;
    }
    async assignResponsible(tenantId, serviceId, role, agentId, actorId) {
        const service = await this.getServiceOrThrow(tenantId, serviceId);
        if (agentId !== null) {
            await this.getAgentOrThrow(tenantId, agentId);
        }
        const before = this.getAuditSnapshot(service);
        service[`${role}Id`] = agentId;
        const updated = await this.hospitalServiceRepository.save(service);
        await this.auditService.log(tenantId, actorId, audit_log_entity_1.AuditAction.UPDATE, audit_log_entity_1.AuditEntityType.HOSPITAL_SERVICE, updated.id, {
            action: 'ASSIGN_RESPONSIBLE',
            role,
            agentId,
            before,
            after: this.getAuditSnapshot(updated),
        });
        return updated;
    }
    async getServiceOrThrow(tenantId, id, relations = []) {
        const service = await this.hospitalServiceRepository.findOne({
            where: { id, tenantId },
            relations,
        });
        if (!service) {
            throw new common_1.NotFoundException(`Service #${id} not found`);
        }
        return service;
    }
    async getAgentOrThrow(tenantId, id) {
        const agent = await this.agentRepository.findOne({
            where: { id, tenantId },
        });
        if (!agent) {
            throw new common_1.NotFoundException(`Agent #${id} not found`);
        }
        return agent;
    }
    async assertUniqueServiceIdentity(tenantId, name, code, excludeServiceId) {
        if (name) {
            const existingName = await this.hospitalServiceRepository.findOne({
                where: {
                    tenantId,
                    name,
                    ...(excludeServiceId ? { id: (0, typeorm_2.Not)(excludeServiceId) } : {}),
                },
            });
            if (existingName) {
                throw new common_1.ConflictException('Hospital service name already exists for this tenant');
            }
        }
        if (code) {
            const existingCode = await this.hospitalServiceRepository.findOne({
                where: {
                    tenantId,
                    code,
                    ...(excludeServiceId ? { id: (0, typeorm_2.Not)(excludeServiceId) } : {}),
                },
            });
            if (existingCode) {
                throw new common_1.ConflictException('Hospital service code already exists for this tenant');
            }
        }
    }
    async assertResponsibleAgentsBelongToTenant(tenantId, data) {
        const responsibleIds = [
            data.chiefId,
            data.deputyChiefId,
            data.majorId,
            data.nursingManagerId,
        ].filter((id) => typeof id === 'number');
        await Promise.all(responsibleIds.map((id) => this.getAgentOrThrow(tenantId, id)));
    }
    getAuditSnapshot(service) {
        return {
            id: service.id,
            name: service.name,
            code: service.code,
            tenantId: service.tenantId,
            parentServiceId: service.parentServiceId,
            level: service.level,
            isActive: service.isActive,
            chiefId: service.chiefId,
            deputyChiefId: service.deputyChiefId,
            majorId: service.majorId,
            nursingManagerId: service.nursingManagerId,
            facilityId: service.facilityId,
        };
    }
};
exports.HospitalServicesService = HospitalServicesService;
exports.HospitalServicesService = HospitalServicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __param(1, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], HospitalServicesService);
//# sourceMappingURL=hospital-services.service.js.map