import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            tenantId: any;
            role: any;
            permissions: any;
        };
    }>;
    ssoSegurCallback(body: {
        rpps: string;
        userinfo?: any;
    }): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            tenantId: any;
            role: any;
            permissions: any;
        };
    }>;
    invite(body: {
        email: string;
        roleId: number;
        tenantId?: string;
    }, req: any): Promise<import("../agents/entities/agent.entity").Agent>;
    acceptInvite(body: {
        token: string;
        password: string;
    }): Promise<any>;
    changePassword(body: {
        oldPass: string;
        newPass: string;
    }, req: any): Promise<{
        success: boolean;
    }>;
}
