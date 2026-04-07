import { Controller, Post, UseGuards, Body, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../agents/entities/agent.entity';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('sso/segur/callback')
    async ssoSegurCallback(@Body() body: { rpps: string; userinfo?: any }) {
        // En conditions réelles, ce endpoint recevrait un authorization_code 
        // qu'il échangerait contre un id_token contenant les claims RPPS/Userinfo.
        // Ici nous simulons la réception directe de l'identité vérifiée.
        return this.authService.loginWithProSanteConnect(body.rpps, body.userinfo);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    @Post('invite')
    async invite(@Body() body: { email: string; roleId: number; tenantId?: string }, @Request() req: any) {
        // SUPER_ADMIN can assign to any GHT; regular admins are locked to their own tenant
        const targetTenantId = (req.user.role === 'SUPER_ADMIN' && body.tenantId)
            ? body.tenantId
            : req.user.tenantId;
        return this.authService.inviteUser(body.email, body.roleId, targetTenantId);
    }

    @Post('accept-invite')
    async acceptInvite(@Body() body: { token: string; password: string }) {
        return this.authService.acceptInvite(body.token, body.password);
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    async changePassword(@Body() body: { oldPass: string; newPass: string }, @Request() req: any) {
        await this.authService.changePassword(req.user.id, body.oldPass, body.newPass);
        return { success: true };
    }
}
