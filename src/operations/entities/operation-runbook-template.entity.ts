import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  OperationsRunbookAction,
  OperationsRunbookEvidence,
  OperationsRunbookRequirement,
  OperationsRunbookSourceType,
  OperationsRunbookStep,
} from '../dto/operations-runbook.dto';

@Entity()
@Index(['active', 'sourceType'])
@Index(['tenantId', 'service', 'sourceType', 'type'])
@Index(['sourceType', 'type', 'version'])
export class OperationRunbookTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  service: string | null;

  @Column({ type: 'varchar', length: 24 })
  sourceType: OperationsRunbookSourceType;

  @Column({ type: 'varchar', length: 80, nullable: true })
  type: string | null;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps: OperationsRunbookStep[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  evidence: OperationsRunbookEvidence[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  actions: OperationsRunbookAction[];

  @Column({ type: 'jsonb', nullable: true })
  requiredPermissions: OperationsRunbookRequirement[] | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
