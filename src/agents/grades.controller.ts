import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
    constructor(private readonly gradesService: GradesService) { }

    @Get()
    @Permissions('agents:read')
    findAll(@Request() req: any) {
        return this.gradesService.findAll(req.user.tenantId);
    }

    @Post()
    @Permissions('agents:write') // Requires admin/manager rights
    create(@Request() req: any, @Body() data: any) {
        return this.gradesService.create(req.user.tenantId, data);
    }

    @Put(':id')
    @Permissions('agents:write')
    update(@Request() req: any, @Param('id') id: number, @Body() data: any) {
        return this.gradesService.update(req.user.tenantId, id, data);
    }

    @Delete(':id')
    @Permissions('agents:write')
    remove(@Request() req: any, @Param('id') id: number) {
        return this.gradesService.remove(req.user.tenantId, id);
    }
}
