import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, isPlatformRole } from '../agents/entities/agent.entity';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { hasAnyPermission } from './permissions';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<(UserRole | string)[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles && !requiredPermissions) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        const userPermissions = user.permissions || [];

        // Check Roles - SUPER_ADMIN and ADMIN bypass all permission checks
        if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
            return true;
        }

        if (isPlatformRole(user.role) && requiredRoles?.includes(UserRole.PLATFORM_SUPER_ADMIN)) {
            return true;
        }

        if (requiredRoles && requiredRoles.some((role) => user.role === role)) {
            return true;
        }

        if (requiredPermissions) {
            return hasAnyPermission(userPermissions, requiredPermissions);
        }

        return false;
    }
}
