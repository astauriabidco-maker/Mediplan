import { BadRequestException } from '@nestjs/common';

export interface UpdatePlatformSettingsDto {
  sessionDurationMinutes?: number;
  impersonationReasonRequired?: boolean;
  impersonationMinimumReasonLength?: number;
  tenantDefaults?: {
    region?: string;
    isActive?: boolean;
    contactEmail?: string | null;
  };
  adminCreationSecurity?: {
    requireInvitationAcceptance?: boolean;
    allowDirectPasswordProvisioning?: boolean;
    minimumPasswordLength?: number;
  };
}

export const normalizeBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${field} must be a boolean`);
  }
  return value;
};

export const normalizeInteger = (
  value: unknown,
  field: string,
  min: number,
  max: number,
): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BadRequestException(`${field} must be an integer`);
  }
  if (value < min || value > max) {
    throw new BadRequestException(`${field} must be between ${min} and ${max}`);
  }
  return value;
};

export const normalizeNullableEmail = (
  value: unknown,
  field: string,
): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a valid email`);
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new BadRequestException(`${field} must be a valid email`);
  }
  return normalized;
};

export const normalizeString = (
  value: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string => {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new BadRequestException(
      `${field} must contain ${minLength} to ${maxLength} characters`,
    );
  }
  return normalized;
};
