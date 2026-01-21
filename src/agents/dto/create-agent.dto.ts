import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { UserRole, UserStatus } from '../entities/agent.entity';

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

    // HR Identification
    @IsString()
    @IsOptional()
    birthName?: string;

    @IsString()
    @IsOptional()
    nir?: string;

    @IsString()
    @IsOptional()
    maritalStatus?: string;

    @IsNumber()
    @IsOptional()
    childrenCount?: number;

    // Detailed Coordinates
    @IsString()
    @IsOptional()
    street?: string;

    @IsString()
    @IsOptional()
    zipCode?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsEmail()
    @IsOptional()
    personalEmail?: string;

    // Contractual Details
    @IsNumber()
    @IsOptional()
    workTimePercentage?: number;

    @IsString()
    @IsOptional()
    gradeLegacy?: string;

    @IsString()
    @IsOptional()
    step?: string;

    @IsString()
    @IsOptional()
    index?: string;

    @IsString()
    @IsOptional()
    contractEndDate?: string;

    // Financial
    @IsString()
    @IsOptional()
    iban?: string;

    @IsString()
    @IsOptional()
    bic?: string;

    // Education
    @IsString()
    @IsOptional()
    mainDiploma?: string;

    @IsString()
    @IsOptional()
    diplomaYear?: string;

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

    @IsNumber()
    @IsOptional()
    roleId?: number;

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
