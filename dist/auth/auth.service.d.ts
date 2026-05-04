import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private agentRepository;
    private jwtService;
    private mailService;
    constructor(agentRepository: Repository<Agent>, jwtService: JwtService, mailService: MailService);
    inviteUser(email: string, roleId: number, tenantId: string): Promise<Agent>;
    acceptInvite(token: string, password: string): Promise<any>;
    changePassword(agentId: number, oldPass: string, newPass: string): Promise<void>;
    validateUser(email: string, pass: string): Promise<any>;
    validate(payload: any): Promise<{
        id: any;
        userId: any;
        sub: any;
        email: any;
        tenantId: any;
        tenant: any;
        role: any;
    }>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            tenantId: any;
            role: any;
            permissions: any;
        };
    }>;
    loginWithProSanteConnect(rpps: string, userinfo: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            tenantId: any;
            role: any;
            permissions: any;
        };
    }>;
}
