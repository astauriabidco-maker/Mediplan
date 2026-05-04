import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
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

@Index('IDX_agent_alert_open_unique', ['tenantId', 'agentId', 'type', 'message'], { unique: true, where: '"isAcknowledged" = false AND "isResolved" = false' })
@Index('IDX_agent_alert_open_by_tenant_agent', ['tenantId', 'agentId', 'type', 'severity'], { where: '"isAcknowledged" = false AND "isResolved" = false' })
@Index('IDX_agent_alert_resolved_by_tenant', ['tenantId', 'isResolved', 'resolvedAt'])
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

    @Column({ default: false })
    isResolved: boolean;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date | null;

    @Column({ type: 'text', nullable: true })
    resolutionReason: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
