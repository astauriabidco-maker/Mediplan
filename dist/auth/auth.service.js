"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const agent_entity_1 = require("../agents/entities/agent.entity");
const bcrypt = __importStar(require("bcrypt"));
const mail_service_1 = require("../mail/mail.service");
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    agentRepository;
    jwtService;
    mailService;
    constructor(agentRepository, jwtService, mailService) {
        this.agentRepository = agentRepository;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async inviteUser(email, roleId, tenantId) {
        const token = crypto.randomBytes(32).toString('hex');
        let agent = await this.agentRepository.findOne({ where: { email } });
        if (agent) {
            if (agent.status !== agent_entity_1.UserStatus.INVITED) {
                throw new Error('User already exists and is not in invited status');
            }
            agent.invitationToken = token;
            agent.roleId = roleId;
        }
        else {
            const name = email.split('@')[0];
            agent = this.agentRepository.create({
                email,
                nom: name,
                roleId,
                status: agent_entity_1.UserStatus.INVITED,
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
    async acceptInvite(token, password) {
        const agent = await this.agentRepository.findOne({
            where: { invitationToken: token },
            select: ['id', 'email', 'password', 'status', 'invitationToken', 'tenantId']
        });
        if (!agent) {
            throw new common_1.UnauthorizedException('Invalid or expired invitation token');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        agent.password = hashedPassword;
        agent.status = agent_entity_1.UserStatus.ACTIVE;
        agent.invitationToken = null;
        await this.agentRepository.save(agent);
        return this.login(agent);
    }
    async changePassword(agentId, oldPass, newPass) {
        const agent = await this.agentRepository.createQueryBuilder('agent')
            .addSelect('agent.password')
            .where('agent.id = :id', { id: agentId })
            .getOne();
        if (!agent || !agent.password) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isMatch = await bcrypt.compare(oldPass, agent.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid old password');
        }
        agent.password = await bcrypt.hash(newPass, 10);
        await this.agentRepository.save(agent);
    }
    async validateUser(email, pass) {
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
    async validate(payload) {
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
    async login(user) {
        const roleName = user.dbRole?.name || user.role;
        const permissions = user.dbRole?.permissions || [];
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
    async loginWithProSanteConnect(rpps, userinfo) {
        const agent = await this.agentRepository.findOne({
            where: [
                { matricule: rpps },
                { nir: rpps }
            ],
            relations: ['dbRole']
        });
        if (!agent) {
            throw new common_1.UnauthorizedException(`Aucun compte rattaché au RPPS ${rpps}. Accès refusé selon la norme Ségur.`);
        }
        if (agent.status !== agent_entity_1.UserStatus.ACTIVE) {
            throw new common_1.UnauthorizedException('Compte désactivé');
        }
        return this.login(agent);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(agent_entity_1.Agent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map