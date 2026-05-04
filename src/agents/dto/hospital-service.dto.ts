import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { RiskLevel } from '../entities/hospital-service.entity';

export class CreateHospitalServiceDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    facilityId?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    level?: number;

    @IsInt()
    @IsOptional()
    chiefId?: number | null;

    @IsInt()
    @IsOptional()
    deputyChiefId?: number | null;

    @IsInt()
    @IsOptional()
    majorId?: number | null;

    @IsInt()
    @IsOptional()
    nursingManagerId?: number | null;

    @IsInt()
    @Min(0)
    @IsOptional()
    maxAgents?: number | null;

    @IsInt()
    @Min(0)
    @IsOptional()
    minAgents?: number | null;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    is24x7?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    bedCapacity?: number;

    @IsString()
    @IsOptional()
    contactNumber?: string;

    @IsEnum(RiskLevel)
    @IsOptional()
    riskLevel?: RiskLevel;

    @IsObject()
    @IsOptional()
    coverageRules?: Record<string, unknown>;
}

export class UpdateHospitalServiceDto extends PartialType(CreateHospitalServiceDto) {}

export class AssignResponsibleDto {
    @IsIn(['chief', 'deputyChief', 'major', 'nursingManager'])
    role: 'chief' | 'deputyChief' | 'major' | 'nursingManager';

    @IsInt()
    @IsOptional()
    agentId: number | null;
}
