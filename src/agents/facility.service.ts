import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from './entities/facility.entity';

@Injectable()
export class FacilityService {
    constructor(
        @InjectRepository(Facility)
        private facilityRepo: Repository<Facility>,
    ) { }

    findAll(tenantId: string) {
        return this.facilityRepo.find({
            where: { tenantId },
            order: { name: 'ASC' },
        });
    }

    async create(tenantId: string, data: Partial<Facility>) {
        const facility = this.facilityRepo.create({ ...data, tenantId });
        return this.facilityRepo.save(facility);
    }

    async update(tenantId: string, id: number, data: Partial<Facility>) {
        const facility = await this.facilityRepo.findOne({ where: { id, tenantId } });
        if (!facility) throw new NotFoundException('Site introuvable');
        Object.assign(facility, data);
        return this.facilityRepo.save(facility);
    }

    async remove(tenantId: string, id: number) {
        const facility = await this.facilityRepo.findOne({ where: { id, tenantId } });
        if (!facility) throw new NotFoundException('Site introuvable');
        return this.facilityRepo.remove(facility);
    }
}
