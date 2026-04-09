import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Agent } from './agent.entity';

export enum HealthRecordStatus {
    VALID = 'VALID',
    EXPIRING_SOON = 'EXPIRING_SOON', // Usually calculated dynamically, but can be forced
    EXPIRED = 'EXPIRED',
}

@Entity()
export class HealthRecord {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    agentId: number;

    @ManyToOne(() => Agent, agent => agent.healthRecords, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @Column()
    type: string; // VACCINE, MEDICAL_VISIT, EXAM, or Custom String

    @Column()
    title: string; // e.g. "Hépatite B", "Visite Annuelle"

    @Column({ type: 'date' })
    datePerformed: Date;

    @Column({ type: 'date', nullable: true })
    expirationDate: Date | null;

    @Column({ default: false })
    isMandatory: boolean; // Si true, bloque la planification si expiré

    @Column({
        type: 'enum',
        enum: HealthRecordStatus,
        default: HealthRecordStatus.VALID
    })
    status: HealthRecordStatus;

    @Column({ nullable: true })
    documentUrl: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
