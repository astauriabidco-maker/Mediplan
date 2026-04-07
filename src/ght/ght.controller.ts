import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { GhtService } from './ght.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('ght')
@UseGuards(JwtAuthGuard)
export class GhtController {
    constructor(private readonly ghtService: GhtService) {}

    @Get()
    @Permissions('settings:all')
    async getGhts() {
        // Only accessible by Super Admins inside Settings
        return this.ghtService.findAll();
    }

    @Post()
    @Permissions('settings:all')
    async createGht(@Body() body: { name: string; region: string; contactEmail: string }) {
        return this.ghtService.createGht(body.name, body.region, body.contactEmail);
    }

    @Put(':id/toggle')
    @Permissions('settings:all')
    async toggleGht(@Param('id') id: string) {
        return this.ghtService.toggleStatus(id);
    }
}
