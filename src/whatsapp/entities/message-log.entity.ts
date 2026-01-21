import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum MessageDirection {
    INBOUND = 'INBOUND',
    OUTBOUND = 'OUTBOUND',
}

export enum MessageStatus {
    SENT = 'SENT',
    DELIVERED = 'DELIVERED',
    READ = 'READ',
    UNREAD = 'UNREAD',
}

@Entity()
export class MessageLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    from: string;

    @Column()
    to: string;

    @Column('text')
    content: string;

    @Column({
        type: 'enum',
        enum: MessageDirection,
    })
    direction: MessageDirection;

    @Column({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.UNREAD,
    })
    status: MessageStatus;

    @Column({ nullable: true })
    agentId: number;

    @ManyToOne(() => Agent, { nullable: true })
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @CreateDateColumn()
    timestamp: Date;
}
