import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';
import { Document } from './document.entity';

@Entity('signature_logs')
export class SignatureLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Document)
    @JoinColumn({ name: 'documentId' })
    document: Document;

    @ManyToOne(() => Agent)
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column()
    ipAddress: string;

    @Column()
    userAgent: string;

    @Column()
    documentHash: string; // SHA-256 du document au moment de la signature

    @CreateDateColumn()
    signedAt: Date;
}
