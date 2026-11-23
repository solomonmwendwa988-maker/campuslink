import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async systemHealth() {
    const startedAt = Date.now();
    let database: 'connected' | 'unavailable' = 'connected';
    let databaseLatencyMs: number | null = null;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - startedAt;
    } catch {
      database = 'unavailable';
    }
    const memory = process.memoryUsage();
    return {
      status: database === 'connected' ? 'operational' : 'degraded',
      api: { status: 'running', uptimeSeconds: Math.floor(process.uptime()) },
      database: { status: database, latencyMs: databaseLatencyMs },
      runtime: { nodeVersion: process.version, memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal } },
      checkedAt: new Date().toISOString(),
    };
  }

  async activitySummary(hours = 24) {
    const safeHours = Math.max(1, Math.min(168, Math.floor(hours) || 24));
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    const [total, categories, outcomes, recentFailures] = await Promise.all([
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.activityEvent.groupBy({ by: ['category'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { category: 'desc' } } }),
      this.prisma.activityEvent.groupBy({ by: ['outcome'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.activityEvent.findMany({ where: { createdAt: { gte: since }, outcome: { in: ['FAILED', 'ERROR'] } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, eventType: true, category: true, outcome: true, createdAt: true } }),
    ]);
    return { windowHours: safeHours, since: since.toISOString(), total, byCategory: categories.map((row) => ({ category: row.category, count: row._count._all })), byOutcome: outcomes.map((row) => ({ outcome: row.outcome ?? 'UNSPECIFIED', count: row._count._all })), recentFailures };
  }

  async dashboard() {
    const [users, active, deactivated, posts, reports, pendingVerifications, verified, recentUsers, recentReports, recentAudit] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, deactivatedAt: null, suspendedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, OR: [{ deactivatedAt: { not: null } }, { suspendedAt: { not: null } }] } }),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      this.prisma.verificationRequest.count({ where: { status: VerificationStatus.PENDING } }),
      this.prisma.profile.count({ where: { verifiedAt: { not: null } } }),
      this.prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, username: true, email: true, role: true, deactivatedAt: true, suspendedAt: true, suspensionReason: true, emailVerifiedAt: true, createdAt: true, profile: { select: { fullName: true, photoUrl: true, verifiedAt: true, university: { select: { name: true } } } } } }),
      this.prisma.report.findMany({ where: { status: ReportStatus.OPEN }, orderBy: { createdAt: 'desc' }, take: 6, include: { reporter: { select: { username: true } } } }),
      this.prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    return { stats: { users, active, deactivated, posts, openReports: reports, pendingVerifications, verified }, recentUsers, recentReports, recentAudit };
  }

  async users(search = '', page = 1, limit = 25) {
    const safePage = Math.max(1, Math.floor(page)); const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
    const term = search.trim();
    const where: Prisma.UserWhereInput = { deletedAt: null, ...(term ? { OR: [{ username: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }, { profile: { fullName: { contains: term, mode: 'insensitive' } } }] } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (safePage - 1) * safeLimit, take: safeLimit, orderBy: { createdAt: 'desc' }, select: { id: true, username: true, email: true, role: true, deactivatedAt: true, suspendedAt: true, suspensionReason: true, emailVerifiedAt: true, createdAt: true, profile: { select: { fullName: true, photoUrl: true, verifiedAt: true, university: { select: { name: true } } } } } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) };
  }



  async userDetails(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true, emailVerifiedAt: true, deactivatedAt: true, suspendedAt: true, suspensionReason: true, profile: { select: { fullName: true, bio: true, course: true, yearOfStudy: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true, verifiedAt: true, university: { select: { name: true } }, campus: { select: { name: true } } } }, _count: { select: { posts: true, comments: true, likes: true, follows: true, followedBy: true, reports: true } } } });
    if (!user) throw new NotFoundException('Account not found.');
    const [recentPosts, recentComments] = await Promise.all([
      this.prisma.post.findMany({ where: { authorId: userId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, content: true, createdAt: true, _count: { select: { likes: true, comments: true } } } }),
      this.prisma.comment.findMany({ where: { authorId: userId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 12, select: { id: true, content: true, createdAt: true, _count: { select: { likes: true, replies: true } }, post: { select: { id: true, content: true, author: { select: { username: true } } } } } }),
    ]);
    return { ...user, counts: { posts: user._count.posts, comments: user._count.comments, likes: user._count.likes, followers: user._count.follows, following: user._count.followedBy, reportsSubmitted: user._count.reports }, recentPosts: recentPosts.map(p => ({ id: p.id, content: p.content, createdAt: p.createdAt, likes: p._count.likes, comments: p._count.comments })), recentComments: recentComments.map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt, likes: c._count.likes, replies: c._count.replies, post: c.post })) };
  }
  async setAccountStatus(actorId: string, targetId: string, disabled: boolean, reason?: string) {
    if (actorId === targetId) throw new BadRequestException('You cannot disable your own admin account.');
    const target = await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, username: true, role: true, suspendedAt: true } });
    if (!target) throw new NotFoundException('Account not found.');
    if (target.role === 'SUPER_ADMIN') throw new ForbiddenException('Super Admin accounts cannot be disabled from this panel.');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: targetId }, data: { suspendedAt: disabled ? now : null, suspensionReason: disabled ? reason?.trim().slice(0, 500) || null : null } });
      if (disabled) await tx.refreshSession.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: now } });
      await tx.adminAuditLog.create({ data: { actorId, action: disabled ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED', entityType: 'USER', entityId: targetId, metadata: { username: target.username, reason: reason?.trim() || null } } });
    });
    return { id: targetId, suspended: disabled };
  }

  async changeRole(actorId: string, actorRole: string, targetId: string, role: string) {
    if (actorRole !== 'SUPER_ADMIN') throw new ForbiddenException('Only Super Admin can change administrator roles.');
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) throw new BadRequestException('Unsupported role. Super Admin elevation is bootstrap-only.');
    if (actorId === targetId) throw new BadRequestException('You cannot change your own role.');
    const target = await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, username: true, role: true } });
    if (!target) throw new NotFoundException('Account not found.');
    if (target.role === 'SUPER_ADMIN') throw new ForbiddenException('Super Admin role cannot be changed through this endpoint.');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: targetId }, data: { role: role as 'USER' | 'MODERATOR' | 'ADMIN' } });
      await tx.refreshSession.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAuditLog.create({ data: { actorId, action: 'ROLE_CHANGED', entityType: 'USER', entityId: targetId, metadata: { username: target.username, from: target.role, to: role } } });
    });
    return { id: targetId, role };
  }

  async reports(status?: string) {
    const where = status && Object.values(ReportStatus).includes(status as ReportStatus) ? { status: status as ReportStatus } : {};
    const data = await this.prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { reporter: { select: { id: true, username: true } } } });
    return { data };
  }
  async updateReport(actorId: string, reportId: string, status: string) {
    if (!Object.values(ReportStatus).includes(status as ReportStatus)) throw new BadRequestException('Invalid report status.');
    const report = await this.prisma.report.findUnique({ where: { id: reportId }, select: { id: true, status: true } });
    if (!report) throw new NotFoundException('Report not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({ where: { id: reportId }, data: { status: status as ReportStatus } });
      await tx.adminAuditLog.create({ data: { actorId, action: 'REPORT_STATUS_CHANGED', entityType: 'REPORT', entityId: reportId, metadata: { from: report.status, to: status } } });
    });
    return { id: reportId, status };
  }
  async verifications(status?: string) {
    const where = status && Object.values(VerificationStatus).includes(status as VerificationStatus) ? { status: status as VerificationStatus } : {};
    const data = await this.prisma.verificationRequest.findMany({ where, orderBy: { submittedAt: 'desc' }, take: 100, include: { user: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true, verifiedAt: true } } } } } });
    return { data };
  }
  async reviewVerification(actorId: string, requestId: string, status: string, note?: string) {
    if (!['APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Review status must be APPROVED or REJECTED.');
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: requestId }, select: { id: true, userId: true, status: true } });
    if (!request) throw new NotFoundException('Verification request not found.');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.verificationRequest.update({ where: { id: requestId }, data: { status: status as VerificationStatus, reviewedAt: now, reviewerId: actorId, reviewNote: note?.trim().slice(0, 500) || null } });
      if (status === 'APPROVED') await tx.profile.update({ where: { userId: request.userId }, data: { verifiedAt: now } });
      await tx.adminAuditLog.create({ data: { actorId, action: status === 'APPROVED' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED', entityType: 'VERIFICATION', entityId: requestId, metadata: { userId: request.userId, note: note?.trim() || null } } });
    });
    return { id: requestId, status };
  }
  async auditLogs() { return { data: await this.prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) }; }
}
