import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { HospitalService } from './entities/hospital-service.entity';
import { Agent } from './entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { CreateHospitalServiceDto, UpdateHospitalServiceDto } from './dto/hospital-service.dto';

@Injectable()
export class HospitalServicesService {
    constructor(
        @InjectRepository(HospitalService)
        private hospitalServiceRepository: Repository<HospitalService>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        private auditService: AuditService,
    ) { }

    async findAll(tenantId: string): Promise<HospitalService[]> {
        return this.hospitalServiceRepository.find({
            where: { tenantId },
            relations: ['agents', 'chief', 'deputyChief', 'major', 'nursingManager', 'parentService']
        });
    }

    async create(tenantId: string, data: CreateHospitalServiceDto, actorId: number): Promise<HospitalService> {
        await this.assertUniqueServiceIdentity(tenantId, data.name, data.code);
        await this.assertResponsibleAgentsBelongToTenant(tenantId, data);

        const service = this.hospitalServiceRepository.create({
            ...data,
            tenantId,
            level: data.level || 1,
        });
        const saved = await this.hospitalServiceRepository.save(service);

        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.CREATE,
            AuditEntityType.HOSPITAL_SERVICE,
            saved.id,
            this.getAuditSnapshot(saved),
        );

        return saved;
    }

    async findOne(tenantId: string, id: number): Promise<HospitalService> {
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

    async update(tenantId: string, id: number, data: UpdateHospitalServiceDto, actorId: number): Promise<HospitalService> {
        const service = await this.getServiceOrThrow(tenantId, id, ['agents', 'subServices']);
        await this.assertUniqueServiceIdentity(tenantId, data.name, data.code, id);
        await this.assertResponsibleAgentsBelongToTenant(tenantId, data);

        const before = this.getAuditSnapshot(service);
        Object.assign(service, data);
        service.tenantId = tenantId;

        const updated = await this.hospitalServiceRepository.save(service);
        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.UPDATE,
            AuditEntityType.HOSPITAL_SERVICE,
            updated.id,
            {
                updatedFields: Object.keys(data),
                before,
                after: this.getAuditSnapshot(updated),
            },
        );

        return updated;
    }

    async remove(tenantId: string, id: number, actorId: number): Promise<void> {
        const service = await this.getServiceOrThrow(tenantId, id, ['agents', 'subServices']);

        if (service.agents && service.agents.length > 0) {
            throw new BadRequestException(`Cannot disable service with ${service.agents.length} assigned agents`);
        }

        if (service.subServices && service.subServices.length > 0) {
            throw new BadRequestException(`Cannot disable service with ${service.subServices.length} sub-services`);
        }

        const before = this.getAuditSnapshot(service);
        service.isActive = false;
        const updated = await this.hospitalServiceRepository.save(service);

        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.DELETE,
            AuditEntityType.HOSPITAL_SERVICE,
            updated.id,
            {
                action: 'DISABLE_HOSPITAL_SERVICE',
                before,
                after: this.getAuditSnapshot(updated),
            },
        );
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

    async createSubService(tenantId: string, parentId: number, data: CreateHospitalServiceDto, actorId: number): Promise<HospitalService> {
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
        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.CREATE,
            AuditEntityType.HOSPITAL_SERVICE,
            saved.id,
            {
                ...this.getAuditSnapshot(saved),
                parentServiceId: parentId,
            },
        );

        return saved;
    }

    async assignResponsible(
        tenantId: string,
        serviceId: number,
        role: 'chief' | 'deputyChief' | 'major' | 'nursingManager',
        agentId: number | null,
        actorId: number,
    ): Promise<HospitalService> {
        const service = await this.getServiceOrThrow(tenantId, serviceId);

        if (agentId !== null) {
            await this.getAgentOrThrow(tenantId, agentId);
        }

        const before = this.getAuditSnapshot(service);
        service[`${role}Id`] = agentId;
        const updated = await this.hospitalServiceRepository.save(service);

        await this.auditService.log(
            tenantId,
            actorId,
            AuditAction.UPDATE,
            AuditEntityType.HOSPITAL_SERVICE,
            updated.id,
            {
                action: 'ASSIGN_RESPONSIBLE',
                role,
                agentId,
                before,
                after: this.getAuditSnapshot(updated),
            },
        );

        return updated;
    }

    private async getServiceOrThrow(tenantId: string, id: number, relations: string[] = []): Promise<HospitalService> {
        const service = await this.hospitalServiceRepository.findOne({
            where: { id, tenantId },
            relations,
        });

        if (!service) {
            throw new NotFoundException(`Service #${id} not found`);
        }

        return service;
    }

    private async getAgentOrThrow(tenantId: string, id: number): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id, tenantId },
        });

        if (!agent) {
            throw new NotFoundException(`Agent #${id} not found`);
        }

        return agent;
    }

    private async assertUniqueServiceIdentity(tenantId: string, name?: string, code?: string | null, excludeServiceId?: number) {
        if (name) {
            const existingName = await this.hospitalServiceRepository.findOne({
                where: {
                    tenantId,
                    name,
                    ...(excludeServiceId ? { id: Not(excludeServiceId) } : {}),
                },
            });

            if (existingName) {
                throw new ConflictException('Hospital service name already exists for this tenant');
            }
        }

        if (code) {
            const existingCode = await this.hospitalServiceRepository.findOne({
                where: {
                    tenantId,
                    code,
                    ...(excludeServiceId ? { id: Not(excludeServiceId) } : {}),
                },
            });

            if (existingCode) {
                throw new ConflictException('Hospital service code already exists for this tenant');
            }
        }
    }

    private async assertResponsibleAgentsBelongToTenant(tenantId: string, data: Partial<Pick<HospitalService, 'chiefId' | 'deputyChiefId' | 'majorId' | 'nursingManagerId'>>) {
        const responsibleIds = [
            data.chiefId,
            data.deputyChiefId,
            data.majorId,
            data.nursingManagerId,
        ].filter((id): id is number => typeof id === 'number');

        await Promise.all(responsibleIds.map((id) => this.getAgentOrThrow(tenantId, id)));
    }

    private getAuditSnapshot(service: HospitalService) {
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
}
