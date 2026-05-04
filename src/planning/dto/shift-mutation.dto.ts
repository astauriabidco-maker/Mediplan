import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftType } from '../entities/shift.entity';

export class OptimizeShiftDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;

  @IsString()
  @IsNotEmpty()
  requiredSkill: string;
}

export class OptimizePlanningDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => OptimizeShiftDto)
  shifts: OptimizeShiftDto[];
}

export class ShiftNeedDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;

  @IsString()
  @IsNotEmpty()
  postId: string;

  @IsInt()
  @IsPositive()
  @Max(100)
  count: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  requiredSkills?: string[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  facilityId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  serviceId?: number;

  @IsOptional()
  @IsString()
  serviceName?: string;
}

export class AutoScheduleDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ShiftNeedDto)
  needs: ShiftNeedDto[];
}

export class GeneratePlanningDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class CreateShiftDto {
  @IsInt()
  agentId: number;

  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;

  @IsString()
  @IsNotEmpty()
  postId: string;

  @IsEnum(ShiftType)
  @IsOptional()
  type?: ShiftType;

  @IsInt()
  @IsOptional()
  facilityId?: number;
}

export class UpdateShiftDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class PublishPlanningDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class ReassignShiftDto {
  @IsInt()
  @IsPositive()
  agentId: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  recommendationId?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  alertId?: number;
}

export class RequestReplacementDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  recommendationId?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  alertId?: number;
}

export class ResolvePlanningAlertDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  recommendationId?: string;
}

export class ApproveShiftExceptionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  recommendationId?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  alertId?: number;
}
