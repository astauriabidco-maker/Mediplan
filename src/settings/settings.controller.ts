import { Controller, Get, Post, Body, UseGuards, Request, Query, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { SettingsService, DEFAULTS } from './settings.service';
import { SettingType } from './entities/facility-setting.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @Permissions('settings:read')
    async getSettings(@Request() req: any, @Query('facilityId') facilityId?: string) {
        const tenantId = req.user.tenantId;
        const parsedFacilityId = facilityId ? parseInt(facilityId, 10) : undefined;
        
        const settings = await this.settingsService.getAllSettings(tenantId, parsedFacilityId);
        
        // Return existing settings, but also include defaults that haven't been overridden yet
        const defaults = DEFAULTS.map(d => ({
            key: d.key,
            value: d.value,
            type: d.type,
            description: d.description,
            facilityId: parsedFacilityId || null,
            tenantId,
            isDefault: true // Marker for UI
        }));

        const existingKeys = new Set(settings.map(s => s.key));
        const merged = [
            ...settings.map(s => ({ ...s, isDefault: false })),
            ...defaults.filter(d => !existingKeys.has(d.key))
        ];

        return merged;
    }

    @Post()
    @Permissions('settings:write') // Requires Admin rights
    async updateSetting(
        @Request() req: any, 
        @Body() body: { facilityId?: number, key: string, value: string, type: SettingType, description?: string }
    ) {
        return this.settingsService.upsertSetting(
            req.user.tenantId,
            body.facilityId || null,
            body.key,
            body.value,
            body.type,
            body.description
        );
    }
}
