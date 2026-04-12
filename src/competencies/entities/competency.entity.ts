import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AgentCompetency } from './agent-competency.entity';

export enum CompetencyType {
    SKILL = 'SKILL',
    LEGAL_CERTIFICATION = 'LEGAL_CERTIFICATION',
    CACES = 'CACES',
    OTHER = 'OTHER'
}

@Entity()
export class Competency {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    category: string;

    @Column({
        type: 'enum',
        enum: CompetencyType,
        default: CompetencyType.SKILL
    })
    type: CompetencyType;

    @Column({ default: false })
    isMandatoryToWork: boolean;

    @OneToMany(() => AgentCompetency, (agentCompetency) => agentCompetency.competency)
    agentCompetencies: AgentCompetency[];
}
