import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductionSignoffKey {
  HR = 'HR',
  SECURITY = 'SECURITY',
  OPERATIONS = 'OPERATIONS',
  TECHNICAL = 'TECHNICAL',
  DIRECTION = 'DIRECTION',
}

export enum ProductionSignoffStatus {
  PENDING = 'PENDING',
  GO = 'GO',
  NO_GO = 'NO_GO',
}

@Entity()
@Index(['tenantId', 'key'], { unique: true })
export class ProductionSignoff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 32 })
  key: ProductionSignoffKey;

  @Column({
    type: 'varchar',
    length: 16,
    default: ProductionSignoffStatus.PENDING,
  })
  status: ProductionSignoffStatus;

  @Column({ nullable: true })
  signerName: string | null;

  @Column({ nullable: true })
  signerRole: string | null;

  @Column({ nullable: true })
  proofUrl: string | null;

  @Column({ nullable: true })
  proofLabel: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ nullable: true })
  signedById: number | null;

  @Column({ type: 'timestamp', nullable: true })
  signedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
