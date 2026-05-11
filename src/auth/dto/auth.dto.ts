import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class SegurCallbackDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 64)
  @Matches(/^[A-Za-z0-9._-]+$/)
  rpps: string;

  @IsOptional()
  @IsObject()
  userinfo?: Record<string, unknown>;
}

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  tenantId?: string;
}

export class AcceptInviteDto {
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]+$/i)
  token: string;

  @IsString()
  @MinLength(12)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  oldPass: string;

  @IsString()
  @MinLength(12)
  newPass: string;
}

export class StartTenantImpersonationDto {
  @IsString()
  @Length(1, 80)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  targetTenantId: string;

  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}

export class StopTenantImpersonationDto {
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}
