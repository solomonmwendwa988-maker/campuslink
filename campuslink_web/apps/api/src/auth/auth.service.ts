import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangePasswordDto, ConfirmPasswordDto, LoginDto, RegisterDto } from './dto.js';
import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from './credentials.js';

const safeUser = { id: true, email: true, username: true, role: true, profile: { select: { fullName: true, university: { select: { name: true } }, campus: { select: { name: true } }, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true } } } satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(JwtService) private readonly jwt: JwtService, @Inject(ConfigService) private readonly config: ConfigService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null, deactivatedAt: null }, select: safeUser });
    if (!user) throw new UnauthorizedException('Your session is no longer valid. Please sign in again.');
    return { user };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const universitySlug = this.config.get('LAUNCH_UNIVERSITY_SLUG', 'university-of-kabianga');
    const campus = await this.prisma.campus.findFirst({ where: { name: { equals: dto.campus.trim(), mode: 'insensitive' }, university: { slug: universitySlug, active: true } }, include: { university: true } });
    if (!campus) throw new ConflictException('The selected campus is not currently available.');
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true, username: true } });
    if (existing) throw new ConflictException(existing.email === email ? 'An account already exists for this email.' : 'That username is already taken.');
    const passwordHash = await hashPassword(dto.password);
    try {
      const user = await this.prisma.user.create({ data: { email, username, passwordHash, profile: { create: { fullName: dto.name.trim(), universityId: campus.universityId, campusId: campus.id, course: dto.course.trim(), yearOfStudy: dto.year, bio: dto.bio?.trim() || null, photoUrl: dto.photoUrl ?? null, interests: dto.interests ?? [], skills: dto.skills ?? [] } } }, select: safeUser });
      return { user, emailVerified: false, verification: 'Email verification is not configured yet. Account is unverified.' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Email or username is already in use.');
      throw error;
    }
  }

  async login(dto: LoginDto, userAgent?: string) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }], deletedAt: null }, select: { ...safeUser, passwordHash: true, deactivatedAt: true, suspendedAt: true } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email/username or password.');
    if (user.suspendedAt) throw new UnauthorizedException('This account has been suspended. Contact CampusLink support if you believe this is a mistake.');
    const reactivated = Boolean(user.deactivatedAt);
    if (reactivated) await this.prisma.user.update({ where: { id: user.id }, data: { deactivatedAt: null } });
    const session = await this.createSession(user.id, user.username, userAgent);
    const { passwordHash: _passwordHash, deactivatedAt: _deactivatedAt, suspendedAt: _suspendedAt, ...publicUser } = user;
    return { user: publicUser, accessToken: session.accessToken, refreshToken: session.refreshToken, reactivated };
  }

  async refresh(token: string | undefined, userAgent?: string) {
    if (!token) throw new UnauthorizedException('Refresh session is missing.');
    const oldHash = hashOpaqueToken(token);
    const session = await this.prisma.refreshSession.findFirst({ where: { tokenHash: oldHash, revokedAt: null, expiresAt: { gt: new Date() }, user: { deletedAt: null, deactivatedAt: null, suspendedAt: null } }, include: { user: { select: { id: true, username: true } } } });
    if (!session) throw new UnauthorizedException('Refresh session has expired or was revoked.');
    const nextRefresh = createOpaqueToken();
    const changed = await this.prisma.refreshSession.updateMany({ where: { id: session.id, tokenHash: oldHash, revokedAt: null }, data: { tokenHash: hashOpaqueToken(nextRefresh), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), userAgent } });
    if (changed.count !== 1) throw new UnauthorizedException('Refresh session was already rotated.');
    return { accessToken: await this.signAccessToken(session.user.id, session.user.username, session.id), refreshToken: nextRefresh };
  }

  async logout(token: string | undefined) {
    if (token) await this.prisma.refreshSession.updateMany({ where: { tokenHash: hashOpaqueToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Signed out.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await verifyPassword(dto.currentPassword, user.passwordHash))) throw new UnauthorizedException('Current password is incorrect.');
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }), this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })]);
    return { message: 'Password changed. Sign in again on your devices.' };
  }

  async forgotPassword(_email: string) {
    // Deliberately generic response prevents account enumeration until a mail provider is configured.
    return { message: 'If an account matches that address, password recovery instructions will be sent when email delivery is enabled.' };
  }

  async sessions(userId: string) {
    const data = await this.prisma.refreshSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, expiresAt: true, userAgent: true } });
    return { data };
  }

  async revokeSession(userId: string, sessionId: string) {
    const changed = await this.prisma.refreshSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!changed.count) throw new NotFoundException('Session not found.');
    return { revoked: true };
  }

  async deactivate(userId: string, dto: ConfirmPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) throw new UnauthorizedException('Password is incorrect.');
    const now = new Date();
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { deactivatedAt: now } }), this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } })]);
    return { deactivated: true, message: 'Account deactivated. Sign in again to reactivate it.' };
  }

  async deleteAccount(userId: string, dto: ConfirmPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) throw new UnauthorizedException('Password is incorrect.');
    const now = new Date(); const anonymizedEmail = `deleted+${userId}@account.invalid`; const anonymizedUsername = `deleted_${userId.replaceAll('-', '')}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { email: anonymizedEmail, username: anonymizedUsername, deletedAt: now, deactivatedAt: now, emailVerifiedAt: null } });
      await tx.profile.update({ where: { userId }, data: { fullName: 'Deleted student', bio: null, photoUrl: null, coverUrl: null, interests: [], skills: [], isPrivate: true } });
      await tx.post.updateMany({ where: { authorId: userId, deletedAt: null }, data: { deletedAt: now } });
      await tx.comment.updateMany({ where: { authorId: userId, deletedAt: null }, data: { deletedAt: now } });
      await tx.listing.updateMany({ where: { sellerId: userId, deletedAt: null }, data: { deletedAt: now } });
      await tx.event.updateMany({ where: { ownerId: userId, deletedAt: null }, data: { deletedAt: now } });
      await tx.notification.deleteMany({ where: { recipientId: userId } });
      await tx.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    });
    return { deleted: true, message: 'Account personal data was anonymized and access revoked.' };
  }

  private async createSession(userId: string, username: string, userAgent?: string) {
    const refreshToken = createOpaqueToken();
    const session = await this.prisma.refreshSession.create({ data: { userId, tokenHash: hashOpaqueToken(refreshToken), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), userAgent: userAgent?.slice(0, 500) }, select: { id: true } });
    return { refreshToken, accessToken: await this.signAccessToken(userId, username, session.id) };
  }

  private signAccessToken(userId: string, username: string, sessionId: string) {
    const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    return this.jwt.signAsync({ sub: userId, username, sid: sessionId }, { secret, expiresIn: '15m' });
  }
}
