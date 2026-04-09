import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Agent } from './agent.entity';
import { ContractBonus } from './contract-bonus.entity';

@Entity()
export class Contract {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    type: string;

    @Column()
    date_debut: Date;

    @Column('float')
    solde_conges: number;

    @Column('float', { nullable: true, default: 0 })
    baseSalary: number; // Salaire brut de base

    @Column('float', { nullable: true, default: 0 })
    hourlyRate: number; // Taux horaire de nuit/garde

    @ManyToOne(() => Agent, (agent) => agent.contracts, { onDelete: 'CASCADE' })
    agent: Agent;

    @OneToMany(() => ContractBonus, cb => cb.contract, { cascade: true })
    bonuses: ContractBonus[];
}
