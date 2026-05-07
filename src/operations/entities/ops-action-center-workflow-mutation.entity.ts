import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  OpsActionCenterItemType,
  OpsActionCenterPriority,
  OpsActionCenterStatus,
  OpsActionCenterWorkflowAction,
} from '../dto/ops-action-center.dto';

export enum OpsActionCenterSourceEntity {
  OPERATIONAL_ALERT = 'OperationalAlert',
  OPERATION_INCIDENT = 'OperationIncident',
  OPERATIONS_JOURNAL_ENTRY = 'OperationsJournalEntry',
}

@Entity()
@Index(['tenantId', 'itemId', 'createdAt'])
@Index(['tenantId', 'sourceEntity', 'sourceId'])
export class OpsActionCenterWorkflowMutation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 240 })
  itemId: string;

  @Column({ type: 'varchar', length: 48 })
  itemType: OpsActionCenterItemType;

  @Column({ type: 'varchar', length: 48 })
  sourceEntity: OpsActionCenterSourceEntity;

  @Column({ type: 'int' })
  sourceId: number;

  @Column({ type: 'varchar', length: 24 })
  action: OpsActionCenterWorkflowAction;

  @Column({ type: 'int' })
  actorId: number;

  @Column({ type: 'int', nullable: true })
  assignedToId: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  priority: OpsActionCenterPriority | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  status: OpsActionCenterStatus | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  beforeState: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterState: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  auditLogId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
