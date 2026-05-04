import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { AcceptInviteDto, ChangePasswordDto, InviteUserDto, LoginDto, SegurCallbackDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<unknown>;
    ssoSegurCallback(body: SegurCallbackDto): Promise<unknown>;
    invite(body: InviteUserDto, req: AuthenticatedRequest): Promise<import("../agents/entities/agent.entity").Agent>;
    acceptInvite(body: AcceptInviteDto): Promise<unknown>;
    changePassword(body: ChangePasswordDto, req: AuthenticatedRequest): Promise<{
        success: boolean;
    }>;
}
