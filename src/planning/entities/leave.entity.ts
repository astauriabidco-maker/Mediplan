import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum LeaveType {
    CONGE_ANNUEL = 'CONGE_ANNUEL',
    MALADIE = 'MALADIE',
    RECUPERATION = 'RECUPERATION',
    ABSENCE_INJUSTIFIEE = 'ABSENCE_INJUSTIFIEE',
    AUTRE = 'AUTRE'
}

export enum LeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

@Entity()
export class Leave {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp' })
    start: Date;

    @Column({ type: 'timestamp' })
    end: Date;

    @Column({
        type: 'simple-enum',
        enum: LeaveType,
        default: LeaveType.CONGE_ANNUEL
    })
    type: LeaveType;

    @Column({
        type: 'simple-enum',
        enum: LeaveStatus,
        default: LeaveStatus.PENDING
    })
    status: LeaveStatus;

    @Column({ nullable: true })
    reason: string;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @ManyToOne(() => Agent, (agent) => agent.leaves)
    agent: Agent;

    @ManyToOne(() => Agent, { nullable: true })
    approvedBy: Agent;

    @Column({ nullable: true })
    rejectionReason: string;

    // --- AI & Legal Audit ---
    @Column({ nullable: true, type: 'text' })
    aiRecommendation: string;

    @Column({ nullable: true, type: 'int' })
    aiScore: number;

    @Column({ default: false })
    isAutoRejected: boolean;
}
