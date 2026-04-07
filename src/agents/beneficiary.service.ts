import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentBeneficiary } from './entities/beneficiary.entity';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from './dto/beneficiary.dto';

@Injectable()
export class BeneficiaryService {
    constructor(
        @InjectRepository(AgentBeneficiary)
        private beneficiaryRepo: Repository<AgentBeneficiary>,
    ) { }

    findAll(tenantId: string, agentId: number) {
        return this.beneficiaryRepo.find({
            where: { tenantId, agentId },
            order: { createdAt: 'DESC' },
        });
    }

    async create(tenantId: string, data: CreateBeneficiaryDto) {
        const beneficiary = this.beneficiaryRepo.create({
            ...data,
            tenantId,
        });
        return this.beneficiaryRepo.save(beneficiary);
    }

    async update(tenantId: string, id: number, data: UpdateBeneficiaryDto) {
        const beneficiary = await this.beneficiaryRepo.findOne({ where: { id, tenantId } });
        if (!beneficiary) throw new NotFoundException('Ayant-droit introuvable');
        
        Object.assign(beneficiary, data);
        return this.beneficiaryRepo.save(beneficiary);
    }

    async remove(tenantId: string, id: number) {
        const beneficiary = await this.beneficiaryRepo.findOne({ where: { id, tenantId } });
        if (!beneficiary) throw new NotFoundException('Ayant-droit introuvable');
        return this.beneficiaryRepo.remove(beneficiary);
    }

    // Special method for Super Admin or cross-tenant visibility if needed
    async findAllByAgent(agentId: number) {
        return this.beneficiaryRepo.find({
            where: { agentId },
            order: { createdAt: 'DESC' },
        });
    }
}
