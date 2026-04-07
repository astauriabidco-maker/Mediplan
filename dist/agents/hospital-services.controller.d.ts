import { HospitalServicesService } from './hospital-services.service';
import { HospitalService } from './entities/hospital-service.entity';
export declare class HospitalServicesController {
    private readonly servicesService;
    constructor(servicesService: HospitalServicesService);
    findAll(req: any, queryTenantId?: string): Promise<HospitalService[]>;
    getStats(req: any, queryTenantId?: string): Promise<{
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
    getTree(req: any, queryTenantId?: string): Promise<HospitalService[]>;
    findOne(req: any, id: number): Promise<HospitalService | null>;
    getHierarchy(req: any, id: number): Promise<HospitalService | null>;
    create(req: any, data: Partial<HospitalService>): Promise<HospitalService>;
    createSubService(req: any, parentId: number, data: Partial<HospitalService>): Promise<HospitalService>;
    update(req: any, id: number, data: Partial<HospitalService>): Promise<HospitalService>;
    assignResponsible(req: any, id: number, data: {
        role: 'chief' | 'deputyChief' | 'major' | 'nursingManager';
        agentId: number | null;
    }): Promise<HospitalService>;
    remove(req: any, id: number): Promise<{
        message: string;
    }>;
}
