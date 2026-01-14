import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AgentCompetency } from './agent-competency.entity';

@Entity()
export class Competency {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    category: string;

    @OneToMany(() => AgentCompetency, (agentCompetency) => agentCompetency.competency)
    agentCompetencies: AgentCompetency[];
}
