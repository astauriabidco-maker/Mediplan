import {
  Controller,
  Post,
  UseGuards,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../agents/entities/agent.entity';
import type { AuthenticatedRequest } from './authenticated-request';
import {
  AcceptInviteDto,
  ChangePasswordDto,
  InviteUserDto,
  LoginDto,
  SegurCallbackDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() body: LoginDto): Promise<unknown> {
    const user = (await this.authService.validateUser(
      body.email,
      body.password,
    )) as unknown;
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return (await this.authService.login(user)) as unknown;
  }

  @Post('sso/segur/callback')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async ssoSegurCallback(@Body() body: SegurCallbackDto): Promise<unknown> {
    // En conditions réelles, ce endpoint recevrait un authorization_code
    // qu'il échangerait contre un id_token contenant les claims RPPS/Userinfo.
    // Ici nous simulons la réception directe de l'identité vérifiée.
    return (await this.authService.loginWithProSanteConnect(
      body.rpps,
      body.userinfo,
    )) as unknown;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @Post('invite')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async invite(
    @Body() body: InviteUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // SUPER_ADMIN can assign to any GHT; regular admins are locked to their own tenant
    const targetTenantId =
      req.user.role === 'SUPER_ADMIN' && body.tenantId
        ? body.tenantId
        : req.user.tenantId;
    return this.authService.inviteUser(body.email, body.roleId, targetTenantId);
  }

  @Post('accept-invite')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async acceptInvite(@Body() body: AcceptInviteDto): Promise<unknown> {
    return (await this.authService.acceptInvite(
      body.token,
      body.password,
    )) as unknown;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.authService.changePassword(
      req.user.id,
      body.oldPass,
      body.newPass,
    );
    return { success: true };
  }
}
