import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contract_templates')
export class ContractTemplate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tenantId: string;

    @Column()
    title: string;

    @Column()
    type: string; // CDI, CDD, Temporary, Stage

    @Column({ type: 'text' })
    content: string; // HTML Template with variables like {{agent_name}}

    @Column({ type: 'simple-json', nullable: true })
    metadata: any; // Useful for storing required fields or versioning

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
