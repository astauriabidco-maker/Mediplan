import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, IsOptional, IsNumber } from 'class-validator';

export class CreateAgentDto {
    @IsString()
    @IsNotEmpty()
    nom: string;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    gender?: string;

    @IsString()
    @IsOptional()
    dateOfBirth?: string;

    @IsString()
    @IsOptional()
    placeOfBirth?: string;

    @IsString()
    @IsOptional()
    nationality?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    department?: string;

    @IsString()
    @IsOptional()
    jobTitle?: string;

    @IsString()
    @IsOptional()
    hiringDate?: string;

    @IsString()
    @IsOptional()
    contractType?: string;

    @IsString()
    @IsOptional()
    emergencyContactName?: string;

    @IsString()
    @IsOptional()
    emergencyContactPhone?: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    matricule: string;

    @IsPhoneNumber()
    telephone: string;

    password?: string;

    @IsNumber()
    @IsOptional()
    hospitalServiceId?: number;

    @IsNumber()
    @IsOptional()
    managerId?: number;
}
