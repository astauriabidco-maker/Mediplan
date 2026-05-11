import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'SECRET_KEY_DEV', // Use env in production
        });
    }

    async validate(payload: any) {
        const userId = payload.sub;
        const tenantId = payload.tenant ?? null;

        return {
            id: userId,
            userId,
            sub: userId,
            email: payload.username,
            tenantId,
            tenant: tenantId,
            role: payload.role,
            permissions: payload.permissions || [],
            impersonation: payload.impersonation,
        };
    }
}
