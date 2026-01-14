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
let HospitalServicesService = class HospitalServicesService {
    hospitalServiceRepository;
    constructor(hospitalServiceRepository) {
        this.hospitalServiceRepository = hospitalServiceRepository;
    }
    async findAll(tenantId) {
        return this.hospitalServiceRepository.find({
            where: { tenantId },
            relations: ['agents', 'chief', 'deputyChief', 'major', 'nursingManager', 'parentService']
        });
    }
    async create(tenantId, data) {
        const service = this.hospitalServiceRepository.create({
            ...data,
            tenantId
        });
        return this.hospitalServiceRepository.save(service);
    }
    async findOne(tenantId, id) {
        return this.hospitalServiceRepository.findOne({
            where: { id, tenantId },
            relations: ['agents', 'chief', 'deputyChief', 'major', 'nursingManager', 'parentService', 'subServices']
        });
    }
    async update(tenantId, id, data) {
        const service = await this.findOne(tenantId, id);
        if (!service) {
            throw new Error(`Service #${id} not found`);
        }
        Object.assign(service, data);
        return this.hospitalServiceRepository.save(service);
    }
    async remove(tenantId, id) {
        const service = await this.findOne(tenantId, id);
        if (!service) {
            throw new Error(`Service #${id} not found`);
        }
        if (service.agents && service.agents.length > 0) {
            throw new Error(`Cannot delete service with ${service.agents.length} assigned agents`);
        }
        if (service.subServices && service.subServices.length > 0) {
            throw new Error(`Cannot delete service with ${service.subServices.length} sub-services`);
        }
        await this.hospitalServiceRepository.remove(service);
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
        const service = await this.hospitalServiceRepository.findOne({
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
        return service;
    }
    async createSubService(tenantId, parentId, data) {
        const parent = await this.findOne(tenantId, parentId);
        if (!parent) {
            throw new Error(`Parent service #${parentId} not found`);
        }
        const subService = this.hospitalServiceRepository.create({
            ...data,
            tenantId,
            parentServiceId: parentId,
            level: parent.level + 1
        });
        return this.hospitalServiceRepository.save(subService);
    }
    async assignResponsible(tenantId, serviceId, role, agentId) {
        const service = await this.findOne(tenantId, serviceId);
        if (!service) {
            throw new Error(`Service #${serviceId} not found`);
        }
        service[`${role}Id`] = agentId;
        return this.hospitalServiceRepository.save(service);
    }
};
exports.HospitalServicesService = HospitalServicesService;
exports.HospitalServicesService = HospitalServicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(hospital_service_entity_1.HospitalService)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], HospitalServicesService);
//# sourceMappingURL=hospital-services.service.js.map