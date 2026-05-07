import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OperationsJournalEntrySeverity,
  OperationsJournalEntryStatus,
  OperationsJournalEntryType,
} from '../entities/operations-journal-entry.entity';

export class CreateOperationsJournalEntryDto {
  @IsEnum(OperationsJournalEntryType)
  type: OperationsJournalEntryType;

  @IsOptional()
  @IsEnum(OperationsJournalEntryStatus)
  status?: OperationsJournalEntryStatus;

  @IsOptional()
  @IsEnum(OperationsJournalEntrySeverity)
  severity?: OperationsJournalEntrySeverity;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  relatedAuditLogId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  relatedReference?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateOperationsJournalEntryDto {
  @IsOptional()
  @IsEnum(OperationsJournalEntryStatus)
  status?: OperationsJournalEntryStatus;

  @IsOptional()
  @IsEnum(OperationsJournalEntrySeverity)
  severity?: OperationsJournalEntrySeverity;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  relatedAuditLogId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  relatedReference?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class OperationsJournalQueryDto {
  @IsOptional()
  @IsEnum(OperationsJournalEntryType)
  type?: OperationsJournalEntryType;

  @IsOptional()
  @IsEnum(OperationsJournalEntryStatus)
  status?: OperationsJournalEntryStatus;

  @IsOptional()
  @IsEnum(OperationsJournalEntrySeverity)
  severity?: OperationsJournalEntrySeverity;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  relatedAuditLogId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  relatedReference?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
