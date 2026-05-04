import { HospitalServicesService } from './hospital-services.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AssignResponsibleDto, CreateHospitalServiceDto, UpdateHospitalServiceDto } from './dto/hospital-service.dto';
export declare class HospitalServicesController {
    private readonly servicesService;
    constructor(servicesService: HospitalServicesService);
    findAll(req: AuthenticatedRequest, queryTenantId?: string): Promise<import("./entities/hospital-service.entity").HospitalService[]>;
    getStats(req: AuthenticatedRequest, queryTenantId?: string): Promise<{
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
    getTree(req: AuthenticatedRequest, queryTenantId?: string): Promise<import("./entities/hospital-service.entity").HospitalService[]>;
    findOne(req: AuthenticatedRequest, id: number): Promise<import("./entities/hospital-service.entity").HospitalService>;
    getHierarchy(req: AuthenticatedRequest, id: number): Promise<import("./entities/hospital-service.entity").HospitalService | null>;
    create(req: AuthenticatedRequest, data: CreateHospitalServiceDto): Promise<import("./entities/hospital-service.entity").HospitalService>;
    createSubService(req: AuthenticatedRequest, parentId: number, data: CreateHospitalServiceDto): Promise<import("./entities/hospital-service.entity").HospitalService>;
    update(req: AuthenticatedRequest, id: number, data: UpdateHospitalServiceDto): Promise<import("./entities/hospital-service.entity").HospitalService>;
    assignResponsible(req: AuthenticatedRequest, id: number, data: AssignResponsibleDto): Promise<import("./entities/hospital-service.entity").HospitalService>;
    remove(req: AuthenticatedRequest, id: number): Promise<{
        message: string;
    }>;
}
