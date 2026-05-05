import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  ProductionGateKey,
  ProductionGateStatus,
} from '../entities/production-gate.entity';
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

export class UpsertProductionGateDto {
  @IsEnum(ProductionGateStatus)
  status: ProductionGateStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  source?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  checkedAt?: string;
}

export class ProductionGateParamDto {
  @IsEnum(ProductionGateKey)
  key: ProductionGateKey;
}
