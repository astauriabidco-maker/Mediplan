import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HospitalService } from './entities/hospital-service.entity';

@Injectable()
export class HospitalServicesService {
    constructor(
        @InjectRepository(HospitalService)
        private hospitalServiceRepository: Repository<HospitalService>,
    ) { }

    async findAll(tenantId: string): Promise<HospitalService[]> {
        return this.hospitalServiceRepository.find({
            where: { tenantId },
            relations: ['agents', 'chief', 'deputyChief', 'major', 'nursingManager', 'parentService']
        });
    }

    async create(tenantId: string, data: Partial<HospitalService>): Promise<HospitalService> {
        const service = this.hospitalServiceRepository.create({
            ...data,
            tenantId
        });
        return this.hospitalServiceRepository.save(service);
    }

    async findOne(tenantId: string, id: number): Promise<HospitalService | null> {
        return this.hospitalServiceRepository.findOne({
            where: { id, tenantId },
            relations: ['agents', 'chief', 'deputyChief', 'major', 'nursingManager', 'parentService', 'subServices']
        });
    }

    async update(tenantId: string, id: number, data: Partial<HospitalService>): Promise<HospitalService> {
        const service = await this.findOne(tenantId, id);
        if (!service) {
            throw new Error(`Service #${id} not found`);
        }
        Object.assign(service, data);
        return this.hospitalServiceRepository.save(service);
    }

    async remove(tenantId: string, id: number): Promise<void> {
        const service = await this.findOne(tenantId, id);
        if (!service) {
            throw new Error(`Service #${id} not found`);
        }

        // Check if service has agents
        if (service.agents && service.agents.length > 0) {
            throw new Error(`Cannot delete service with ${service.agents.length} assigned agents`);
        }

        // Check if service has sub-services
        if (service.subServices && service.subServices.length > 0) {
            throw new Error(`Cannot delete service with ${service.subServices.length} sub-services`);
        }

        await this.hospitalServiceRepository.remove(service);
    }

    async getStats(tenantId: string) {
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

    // HIÉRARCHIE
    async getServiceTree(tenantId: string): Promise<HospitalService[]> {
        // Récupérer tous les services de niveau 1 (services principaux)
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

    async getServiceHierarchy(tenantId: string, serviceId: number) {
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

    async createSubService(tenantId: string, parentId: number, data: Partial<HospitalService>): Promise<HospitalService> {
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

    async assignResponsible(
        tenantId: string,
        serviceId: number,
        role: 'chief' | 'deputyChief' | 'major' | 'nursingManager',
        agentId: number | null
    ): Promise<HospitalService> {
        const service = await this.findOne(tenantId, serviceId);
        if (!service) {
            throw new Error(`Service #${serviceId} not found`);
        }

        // Update the responsible
        service[`${role}Id`] = agentId;
        return this.hospitalServiceRepository.save(service);
    }
}
