import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Agent } from './agent.entity';

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

    @ManyToOne(() => Agent, (agent) => agent.contracts)
    agent: Agent;
}
