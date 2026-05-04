import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ShiftType } from '../entities/shift.entity';

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
}

export class RequestReplacementDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResolvePlanningAlertDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveShiftExceptionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
