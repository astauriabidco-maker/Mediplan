import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncActionDto {
    @IsString()
    type: string;

    @IsNumber()
    timestamp: number;

    payload: any;
}

export class SyncBatchDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncActionDto)
    actions: SyncActionDto[];
}
