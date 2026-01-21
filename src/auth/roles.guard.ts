import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../agents/entities/agent.entity';
import { ROLES_KEY } from './roles.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

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

        // Check Roles
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        if (requiredRoles && requiredRoles.some((role) => user.role === role)) {
            return true;
        }

        // Check Permissions (support wildcard '*')
        if (requiredPermissions) {
            if (userPermissions.includes('*')) return true;
            return requiredPermissions.some((permission) => userPermissions.includes(permission));
        }

        return false;
    }
}
