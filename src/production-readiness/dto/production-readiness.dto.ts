import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  ProductionSignoffKey,
  ProductionSignoffStatus,
} from '../entities/production-signoff.entity';

export class UpsertProductionSignoffDto {
  @IsEnum(ProductionSignoffStatus)
  status: ProductionSignoffStatus;

  @ValidateIf(
    (dto: { status?: ProductionSignoffStatus }) =>
      dto.status !== ProductionSignoffStatus.PENDING,
  )
  @IsString()
  @MaxLength(160)
  signerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  signerRole?: string;

  @ValidateIf(
    (dto: { status?: ProductionSignoffStatus }) =>
      dto.status === ProductionSignoffStatus.GO,
  )
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  proofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  proofLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ProductionSignoffParamDto {
  @IsEnum(ProductionSignoffKey)
  key: ProductionSignoffKey;
}
