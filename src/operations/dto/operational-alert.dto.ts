import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OperationalAlertSeverity,
  OperationalAlertStatus,
  OperationalAlertType,
} from '../entities/operational-alert.entity';

export class OperationalAlertFiltersDto {
  @IsOptional()
  @IsEnum(OperationalAlertType)
  type?: OperationalAlertType;

  @IsOptional()
  @IsEnum(OperationalAlertStatus)
  status?: OperationalAlertStatus;

  @IsOptional()
  @IsEnum(OperationalAlertSeverity)
  severity?: OperationalAlertSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  sourceReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class ResolveOperationalAlertDto {
  @IsString()
  @MaxLength(2000)
  resolutionSummary: string;
}

export class OperationalAlertParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class RaiseOperationalAlertDto {
  @IsEnum(OperationalAlertType)
  type: OperationalAlertType;

  @IsEnum(OperationalAlertSeverity)
  severity: OperationalAlertSeverity;

  @IsString()
  @MaxLength(120)
  source: string;

  @IsString()
  @MaxLength(240)
  sourceReference: string;

  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
