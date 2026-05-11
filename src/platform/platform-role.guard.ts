import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../agents/entities/agent.entity';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class PlatformRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.role === UserRole.PLATFORM_SUPER_ADMIN) {
      return true;
    }

    throw new ForbiddenException('Platform super admin role required');
  }
}
