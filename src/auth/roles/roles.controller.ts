import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @Roles('ADMIN')
    create(@Request() req: any, @Body() data: any) {
        return this.rolesService.create({ ...data, tenantId: req.user.tenantId });
    }

    @Get()
    findAll(@Request() req: any) {
        return this.rolesService.findAll(req.user.tenantId);
    }

    @Post('seed')
    @Roles('ADMIN')
    seed(@Request() req: any) {
        return this.rolesService.seedDefaults(req.user.tenantId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.rolesService.findOne(+id, req.user.tenantId);
    }

    @Patch(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Request() req: any, @Body() data: any) {
        return this.rolesService.update(+id, req.user.tenantId, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.rolesService.remove(+id, req.user.tenantId);
    }
}
