import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Agent } from './agent.entity';

export enum AlertSeverity {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

export enum AlertType {
    QVT_FATIGUE = 'QVT_FATIGUE',
    COMPLIANCE = 'COMPLIANCE',
    GPEC = 'GPEC'
}

@Entity()
export class AgentAlert {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    agentId: number;

    @ManyToOne(() => Agent, agent => agent.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @Column({
        type: 'enum',
        enum: AlertType
    })
    type: AlertType;

    @Column({
        type: 'enum',
        enum: AlertSeverity
    })
    severity: AlertSeverity;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; 

    @Column({ default: false })
    isAcknowledged: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
