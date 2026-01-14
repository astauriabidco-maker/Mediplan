import { Repository } from 'typeorm';
import { HospitalService } from './entities/hospital-service.entity';
export declare class HospitalServicesService {
    private hospitalServiceRepository;
    constructor(hospitalServiceRepository: Repository<HospitalService>);
    findAll(tenantId: string): Promise<HospitalService[]>;
    create(tenantId: string, data: Partial<HospitalService>): Promise<HospitalService>;
    findOne(tenantId: string, id: number): Promise<HospitalService | null>;
    update(tenantId: string, id: number, data: Partial<HospitalService>): Promise<HospitalService>;
    remove(tenantId: string, id: number): Promise<void>;
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
    createSubService(tenantId: string, parentId: number, data: Partial<HospitalService>): Promise<HospitalService>;
    assignResponsible(tenantId: string, serviceId: number, role: 'chief' | 'deputyChief' | 'major' | 'nursingManager', agentId: number | null): Promise<HospitalService>;
}
