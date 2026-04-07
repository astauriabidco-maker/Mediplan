import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class PayrollVariable {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string; // e.g., VALEUR_POINT, PRIME_NUIT, PRIME_DIMANCHE

    @Column()
    description: string;

    @Column({ type: 'float' })
    value: number; // e.g., 4.92 (Euros), 10 (%)

    @Column({ type: 'boolean', default: false })
    isPercentage: boolean;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
