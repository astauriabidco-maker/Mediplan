import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OperationIncidentSeverity,
  OperationIncidentStatus,
} from '../entities/operation-incident.entity';

export class DeclareOperationIncidentDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  @MaxLength(4000)
  description: string;

  @IsEnum(OperationIncidentSeverity)
  severity: OperationIncidentSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  impactedService?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;
}

export class AssignOperationIncidentDto {
  @IsInt()
  @Min(1)
  assignedToId: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class EscalateOperationIncidentDto {
  @IsInt()
  @Min(1)
  escalatedToId: number;

  @IsString()
  @MaxLength(2000)
  reason: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;
}

export class ResolveOperationIncidentDto {
  @IsString()
  @MaxLength(2000)
  resolutionSummary: string;

  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;
}

export class CloseOperationIncidentDto {
  @IsString()
  @MaxLength(2000)
  closureSummary: string;

  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  evidenceLabel?: string;
}

export class OperationIncidentParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class OperationIncidentFiltersDto {
  @IsOptional()
  @IsEnum(OperationIncidentStatus)
  status?: OperationIncidentStatus;

  @IsOptional()
  @IsEnum(OperationIncidentSeverity)
  severity?: OperationIncidentSeverity;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToId?: number;
}

export class RunOperationalEscalationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  escalationUserId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  criticalUnassignedDelayMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  criticalUnresolvedDelayMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  highUnassignedDelayMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  highUnresolvedDelayMinutes?: number;

  @IsOptional()
  @IsISO8601()
  now?: string;
}
