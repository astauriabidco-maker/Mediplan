import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

@Entity()
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'simple-array', nullable: true })
    permissions: string[]; // e.g. ['agents:read', 'agents:write', 'planning:all']

    @Column({ default: false })
    isSystem: boolean; // Protect default roles from deletion

    @Column()
    tenantId: string;

    @OneToMany(() => Agent, (agent) => agent.dbRole)
    agents: Agent[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
