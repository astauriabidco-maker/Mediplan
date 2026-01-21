import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Contract } from './contract.entity';
import { AgentCompetency } from '../../competencies/entities/agent-competency.entity';
import { Shift } from '../../planning/entities/shift.entity';
import { Leave } from '../../planning/entities/leave.entity';
import { HospitalService } from './hospital-service.entity';
import { Role } from '../../auth/entities/role.entity';
import { Grade } from './grade.entity';

export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    AGENT = 'AGENT',
}

export enum UserStatus {
    INVITED = 'INVITED',
    ACTIVE = 'ACTIVE',
    DISABLED = 'DISABLED',
}

@Entity()
export class Agent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.AGENT,
        nullable: true
    })
    role: UserRole;

    @Column({ nullable: true })
    roleId: number;

    @ManyToOne(() => Role, (role) => role.agents, { nullable: true })
    @JoinColumn({ name: 'roleId' })
    dbRole: Role;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.ACTIVE, // Existing users are active
    })
    status: UserStatus;

    @Column({ type: 'varchar', nullable: true, select: false })
    invitationToken: string | null;

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

    @Column({ nullable: true })
    hospitalServiceId: number;

    @ManyToOne(() => HospitalService, (service) => service.agents, { nullable: true })
    @JoinColumn({ name: 'hospitalServiceId' })
    hospitalService: HospitalService;

    @Column({ nullable: true })
    jobTitle: string; // Poste/Fonction

    @Column({ nullable: true })
    hiringDate: string; // ISO Date

    @Column({ nullable: true })
    contractType: string; // CDI, CDD, Stage

    // Identification RH Complète
    @Column({ nullable: true })
    birthName: string;

    @Column({ nullable: true })
    nir: string; // Numéro de Sécurité Sociale

    @Column({ nullable: true })
    maritalStatus: string; // Célibataire, Marié, PACS, Divorcé, Veuf

    @Column({ default: 0 })
    childrenCount: number;

    // Coordonnées Détaillées
    @Column({ nullable: true })
    street: string;

    @Column({ nullable: true })
    zipCode: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    personalEmail: string;

    // Détails Contractuels
    @Column({ type: 'float', default: 100 })
    workTimePercentage: number; // Quotité (ex: 80 pour 80%)

    @Column({ nullable: true })
    gradeLegacy: string; // Grade / Catégorie

    @Column({ nullable: true })
    step: string; // Échelon

    @Column({ nullable: true })
    index: string; // Indice (Majoré/Brut)

    @Column({ nullable: true })
    gradeId: number;

    @ManyToOne(() => Grade, (grade) => grade.agents, { nullable: true })
    @JoinColumn({ name: 'gradeId' })
    grade: Grade; // Relation vers l'entité Grade (Surcharge le champ string legacy 'grade' si présent)

    @Column({ nullable: true })
    contractEndDate: string; // Pour les CDD / Vacations

    // Informations Bancaires
    @Column({ nullable: true, select: false })
    iban: string;

    @Column({ nullable: true, select: false })
    bic: string;

    // Formation
    @Column({ nullable: true })
    mainDiploma: string;

    @Column({ nullable: true })
    diplomaYear: string;

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

