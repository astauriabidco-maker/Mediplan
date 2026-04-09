import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { Facility } from '../../agents/entities/facility.entity';

export enum ShiftType {
    WORK = 'WORK',
    GARDE = 'GARDE',
    ASTREINTE = 'ASTREINTE',
}

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

    @Column({
        type: 'enum',
        enum: ShiftType,
        default: ShiftType.WORK,
    })
    type: ShiftType;

    @Column({ default: 'PLANNED' })
    status: string;

    @Column({ default: false })
    isSwapRequested: boolean;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @Column({ nullable: true })
    facilityId: number;

    @ManyToOne(() => Facility, { nullable: true })
    @JoinColumn({ name: 'facilityId' })
    facility: Facility;

    @ManyToOne(() => Agent, (agent) => agent.shifts)
    agent: Agent;
}
