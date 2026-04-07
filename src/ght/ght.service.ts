import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ght } from './entities/ght.entity';

@Injectable()
export class GhtService {
    constructor(
        @InjectRepository(Ght)
        private ghtRepo: Repository<Ght>,
    ) {}

    async createGht(name: string, region: string, contactEmail?: string): Promise<Ght> {
        // Generate a URL-friendly slug as the TenantID
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
        const id = `ght_${slug}_${Math.floor(100 + Math.random() * 900)}`;

        const newGht = this.ghtRepo.create({
            id,
            name,
            region,
            contactEmail,
            isActive: true
        });

        await this.ghtRepo.save(newGht);
        return newGht;
    }

    async findAll(): Promise<Ght[]> {
        return this.ghtRepo.find({ order: { createdAt: 'DESC' } });
    }

    async toggleStatus(id: string): Promise<Ght> {
        const doc = await this.ghtRepo.findOne({ where: { id } });
        if (!doc) throw new NotFoundException('GHT introuvable');
        
        doc.isActive = !doc.isActive;
        await this.ghtRepo.save(doc);
        return doc;
    }
}
