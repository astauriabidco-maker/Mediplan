import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentStatus } from '../entities/document.entity';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  agentId: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  tenantId?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  fileUrl?: string;
}

export class RequestSignatureDto {
  @IsInt()
  @Min(1)
  agentId: number;
}

export class SignDocumentDto {
  @IsString()
  @Length(4, 12)
  @Matches(/^[0-9]+$/)
  otp: string;

  @IsInt()
  @Min(1)
  agentId: number;
}

export class PublicSignDocumentDto {
  @IsString()
  @Length(4, 12)
  @Matches(/^[0-9]+$/)
  otp: string;
}

export class CreateContractTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GenerateContractDto {
  @IsInt()
  @Min(1)
  agentId: number;

  @IsInt()
  @Min(1)
  templateId: number;
}
