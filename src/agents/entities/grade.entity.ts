import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Agent } from './agent.entity';
import { WorkPolicy } from '../../planning/entities/work-policy.entity';

@Entity()
export class Grade {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string; // e.g., "Interne", "Infirmier", "Médecin Senior"

    @Column({ unique: true })
    code: string; // e.g., "INT", "IDE", "PH"

    @Column({ type: 'int', default: 0 })
    level: number; // For hierarchy or ordering (1 = Junior, 10 = Senior)

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @OneToMany(() => Agent, (agent) => agent.grade)
    agents: Agent[];

    @OneToMany(() => WorkPolicy, (policy) => policy.grade)
    workPolicies: WorkPolicy[];
}
