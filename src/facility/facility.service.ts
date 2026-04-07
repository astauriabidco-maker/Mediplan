import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from '../agents/entities/facility.entity';

@Injectable()
export class FacilityService {
    constructor(
        @InjectRepository(Facility)
        private facilityRepo: Repository<Facility>,
    ) {}

    async create(tenantId: string, data: Partial<Facility>): Promise<Facility> {
        const facility = this.facilityRepo.create({
            ...data,
            tenantId,
        });
        return this.facilityRepo.save(facility);
    }

    async findAll(tenantId: string): Promise<Facility[]> {
        return this.facilityRepo.find({
            where: { tenantId },
            order: { name: 'ASC' },
        });
    }

    async findOne(id: number, tenantId: string): Promise<Facility> {
        const facility = await this.facilityRepo.findOne({
            where: { id, tenantId },
        });
        if (!facility) throw new NotFoundException('Établissement introuvable');
        return facility;
    }

    async update(id: number, tenantId: string, data: Partial<Facility>): Promise<Facility> {
        const facility = await this.findOne(id, tenantId);
        Object.assign(facility, data);
        return this.facilityRepo.save(facility);
    }

    async remove(id: number, tenantId: string): Promise<void> {
        const facility = await this.findOne(id, tenantId);
        await this.facilityRepo.remove(facility);
    }
}
