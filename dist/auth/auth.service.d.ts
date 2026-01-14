import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
export declare class AuthService {
    private agentRepository;
    private jwtService;
    constructor(agentRepository: Repository<Agent>, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
    }>;
}
