import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

@Entity()
export class Shift {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp' })
    start: Date;

    @Column({ type: 'timestamp' })
    end: Date;

    @Column()
    postId: string;

    @Column({ default: 'PLANNED' })
    status: string;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @ManyToOne(() => Agent, (agent) => agent.shifts)
    agent: Agent;
}
