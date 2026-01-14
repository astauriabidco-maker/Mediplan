import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Agent } from './agent.entity';

@Entity()
export class HospitalService {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // e.g. Urgences, Cardiologie, Chirurgie

    @Column({ nullable: true })
    code: string; // e.g. URG, CARD

    @Column({ nullable: true })
    description: string;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    // HIÉRARCHIE DE SERVICES
    @ManyToOne(() => HospitalService, (service) => service.subServices, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parentServiceId' })
    parentService: HospitalService;

    @Column({ type: 'int', nullable: true })
    parentServiceId: number | null;

    @OneToMany(() => HospitalService, (service) => service.parentService)
    subServices: HospitalService[];

    @Column({ default: 1 })
    level: number; // 1 = Service principal, 2 = Sous-service, etc.

    // RESPONSABLES
    @ManyToOne(() => Agent, { nullable: true, eager: false })
    @JoinColumn({ name: 'chiefId' })
    chief: Agent; // Chef de service

    @Column({ type: 'int', nullable: true })
    chiefId: number | null;

    @ManyToOne(() => Agent, { nullable: true, eager: false })
    @JoinColumn({ name: 'deputyChiefId' })
    deputyChief: Agent; // Adjoint au chef

    @Column({ type: 'int', nullable: true })
    deputyChiefId: number | null;

    @ManyToOne(() => Agent, { nullable: true, eager: false })
    @JoinColumn({ name: 'majorId' })
    major: Agent; // Major (Infirmier principal)

    @Column({ type: 'int', nullable: true })
    majorId: number | null;

    @ManyToOne(() => Agent, { nullable: true, eager: false })
    @JoinColumn({ name: 'nursingManagerId' })
    nursingManager: Agent; // Cadre infirmier

    @Column({ type: 'int', nullable: true })
    nursingManagerId: number | null;

    // CAPACITÉS
    @Column({ type: 'int', nullable: true })
    maxAgents: number | null; // Quota maximum

    @Column({ type: 'int', nullable: true })
    minAgents: number | null; // Minimum requis

    // AGENTS DU SERVICE
    @OneToMany(() => Agent, (agent) => agent.hospitalService)
    agents: Agent[];

    // MÉTADONNÉES
    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
