import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationRoutineRunStatus {
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export interface OperationRoutineRunArtifact {
  type?: string;
  label?: string;
  url?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

@Entity()
@Index(['tenantId', 'routine', 'startedAt'])
@Index(['tenantId', 'status', 'startedAt'])
export class OperationRoutineRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 120 })
  routine: string;

  @Column({ type: 'varchar', length: 24 })
  status: OperationRoutineRunStatus;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', nullable: true })
  artifacts: OperationRoutineRunArtifact[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
