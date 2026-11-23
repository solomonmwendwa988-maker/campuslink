import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';


@Injectable()
export class ActivityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: { eventType: string; category: string; outcome?: string; actorUserId?: string | null; targetType?: string; targetId?: string | null; maskedIdentifier?: string | null; metadata?: Record<string, unknown> }) {
    try {
      return await this.prisma.activityEvent.create({ data: {
        eventType: input.eventType.slice(0, 80), category: input.category.slice(0, 40), outcome: input.outcome?.slice(0, 24),
        actorUserId: input.actorUserId ?? null, targetType: input.targetType?.slice(0, 40), targetId: input.targetId?.slice(0, 80) ?? null,
        maskedIdentifier: input.maskedIdentifier?.slice(0, 160) ?? null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      } });
    } catch { /* telemetry must not block product flows; deploy migration before enabling event capture */ return null; }
  }

  async list(page = 1, limit = 25, category = '', q = '') {
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 25)));
    const where: Prisma.ActivityEventWhereInput = {
      ...(category ? { category: { equals: category, mode: 'insensitive' as const } } : {}),
      ...(q.trim() ? { OR: [ { eventType: { contains: q.trim(), mode: 'insensitive' as const } }, { targetType: { contains: q.trim(), mode: 'insensitive' as const } }, { targetId: { contains: q.trim(), mode: 'insensitive' as const } }, { maskedIdentifier: { contains: q.trim(), mode: 'insensitive' as const } } ] } : {}),
    };
    const [data, total] = await Promise.all([this.prisma.activityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }), this.prisma.activityEvent.count({ where })]);
    return { data, page: safePage, limit: safeLimit, total, pages: Math.max(1, Math.ceil(total / safeLimit)) };
  }

  async summary(days = 14) {
    const safeDays = Math.min(90, Math.max(1, Math.floor(Number(days) || 14)));
    const since = new Date(Date.now() - safeDays * 86400000);
    const [total, logins, failures, signups, posts, reports, adminActions, byCategory] = await Promise.all([
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since }, eventType: 'LOGIN_SUCCESS' } }),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since }, eventType: 'LOGIN_FAILED' } }),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since }, eventType: 'USER_REGISTERED' } }),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since }, category: 'POST' } }),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since }, category: 'REPORT' } }),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: since }, category: 'ADMIN' } }),
      this.prisma.activityEvent.groupBy({ by: ['category'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { category: 'desc' } } }),
    ]);
    const daily = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count FROM "ActivityEvent" WHERE "createdAt" >= ${since} GROUP BY day ORDER BY day ASC`);
    return { days: safeDays, total, logins, failures, signups, posts, reports, adminActions, byCategory: byCategory.map(x => ({ category: x.category, count: x._count._all })), daily: daily.map(x => ({ day: x.day, count: Number(x.count) })) };
  }
}
