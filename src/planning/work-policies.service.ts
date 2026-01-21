import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkPolicy } from './entities/work-policy.entity';

@Injectable()
export class WorkPoliciesService {
    constructor(
        @InjectRepository(WorkPolicy)
        private workPoliciesRepository: Repository<WorkPolicy>,
    ) { }

    findAll(tenantId: string) {
        return this.workPoliciesRepository.find({
            where: { tenantId },
            relations: ['hospitalService', 'grade']
        });
    }

    create(tenantId: string, data: Partial<WorkPolicy>) {
        const policy = this.workPoliciesRepository.create({ ...data, tenantId });
        return this.workPoliciesRepository.save(policy);
    }

    update(tenantId: string, id: number, data: Partial<WorkPolicy>) {
        return this.workPoliciesRepository.update({ id, tenantId }, data);
    }

    remove(tenantId: string, id: number) {
        return this.workPoliciesRepository.delete({ id, tenantId });
    }
}
