import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum PayrollRuleType {
    ALLOWANCE = 'ALLOWANCE',
    DEDUCTION = 'DEDUCTION',
    TAX = 'TAX',
    CALCULATION = 'CALCULATION'
}

@Entity()
export class PayrollRule {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string; // Ex: 'Cotisation CNPS'

    @Column()
    code: string; // Identifier for the context, ex: 'CNPS_TAX'

    @Column({
        type: 'enum',
        enum: PayrollRuleType,
        default: PayrollRuleType.CALCULATION
    })
    type: PayrollRuleType;

    @Column()
    formula: string; // The literal math formula, e.g. min(GROSS_TAXABLE, 750000) * 0.042

    @Column({ nullable: true })
    condition: string; // Expression that must evaluate to true, e.g. baseSalary > 0

    @Column({ type: 'int', default: 1 })
    executionOrder: number; // Order must be respected (calculate GrossTaxable FIRST, then CNPS, then IRPP)

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 'DEFAULT_TENANT' })
    tenantId: string;
}
