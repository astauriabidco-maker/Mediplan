import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class IncomingMessageTextDto {
  @IsString()
  @IsNotEmpty()
  body: string;
}

class IncomingWhatsappMessageDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IncomingMessageTextDto)
  text?: IncomingMessageTextDto;

  @IsString()
  @IsNotEmpty()
  type: string;
}

class IncomingWhatsappStatusDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsString()
  @IsNotEmpty()
  recipient_id: string;
}

class IncomingWhatsappContactProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

class IncomingWhatsappContactDto {
  @ValidateNested()
  @Type(() => IncomingWhatsappContactProfileDto)
  profile: IncomingWhatsappContactProfileDto;

  @IsString()
  @IsNotEmpty()
  wa_id: string;
}

class IncomingWhatsappMetadataDto {
  @IsString()
  display_phone_number: string;

  @IsString()
  phone_number_id: string;
}

class IncomingWhatsappValueDto {
  @IsString()
  @IsIn(['whatsapp'])
  messaging_product: string;

  @ValidateNested()
  @Type(() => IncomingWhatsappMetadataDto)
  metadata: IncomingWhatsappMetadataDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncomingWhatsappContactDto)
  contacts?: IncomingWhatsappContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncomingWhatsappMessageDto)
  messages?: IncomingWhatsappMessageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncomingWhatsappStatusDto)
  statuses?: IncomingWhatsappStatusDto[];
}

class IncomingWhatsappChangeDto {
  @ValidateNested()
  @Type(() => IncomingWhatsappValueDto)
  value: IncomingWhatsappValueDto;

  @IsString()
  @IsNotEmpty()
  field: string;
}

class IncomingWhatsappEntryDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncomingWhatsappChangeDto)
  changes: IncomingWhatsappChangeDto[];
}

export class IncomingMessageDto {
  @IsString()
  @IsNotEmpty()
  object: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncomingWhatsappEntryDto)
  entry: IncomingWhatsappEntryDto[];
}

export class SendWhatsappMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
