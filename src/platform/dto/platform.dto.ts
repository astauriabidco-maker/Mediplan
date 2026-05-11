import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../agents/entities/agent.entity';

export interface CreatePlatformTenantDto {
  id?: string;
  name?: string;
  region?: string;
  contactEmail?: string;
  isActive?: boolean;
}

export interface UpdatePlatformTenantDto {
  name?: string;
  region?: string;
  contactEmail?: string | null;
  isActive?: boolean;
}

export interface CreateTenantAdminDto {
  email?: string;
  fullName?: string;
  /** @deprecated Platform admin creation now sends an invitation token instead. */
  password?: string;
  role?: UserRole.ADMIN | UserRole.SUPER_ADMIN;
}

export const normalizeTenantId = (value: string): string => {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized || normalized.length < 3 || normalized.length > 80) {
    throw new BadRequestException('Tenant id must contain 3 to 80 characters');
  }

  return normalized;
};

export const assertNonEmptyString = (
  value: unknown,
  field: string,
  maxLength = 160,
): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${field} is required`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new BadRequestException(`${field} is too long`);
  }

  return normalized;
};

export const normalizeOptionalEmail = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('contactEmail must be a valid email');
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new BadRequestException('contactEmail must be a valid email');
  }
  return normalized;
};

export const normalizeRequiredEmail = (value: unknown): string => {
  const normalized = normalizeOptionalEmail(value);
  if (!normalized) {
    throw new BadRequestException('email is required');
  }
  return normalized;
};
