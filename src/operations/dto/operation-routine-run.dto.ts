import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
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
  OperationRoutineRunArtifact,
  OperationRoutineRunStatus,
} from '../entities/operation-routine-run.entity';

export class RecordOperationRoutineRunDto {
  @IsString()
  @MaxLength(120)
  routine: string;

  @IsEnum(OperationRoutineRunStatus)
  status: OperationRoutineRunStatus;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  error?: string;

  @IsOptional()
  @IsArray()
  artifacts?: OperationRoutineRunArtifact[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class OperationRoutineRunQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  routine?: string;

  @IsOptional()
  @IsEnum(OperationRoutineRunStatus)
  status?: OperationRoutineRunStatus;

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
