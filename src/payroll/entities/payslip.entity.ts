import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum PayslipStatus {
    DRAFT = 'DRAFT',
    VALIDATED = 'VALIDATED',
    PAID = 'PAID'
}

@Entity()
export class Payslip {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
    agent: Agent;

    @Column()
    month: number;

    @Column()
    year: number;

    @Column({ type: 'float', default: 0 })
    baseSalary: number; // Salaire indiciaire de base

    @Column({ type: 'float', default: 0 })
    allowances: number; // Primes (nuit, férié, astreintes...)

    @Column({
        type: 'simple-enum',
        enum: PayslipStatus,
        default: PayslipStatus.DRAFT
    })
    status: PayslipStatus;

    @Column({ type: 'jsonb', nullable: true })
    details: any; // Snapshot des variables ayant servi au calcul

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
