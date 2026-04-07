import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Shift } from './shift.entity';
import { Agent } from '../../agents/entities/agent.entity';

export enum ProposalType {
    REPLACEMENT = 'REPLACEMENT', // For conflicts or optimization
    STAFFING = 'STAFFING',       // For understaffing (filling vacant slots)
}

export enum ProposalStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
}

@Entity()
export class ShiftProposal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: ProposalType,
        default: ProposalType.REPLACEMENT,
    })
    type: ProposalType;

    @Column({
        type: 'enum',
        enum: ProposalStatus,
        default: ProposalStatus.PENDING,
    })
    status: ProposalStatus;

    @Column({ type: 'text', nullable: true })
    reason: string;

    @Column({ type: 'float', default: 0 })
    score: number;

    // The shift that needs resolution
    @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shiftId' })
    shift: Shift;

    @Column()
    shiftId: number;

    // The agent originally assigned (if any)
    @ManyToOne(() => Agent, { nullable: true })
    @JoinColumn({ name: 'originalAgentId' })
    originalAgent: Agent;

    @Column({ nullable: true })
    originalAgentId: number;

    // The agent proposed by the AI
    @ManyToOne(() => Agent)
    @JoinColumn({ name: 'suggestedAgentId' })
    suggestedAgent: Agent;

    @Column()
    suggestedAgentId: number;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @CreateDateColumn()
    createdAt: Date;
}
