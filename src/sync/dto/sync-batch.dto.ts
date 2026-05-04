import {
  IsArray,
  IsNumber,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncActionDto {
  @IsString()
  type: string;

  @IsNumber()
  timestamp: number;

  @IsObject()
  payload: Record<string, unknown>;
}

export class SyncBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncActionDto)
  actions: SyncActionDto[];
}
