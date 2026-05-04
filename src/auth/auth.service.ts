import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, UserRole, UserStatus } from '../agents/entities/agent.entity';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import { getDefaultPermissionsForRole } from './permissions';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async inviteUser(email: string, roleId: number, tenantId: string): Promise<Agent> {
        const token = crypto.randomBytes(32).toString('hex');

        // Check if user already exists
        let agent = await this.agentRepository.findOne({ where: { email } });

        if (agent) {
            if (agent.status !== UserStatus.INVITED) {
                throw new Error('User already exists and is not in invited status');
            }
            // Update existing invited user with new token/role
            agent.invitationToken = token;
            agent.roleId = roleId;
        } else {
            // Create new user (Agent entity)
            const name = email.split('@')[0];
            agent = this.agentRepository.create({
                email,
                nom: name,
                roleId,
                status: UserStatus.INVITED,
                invitationToken: token,
                tenantId,
                matricule: `INV-${Date.now()}`,
                telephone: 'N/A',
            });
        }

        await this.agentRepository.save(agent);
        await this.mailService.sendInvitation(email, token);

        return agent;
    }

    async acceptInvite(token: string, password: string): Promise<any> {
        const agent = await this.agentRepository.findOne({
            where: { invitationToken: token },
            select: ['id', 'email', 'password', 'status', 'invitationToken', 'tenantId']
        });

        if (!agent) {
            throw new UnauthorizedException('Invalid or expired invitation token');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        agent.password = hashedPassword;
        agent.status = UserStatus.ACTIVE;
        agent.invitationToken = null;

        await this.agentRepository.save(agent);

        return this.login(agent);
    }

    async changePassword(agentId: number, oldPass: string, newPass: string): Promise<void> {
        const agent = await this.agentRepository.createQueryBuilder('agent')
            .addSelect('agent.password')
            .where('agent.id = :id', { id: agentId })
            .getOne();

        if (!agent || !agent.password) {
            throw new UnauthorizedException('User not found');
        }

        const isMatch = await bcrypt.compare(oldPass, agent.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid old password');
        }

        agent.password = await bcrypt.hash(newPass, 10);
        await this.agentRepository.save(agent);
    }

    async validateUser(email: string, pass: string): Promise<any> {
        // Explicitly select password as it is hidden by default
        const user = await this.agentRepository.createQueryBuilder('agent')
            .addSelect('agent.password')
            .leftJoinAndSelect('agent.dbRole', 'role')
            .where('agent.email = :email', { email })
            .getOne();

        if (!user || !user.password) {
            return null;
        }

        const isMatch = await bcrypt.compare(pass, user.password);

        if (isMatch) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async validate(payload: any) {
        const userId = payload.sub;
        const tenantId = payload.tenant;

        return {
            id: userId,
            userId,
            sub: userId,
            email: payload.username,
            tenantId,
            tenant: tenantId,
            role: payload.role
        };
    }

    async login(user: any) {
        const roleName = user.dbRole?.name || user.role;
        const permissions = user.dbRole?.permissions?.length
            ? user.dbRole.permissions
            : getDefaultPermissionsForRole(roleName);

        const payload = {
            username: user.email,
            sub: user.id,
            tenant: user.tenantId || 'DEFAULT_TENANT',
            role: roleName,
            permissions: permissions,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                tenantId: user.tenantId || 'DEFAULT_TENANT',
                role: roleName,
                permissions: permissions,
            },
        };
    }

    // SSO Ségur de la Santé (Pro Santé Connect) - Mock Implementation
    async loginWithProSanteConnect(rpps: string, userinfo: any) {
        // En vrai: Vérifier la signature du token OIDC Ségur
        // Rechercher l'agent correspondant via son NIR/RPPS (ici stocké dans nir ou matricule)
        const agent = await this.agentRepository.findOne({
            where: [
                { matricule: rpps },
                { nir: rpps }
            ],
            relations: ['dbRole']
        });

        if (!agent) {
             throw new UnauthorizedException(`Aucun compte rattaché au RPPS ${rpps}. Accès refusé selon la norme Ségur.`);
        }

        if (agent.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Compte désactivé');
        }

        // Connexion réussie, création du JWT interne
        return this.login(agent);
    }
}
