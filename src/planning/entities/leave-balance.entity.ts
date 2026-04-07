import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { LeaveType } from './leave.entity';

@Entity()
export class LeaveBalance {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
    agent: Agent;

    @Column({
        type: 'simple-enum',
        enum: LeaveType,
        default: LeaveType.CONGE_ANNUEL
    })
    type: LeaveType;

    @Column()
    year: number;

    @Column({ type: 'float', default: 0 })
    allowance: number; // Jours acquis

    @Column({ type: 'float', default: 0 })
    consumed: number; // Jours posés et validés

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
