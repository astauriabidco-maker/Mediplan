import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from './entities/grade.entity';

@Injectable()
export class GradesService {
    constructor(
        @InjectRepository(Grade)
        private gradesRepository: Repository<Grade>,
    ) { }

    findAll(tenantId: string) {
        return this.gradesRepository.find({ where: { tenantId } });
    }

    create(tenantId: string, data: Partial<Grade>) {
        const grade = this.gradesRepository.create({ ...data, tenantId });
        return this.gradesRepository.save(grade);
    }

    update(tenantId: string, id: number, data: Partial<Grade>) {
        return this.gradesRepository.update({ id, tenantId }, data);
    }

    remove(tenantId: string, id: number) {
        return this.gradesRepository.delete({ id, tenantId });
    }
}
