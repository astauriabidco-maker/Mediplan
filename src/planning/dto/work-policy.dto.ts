import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateWorkPolicyDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ValidateIf((_, value) => value !== undefined && value !== null)
  hospitalServiceId?: number | null;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ValidateIf((_, value) => value !== undefined && value !== null)
  gradeId?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  restHoursAfterGuard?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  @IsOptional()
  maxGuardDuration?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  maxWeeklyHours?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  onCallCompensationPercent?: number;
}

export class UpdateWorkPolicyDto extends PartialType(CreateWorkPolicyDto) {}
