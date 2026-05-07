import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class OpsOnCallConfigQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsISO8601()
  activeAt?: string;
}

export class CreateOpsOnCallConfigDto {
  @IsString()
  @MaxLength(80)
  role: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  recipients: string[];

  @IsOptional()
  @IsISO8601()
  activeFrom?: string;

  @IsOptional()
  @IsISO8601()
  activeUntil?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateOpsOnCallConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  recipients?: string[];

  @IsOptional()
  @IsISO8601()
  activeFrom?: string | null;

  @IsOptional()
  @IsISO8601()
  activeUntil?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
