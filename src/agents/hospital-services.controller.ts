import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { HospitalServicesService } from './hospital-services.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HospitalService } from './entities/hospital-service.entity';

@Controller('hospital-services')
@UseGuards(JwtAuthGuard)
export class HospitalServicesController {
    constructor(private readonly servicesService: HospitalServicesService) { }

    @Get()
    findAll(@Request() req: any) {
        return this.servicesService.findAll(req.user.tenantId);
    }

    @Get('stats')
    getStats(@Request() req: any) {
        return this.servicesService.getStats(req.user.tenantId);
    }

    @Get('tree')
    getTree(@Request() req: any) {
        return this.servicesService.getServiceTree(req.user.tenantId);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.servicesService.findOne(req.user.tenantId, id);
    }

    @Get(':id/hierarchy')
    getHierarchy(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.servicesService.getServiceHierarchy(req.user.tenantId, id);
    }

    @Post()
    create(@Request() req: any, @Body() data: Partial<HospitalService>) {
        return this.servicesService.create(req.user.tenantId, data);
    }

    @Post(':id/sub-service')
    createSubService(
        @Request() req: any,
        @Param('id', ParseIntPipe) parentId: number,
        @Body() data: Partial<HospitalService>
    ) {
        return this.servicesService.createSubService(req.user.tenantId, parentId, data);
    }

    @Put(':id')
    update(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() data: Partial<HospitalService>) {
        return this.servicesService.update(req.user.tenantId, id, data);
    }

    @Put(':id/assign-responsible')
    assignResponsible(
        @Request() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() data: { role: 'chief' | 'deputyChief' | 'major' | 'nursingManager'; agentId: number | null }
    ) {
        return this.servicesService.assignResponsible(req.user.tenantId, id, data.role, data.agentId);
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
        await this.servicesService.remove(req.user.tenantId, id);
        return { message: 'Service deleted successfully' };
    }
}
