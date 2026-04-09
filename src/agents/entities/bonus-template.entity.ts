import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class BonusTemplate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;

    @Column({ nullable: true })
    facilityId: number;

    @Column()
    name: string;

    @Column('float', { default: 0 })
    amount: number;

    @Column({ default: true })
    isTaxable: boolean;

    @Column({ nullable: true })
    description: string;
}
