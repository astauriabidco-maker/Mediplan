import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationalAlertType {
  SLO_BREACH = 'SLO_BREACH',
  BACKUP_STALE = 'BACKUP_STALE',
  BACKUP_EXPORT_FAILED = 'BACKUP_EXPORT_FAILED',
  AUDIT_CHAIN_INVALID = 'AUDIT_CHAIN_INVALID',
  CRITICAL_INCIDENT_OPEN = 'CRITICAL_INCIDENT_OPEN',
}

export enum OperationalAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum OperationalAlertStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

@Entity()
@Index(['tenantId', 'status'])
@Index(['tenantId', 'type'])
@Index(
  'IDX_operational_alert_open_dedup',
  ['tenantId', 'type', 'source', 'sourceReference'],
  {
    unique: true,
    where: `"status" = 'OPEN'`,
  },
)
export class OperationalAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 48 })
  type: OperationalAlertType;

  @Column({ type: 'varchar', length: 16 })
  severity: OperationalAlertSeverity;

  @Column({
    type: 'varchar',
    length: 16,
    default: OperationalAlertStatus.OPEN,
  })
  status: OperationalAlertStatus;

  @Column({ type: 'varchar', length: 120 })
  source: string;

  @Column({ type: 'varchar', length: 240 })
  sourceReference: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'timestamp' })
  openedAt: Date;

  @Column({ type: 'timestamp' })
  lastSeenAt: Date;

  @Column({ type: 'int', default: 1 })
  occurrenceCount: number;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  resolvedById: number | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  resolutionSummary: string | null;

  @Column({ type: 'int', nullable: true })
  createAuditLogId: number | null;

  @Column({ type: 'int', nullable: true })
  resolveAuditLogId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
