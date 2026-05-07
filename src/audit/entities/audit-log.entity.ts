import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum AuditAction {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    VALIDATE = 'VALIDATE',
    REJECT = 'REJECT',
    AUTO_GENERATE = 'AUTO_GENERATE',
}

export enum AuditEntityType {
    SHIFT = 'SHIFT',
    LEAVE = 'LEAVE',
    PLANNING = 'PLANNING',
    AGENT = 'AGENT',
    CONTRACT = 'CONTRACT',
    PAYROLL = 'PAYROLL',
    DOCUMENT = 'DOCUMENT',
    HOSPITAL_SERVICE = 'HOSPITAL_SERVICE',
    WORK_POLICY = 'WORK_POLICY',
    OPERATION_INCIDENT = 'OPERATION_INCIDENT',
}

@Entity()
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    timestamp: Date;

    @Column()
    actorId: number;

    @ManyToOne(() => Agent)
    @JoinColumn({ name: 'actorId' })
    actor: Agent;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action: AuditAction;

    @Column({
        type: 'enum',
        enum: AuditEntityType,
    })
    entityType: AuditEntityType;

    @Column({ nullable: true })
    entityId: string;

    @Column({ type: 'jsonb', nullable: true })
    details: any;

    @Column()
    tenantId: string;

    @Column({ nullable: true })
    chainSequence: number;

    @Column({ nullable: true })
    previousHash: string;

    @Column({ nullable: true })
    eventHash: string;
}
