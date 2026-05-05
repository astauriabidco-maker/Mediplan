import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductionGateKey {
  FREEZE = 'FREEZE',
  MIGRATION = 'MIGRATION',
  SEED = 'SEED',
  SMOKE = 'SMOKE',
  COMPLIANCE = 'COMPLIANCE',
  AUDIT = 'AUDIT',
  BACKUP = 'BACKUP',
}

export enum ProductionGateStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
}

@Entity()
@Index(['tenantId', 'key'], { unique: true })
export class ProductionGate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 32 })
  key: ProductionGateKey;

  @Column({
    type: 'varchar',
    length: 16,
    default: ProductionGateStatus.UNKNOWN,
  })
  status: ProductionGateStatus;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'varchar', nullable: true })
  evidenceUrl: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  updatedById: number | null;

  @Column({ type: 'timestamp', nullable: true })
  checkedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
