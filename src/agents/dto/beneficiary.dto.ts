import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { RelationshipType, BeneficiaryStatus } from '../entities/beneficiary.entity';

export class CreateBeneficiaryDto {
    @IsNumber()
    @IsNotEmpty()
    agentId: number;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsEnum(RelationshipType)
    relationship: RelationshipType;

    @IsString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsString()
    @IsOptional()
    idCardNumber?: string;

    @IsString()
    @IsOptional()
    photoUrl?: string;

    @IsString()
    @IsOptional()
    proofDocumentUrl?: string;

    @IsEnum(BeneficiaryStatus)
    @IsOptional()
    status?: BeneficiaryStatus;
}

export class UpdateBeneficiaryDto {
    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsEnum(RelationshipType)
    @IsOptional()
    relationship?: RelationshipType;

    @IsString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsString()
    @IsOptional()
    idCardNumber?: string;

    @IsString()
    @IsOptional()
    photoUrl?: string;

    @IsString()
    @IsOptional()
    proofDocumentUrl?: string;

    @IsEnum(BeneficiaryStatus)
    @IsOptional()
    status?: BeneficiaryStatus;
}
