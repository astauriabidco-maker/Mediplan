import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

// Document Types are now dynamically provided via configuration settings.
// They used to be a strict Enum.

export enum DocumentStatus {
    DRAFT = 'DRAFT',
    PENDING_SIGNATURE = 'PENDING_SIGNATURE',
    SIGNED = 'SIGNED',
    ARCHIVED = 'ARCHIVED'
}

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tenantId: string;

    @Column()
    title: string;

    @Column({
        type: 'varchar',
        default: 'Autre'
    })
    type: string;

    @Column({
        type: 'varchar',
        enum: DocumentStatus,
        default: DocumentStatus.DRAFT
    })
    status: DocumentStatus;

    @Column()
    fileUrl: string; // Either absolute URL or relative path to local uploads

    @ManyToOne(() => Agent)
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column({ nullable: true })
    agentId: number;

    @Column({ nullable: true })
    otpSecret: string; // Temporarily stores the expected OTP for signing

    @Column({ nullable: true, unique: true })
    publicToken: string; // UUID for external signing link

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
