import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { Shift } from './shift.entity';

export enum ShiftApplicationStatus {
    PENDING = 'PENDING',
    PENDING_GHT_APPROVAL = 'PENDING_GHT_APPROVAL',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

@Entity()
export class ShiftApplication {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
    shift: Shift;

    @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
    agent: Agent;

    @CreateDateColumn()
    appliedAt: Date;

    @Column({
        type: 'simple-enum',
        enum: ShiftApplicationStatus,
        default: ShiftApplicationStatus.PENDING
    })
    status: ShiftApplicationStatus;

    @Column({ type: 'float', nullable: true })
    score: number; // The computed intelligence score (Distance + Legal)

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
