import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Agent } from './agent.entity';

export enum RelationshipType {
    SPOUSE = 'CONJOINT',
    CHILD = 'ENFANT',
    PARENT = 'PARENT',
    TUTOR = 'TUTEUR',
    OTHER = 'AUTRE',
}

export enum BeneficiaryStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

@Entity()
export class AgentBeneficiary {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    agentId: number;

    @ManyToOne(() => Agent, (agent) => agent.beneficiaries, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({
        type: 'enum',
        enum: RelationshipType,
        default: RelationshipType.CHILD,
    })
    relationship: RelationshipType;

    @Column({ nullable: true })
    dateOfBirth: string; // ISO Date

    @Column({ nullable: true })
    gender: string; // M, F

    @Column({ nullable: true })
    idCardNumber: string;

    @Column({ nullable: true })
    photoUrl: string;

    @Column({ nullable: true })
    proofDocumentUrl: string;

    @Column({
        type: 'enum',
        enum: BeneficiaryStatus,
        default: BeneficiaryStatus.PENDING
    })
    status: BeneficiaryStatus;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
