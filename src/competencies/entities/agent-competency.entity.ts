import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { Competency } from './competency.entity';

@Entity()
export class AgentCompetency {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    level: number; // 1-4

    @Column({ type: 'timestamp', nullable: true })
    expirationDate: Date;

    @ManyToOne(() => Agent, (agent) => agent.agentCompetencies)
    agent: Agent;

    @ManyToOne(() => Competency, (competency) => competency.agentCompetencies)
    competency: Competency;
}
