import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationsJournalEntryType {
  INCIDENT = 'INCIDENT',
  NOTIFICATION = 'NOTIFICATION',
  ACTION = 'ACTION',
  DECISION = 'DECISION',
  EVIDENCE = 'EVIDENCE',
}

export enum OperationsJournalEntrySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum OperationsJournalEntryStatus {
  RECORDED = 'RECORDED',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity()
@Index(['tenantId', 'type', 'occurredAt'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'relatedAuditLogId'])
export class OperationsJournalEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 24 })
  type: OperationsJournalEntryType;

  @Column({
    type: 'varchar',
    length: 24,
    default: OperationsJournalEntryStatus.RECORDED,
  })
  status: OperationsJournalEntryStatus;

  @Column({
    type: 'varchar',
    length: 16,
    default: OperationsJournalEntrySeverity.MEDIUM,
  })
  severity: OperationsJournalEntrySeverity;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  ownerId: number | null;

  @Column({ type: 'int' })
  createdById: number;

  @Column({ type: 'int', nullable: true })
  updatedById: number | null;

  @Column({ type: 'int', nullable: true })
  auditLogId: number | null;

  @Column({ type: 'int', nullable: true })
  relatedAuditLogId: number | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  relatedReference: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  evidenceUrl: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  evidenceLabel: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
