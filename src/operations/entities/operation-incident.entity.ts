import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationIncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum OperationIncidentStatus {
  DECLARED = 'DECLARED',
  ASSIGNED = 'ASSIGNED',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface OperationIncidentEvidence {
  label: string;
  url: string;
  addedAt: string;
  addedById: number;
  type: 'DECLARATION' | 'ESCALATION' | 'RESOLUTION' | 'CLOSURE';
}

export interface OperationIncidentTimelineEntry {
  action:
    | 'DECLARE_INCIDENT'
    | 'ASSIGN_INCIDENT'
    | 'ESCALATE_INCIDENT'
    | 'RESOLVE_INCIDENT'
    | 'CLOSE_INCIDENT';
  at: string;
  actorId: number;
  note: string | null;
  fromStatus: OperationIncidentStatus | null;
  toStatus: OperationIncidentStatus;
  details: Record<string, unknown>;
}

@Entity()
@Index(['tenantId', 'status'])
@Index(['tenantId', 'severity'])
export class OperationIncident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 32 })
  severity: OperationIncidentSeverity;

  @Column({ type: 'varchar', length: 32 })
  status: OperationIncidentStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  impactedService: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  evidenceUrl: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  evidenceLabel: string | null;

  @Column({ type: 'int' })
  declaredById: number;

  @Column({ type: 'timestamp' })
  declaredAt: Date;

  @Column({ type: 'int', nullable: true })
  assignedToId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  escalatedToId: number | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  escalationReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  escalatedAt: Date | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  resolutionSummary: string | null;

  @Column({ type: 'int', nullable: true })
  resolvedById: number | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  closureSummary: string | null;

  @Column({ type: 'int', nullable: true })
  closedById: number | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  evidence: OperationIncidentEvidence[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  timeline: OperationIncidentTimelineEntry[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
