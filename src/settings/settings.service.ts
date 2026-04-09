import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { FacilitySetting, SettingType } from './entities/facility-setting.entity';

export interface DefaultSetting {
    key: string;
    value: string;
    type: SettingType;
    description: string;
}

export const DEFAULTS: DefaultSetting[] = [
    { key: 'planning.weekly_hours_limit', value: '48', type: SettingType.NUMBER, description: 'Heures max par semaine' },
    { key: 'planning.daily_rest_hours', value: '11', type: SettingType.NUMBER, description: 'Heures de repos minimum par jour' },
    { key: 'planning.max_guard_duration', value: '24', type: SettingType.NUMBER, description: 'Durée maximale d\'une garde' },
    { key: 'planning.beds_per_nurse_day', value: '10', type: SettingType.NUMBER, description: 'Ratio Lit/Agent de Jour' },
    { key: 'planning.beds_per_nurse_night', value: '15', type: SettingType.NUMBER, description: 'Ratio Lit/Agent de Nuit' },
    { key: 'planning.max_night_shifts_month', value: '5', type: SettingType.NUMBER, description: 'Max gardes de nuit par mois' },
    { key: 'whatsapp.enabled', value: 'true', type: SettingType.BOOLEAN, description: 'Activer les notifications WhatsApp' },
    { key: 'documents.categories', value: 'Contrat de Travail,Avenant de Garde,Fiche de Paie,Attestation de Formation,Arrêt Maladie,RIB,Autre', type: SettingType.STRING, description: 'Catégories valides pour le coffre-fort (Séparées par virgules)' },
    { key: 'ATTENDANCE_LATE_MARGIN_MINUTES', value: '15', type: SettingType.NUMBER, description: 'Tolérance de retard en minutes avant alerte' },
    { key: 'ATTENDANCE_GEOFENCE_RADIUS_METERS', value: '500', type: SettingType.NUMBER, description: 'Rayon de validation GPS (en mètres) pour le pointage WhatsApp' }
];

@Injectable()
export class SettingsService implements OnModuleInit {
    private readonly logger = new Logger(SettingsService.name);
    // In-memory cache: tenantId_facilityId_key -> value
    private cache = new Map<string, any>();

    constructor(
        @InjectRepository(FacilitySetting)
        private settingRepository: Repository<FacilitySetting>
    ) {}

    async onModuleInit() {
        this.logger.log('Initializing Settings Cache...');
        await this.refreshCache();
    }

    async refreshCache() {
        const settings = await this.settingRepository.find();
        this.cache.clear();
        for (const s of settings) {
            const cacheKey = this.getCacheKey(s.tenantId, s.facilityId, s.key);
            this.cache.set(cacheKey, this.parseValue(s.value, s.type));
        }
    }

    private getCacheKey(tenantId: string, facilityId: number | null | undefined, key: string): string {
        return `${tenantId}_${facilityId || 'GLOBAL'}_${key}`;
    }

    private parseValue(value: string, type: SettingType): any {
        switch (type) {
            case SettingType.NUMBER: return parseFloat(value);
            case SettingType.BOOLEAN: return value === 'true';
            case SettingType.JSON: return JSON.parse(value);
            default: return value;
        }
    }

    // Public method to get a setting quickly (synchronous via cache with lazy fallback)
    async getSetting(tenantId: string, facilityId: number | null, key: string): Promise<any> {
        const cacheKey = this.getCacheKey(tenantId, facilityId, key);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Check GLOBAL setting if specific facility is not found, or if we didn't specify one
        if (facilityId !== null) {
            const globalCacheKey = this.getCacheKey(tenantId, null, key);
            if (this.cache.has(globalCacheKey)) {
                return this.cache.get(globalCacheKey);
            }
        }

        // Fallback to default
        const defaultSetting = DEFAULTS.find(d => d.key === key);
        if (defaultSetting) {
            return this.parseValue(defaultSetting.value, defaultSetting.type);
        }

        return null; // Not found anywhere
    }

    // CRUD for Controller
    async getAllSettings(tenantId: string, facilityId?: number) {
        // Fetch specific or global
        return this.settingRepository.find({
            where: { tenantId, facilityId: facilityId ? facilityId : IsNull() }
        });
    }

    async upsertSetting(tenantId: string, facilityId: number | null, key: string, value: string, type: SettingType, description?: string) {
        let setting = await this.settingRepository.findOne({
            where: { tenantId, facilityId: facilityId ? facilityId : IsNull(), key }
        });

        if (!setting) {
            setting = this.settingRepository.create({
                tenantId,
                facilityId: facilityId || undefined,
                key,
                type,
                description
            });
        }

        setting.value = value;
        if (description) setting.description = description;

        await this.settingRepository.save(setting);
        await this.refreshCache();
        return setting;
    }
}
