import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RolesService implements OnModuleInit {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) { }

    async onModuleInit() {
        // We'll seed this later via a controller or during bootstrap if needed, 
        // but better to keep it controlled.
    }

    async create(data: Partial<Role>): Promise<Role> {
        const role = this.roleRepository.create(data);
        return this.roleRepository.save(role);
    }

    async findAll(tenantId: string): Promise<Role[]> {
        return this.roleRepository.find({ where: { tenantId } });
    }

    async findOne(id: number, tenantId: string): Promise<Role | null> {
        return this.roleRepository.findOne({ where: { id, tenantId } });
    }

    async update(id: number, tenantId: string, data: Partial<Role>): Promise<Role | null> {
        await this.roleRepository.update({ id, tenantId }, data);
        return this.findOne(id, tenantId);
    }

    async remove(id: number, tenantId: string): Promise<void> {
        const role = await this.findOne(id, tenantId);
        if (role && !role.isSystem) {
            await this.roleRepository.delete(id);
        }
    }

    async seedDefaults(tenantId: string) {
        const defaults = [
            { name: 'ADMIN', description: 'Administrateur avec accès total', permissions: ['*'], isSystem: true, tenantId },
            { name: 'MANAGER', description: 'Gestionnaire d\'équipe', permissions: ['agents:read', 'services:read', 'planning:manage', 'leaves:validate'], isSystem: true, tenantId },
            { name: 'AGENT', description: 'Personnel hospitalier', permissions: ['profile:read', 'planning:read', 'leaves:request'], isSystem: true, tenantId },
        ];

        for (const d of defaults) {
            const existing = await this.roleRepository.findOne({ where: { name: d.name, tenantId } });
            if (!existing) {
                await this.create(d);
            }
        }
    }
}
