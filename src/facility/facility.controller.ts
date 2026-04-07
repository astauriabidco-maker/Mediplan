import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../agents/entities/agent.entity';

@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilityController {
    constructor(private readonly facilityService: FacilityService) {}

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    create(@Request() req: any, @Body() data: any) {
        const tenantId = req.user.tenantId;
        return this.facilityService.create(tenantId, data);
    }

    @Get()
    findAll(@Request() req: any) {
        const tenantId = req.user.tenantId;
        return this.facilityService.findAll(tenantId);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        return this.facilityService.findOne(+id, tenantId);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
        const tenantId = req.user.tenantId;
        return this.facilityService.update(+id, tenantId, data);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    remove(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        return this.facilityService.remove(+id, tenantId);
    }
}
