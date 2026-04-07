import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum DocumentType {
    CONTRACT = 'CONTRACT',
    AVENANT = 'AVENANT',
    PAYSLIP = 'PAYSLIP',
    CERTIFICATE = 'CERTIFICATE',
    OTHER = 'OTHER'
}

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
        enum: DocumentType,
        default: DocumentType.OTHER
    })
    type: DocumentType;

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
