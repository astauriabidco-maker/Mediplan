import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Contract } from './contract.entity';
import { BonusTemplate } from './bonus-template.entity';

@Entity()
export class ContractBonus {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Contract, contract => contract.bonuses, { onDelete: 'CASCADE' })
    contract: Contract;

    @ManyToOne(() => BonusTemplate, { onDelete: 'CASCADE' })
    bonusTemplate: BonusTemplate;

    @Column('float', { nullable: true })
    overrideAmount: number;
}
