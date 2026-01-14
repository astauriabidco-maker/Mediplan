import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Contract } from './contract.entity';
import { AgentCompetency } from '../../competencies/entities/agent-competency.entity';
import { Shift } from '../../planning/entities/shift.entity';
import { Leave } from '../../planning/entities/leave.entity';
import { HospitalService } from './hospital-service.entity';

@Entity()
export class Agent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nom: string; // Used as Display Name or Full Name

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName: string;

    @Column({ nullable: true })
    gender: string; // M, F

    @Column({ nullable: true })
    dateOfBirth: string; // ISO Date

    @Column({ nullable: true })
    placeOfBirth: string;

    @Column({ nullable: true })
    nationality: string;

    @Column({ nullable: true })
    address: string;

    // Professional Info
    @Column({ nullable: true })
    department: string; // Legacy string service name

    @ManyToOne(() => HospitalService, (service) => service.agents, { nullable: true })
    @JoinColumn({ name: 'hospitalServiceId' })
    hospitalService: HospitalService;

    @Column({ nullable: true })
    jobTitle: string; // Poste/Fonction

    @Column({ nullable: true })
    hiringDate: string; // ISO Date

    @Column({ nullable: true })
    contractType: string; // CDI, CDD, Stage

    // Emergency Contact
    @Column({ nullable: true })
    emergencyContactName: string;

    @Column({ nullable: true })
    emergencyContactPhone: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    matricule: string;

    @Column()
    telephone: string;

    @Column({ select: false, nullable: true }) // Nullable for existing data
    password?: string;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    // Hierarchy (N+1)
    @Column({ nullable: true })
    managerId: number;

    @ManyToOne(() => Agent, (agent) => agent.subordinates, { nullable: true })
    @JoinColumn({ name: 'managerId' })
    manager: Agent;

    @OneToMany(() => Agent, (agent) => agent.manager)
    subordinates: Agent[];

    @OneToMany(() => Contract, (contract) => contract.agent)
    contracts: Contract[];

    @OneToMany(() => AgentCompetency, (agentCompetency) => agentCompetency.agent)
    agentCompetencies: AgentCompetency[];

    @OneToMany(() => Shift, (shift) => shift.agent)
    shifts: Shift[];

    @OneToMany(() => Leave, (leave) => leave.agent)
    leaves: Leave[];
}

