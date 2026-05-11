import {
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './authenticated-request';
import { canSelectTenantContext } from '../agents/entities/agent.entity';

export const TENANT_ROUTE_KEY = 'auth:tenant-route';
export const PLATFORM_ROUTE_KEY = 'auth:platform-route';

export const PLATFORM_ROLES = ['PLATFORM_SUPER_ADMIN', 'SUPER_ADMIN'] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export interface TenantRouteOptions {
  allowPlatformTenantOverride?: boolean;
  requestedTenantIdParam?: string;
}

export type TenantResolutionSource =
  | 'active-tenant'
  | 'platform-explicit-override';

export interface TenantResolution {
  tenantId: string;
  source: TenantResolutionSource;
}

export type TenantScopedRequest = AuthenticatedRequest & {
  tenantContext?: TenantResolution;
};

export const TenantRoute = (options: TenantRouteOptions = {}) =>
  SetMetadata(TENANT_ROUTE_KEY, options);

export const PlatformRoute = () => SetMetadata(PLATFORM_ROUTE_KEY, true);

export function isPlatformRole(role?: string | null): role is PlatformRole {
  return PLATFORM_ROLES.includes(role as PlatformRole);
}

export function hasActiveTenant(req: AuthenticatedRequest): boolean {
  return Boolean(req.user?.tenantId);
}

export function resolveTenantId(
  req: AuthenticatedRequest,
  requestedTenantId?: string | null,
): string {
  if (canSelectTenantContext(req.user.role) && requestedTenantId) {
    return requestedTenantId;
  }

  if (req.user.tenantId) {
    return req.user.tenantId;
  }

  throw new UnauthorizedException('Tenant actif requis pour cette route.');
}

export function resolveTenantRouteTenantId(
  req: AuthenticatedRequest,
  requestedTenantId?: string | null,
  options: TenantRouteOptions = {},
): TenantResolution {
  const normalizedRequestedTenantId = requestedTenantId?.trim();
  const activeTenantId = req.user?.tenantId;

  if (activeTenantId) {
    if (
      normalizedRequestedTenantId &&
      options.allowPlatformTenantOverride &&
      isPlatformRole(req.user.role)
    ) {
      return {
        tenantId: normalizedRequestedTenantId,
        source: 'platform-explicit-override',
      };
    }

    return {
      tenantId: activeTenantId,
      source: 'active-tenant',
    };
  }

  if (
    normalizedRequestedTenantId &&
    options.allowPlatformTenantOverride &&
    isPlatformRole(req.user?.role)
  ) {
    return {
      tenantId: normalizedRequestedTenantId,
      source: 'platform-explicit-override',
    };
  }

  throw new UnauthorizedException('Tenant actif requis pour cette route.');
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPlatformRoute = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPlatformRoute) {
      return true;
    }

    const options = this.reflector.getAllAndOverride<TenantRouteOptions>(
      TENANT_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const requestedTenantIdParam = options.requestedTenantIdParam ?? 'tenantId';
    const requestedTenantId = request.query?.[requestedTenantIdParam];

    if (Array.isArray(requestedTenantId)) {
      throw new ForbiddenException('Un seul tenant cible peut etre demande.');
    }

    request.tenantContext = resolveTenantRouteTenantId(
      request,
      typeof requestedTenantId === 'string' ? requestedTenantId : undefined,
      options,
    );

    return true;
  }
}
