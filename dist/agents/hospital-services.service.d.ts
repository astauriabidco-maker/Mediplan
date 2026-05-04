import { Repository } from 'typeorm';
import { HospitalService } from './entities/hospital-service.entity';
import { Agent } from './entities/agent.entity';
import { AuditService } from '../audit/audit.service';
import { CreateHospitalServiceDto, UpdateHospitalServiceDto } from './dto/hospital-service.dto';
export declare class HospitalServicesService {
    private hospitalServiceRepository;
    private agentRepository;
    private auditService;
    constructor(hospitalServiceRepository: Repository<HospitalService>, agentRepository: Repository<Agent>, auditService: AuditService);
    findAll(tenantId: string): Promise<HospitalService[]>;
    create(tenantId: string, data: CreateHospitalServiceDto, actorId: number): Promise<HospitalService>;
    findOne(tenantId: string, id: number): Promise<HospitalService>;
    update(tenantId: string, id: number, data: UpdateHospitalServiceDto, actorId: number): Promise<HospitalService>;
    remove(tenantId: string, id: number, actorId: number): Promise<void>;
    getStats(tenantId: string): Promise<{
        totalServices: number;
        services: {
            id: number;
            name: string;
            code: string;
            agentCount: number;
            level: number;
            hasChief: boolean;
        }[];
        totalAgents: number;
    }>;
    getServiceTree(tenantId: string): Promise<HospitalService[]>;
    getServiceHierarchy(tenantId: string, serviceId: number): Promise<HospitalService | null>;
    createSubService(tenantId: string, parentId: number, data: CreateHospitalServiceDto, actorId: number): Promise<HospitalService>;
    assignResponsible(tenantId: string, serviceId: number, role: 'chief' | 'deputyChief' | 'major' | 'nursingManager', agentId: number | null, actorId: number): Promise<HospitalService>;
    private getServiceOrThrow;
    private getAgentOrThrow;
    private assertUniqueServiceIdentity;
    private assertResponsibleAgentsBelongToTenant;
    private getAuditSnapshot;
}
