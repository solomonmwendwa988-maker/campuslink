import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) config: ConfigService, @Inject(PrismaService) private readonly prisma: PrismaService) {
    const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET must be set to at least 32 characters.');
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false, secretOrKey: secret });
  }
  async validate(payload: { sub: string; username: string; sid: string }) {
    const session = await this.prisma.refreshSession.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() }, user: { deletedAt: null, deactivatedAt: null } }, select: { user: { select: { id: true, username: true } } } });
    if (!session) throw new UnauthorizedException('Session is no longer active.');
    return { id: session.user.id, username: session.user.username };
  }
}
