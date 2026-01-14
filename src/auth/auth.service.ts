import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        console.log(`[AuthDebug] Attempting login for: ${email}`);

        // Explicitly select password as it is hidden by default
        const user = await this.agentRepository.createQueryBuilder('agent')
            .addSelect('agent.password')
            .where('agent.email = :email', { email })
            .getOne();

        if (!user) {
            console.log(`[AuthDebug] User not found: ${email}`);
            return null;
        }

        if (!user.password) {
            console.log(`[AuthDebug] User has no password set: ${email}`);
            return null;
        }

        const isMatch = await bcrypt.compare(pass, user.password);
        console.log(`[AuthDebug] Password match for ${email}: ${isMatch}`);

        if (isMatch) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = {
            username: user.email,
            sub: user.id,
            tenant: user.tenantId || 'DEFAULT_TENANT'
        };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
