import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

@Entity('attendance_log')
export class Attendance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tenantId: string;

    @ManyToOne(() => Agent)
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column()
    type: 'IN' | 'OUT';

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column({ nullable: true })
    locationGPS: string; // If provided via WhatsApp

    @Column()
    source: string; // e.g. "WHATSAPP", "BADGEUSE"

    @CreateDateColumn()
    createdAt: Date;
}
