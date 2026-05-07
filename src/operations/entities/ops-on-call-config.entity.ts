import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['tenantId', 'role', 'enabled'])
@Index(['tenantId', 'priority'])
export class OpsOnCallConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 80 })
  role: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  recipients: string[];

  @Column({ type: 'timestamp', nullable: true })
  activeFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  activeUntil: Date | null;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int' })
  createdById: number;

  @Column({ type: 'int', nullable: true })
  updatedById: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
