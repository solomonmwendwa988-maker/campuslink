import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, cursor?: string) {
    const rows = await this.prisma.notification.findMany({ where: { recipientId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 31, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const hasMore = rows.length > 30; const data = rows.slice(0, 30);
    const actorIds = [...new Set(data.map((row) => row.actorId).filter((id): id is string => Boolean(id)))];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds }, deletedAt: null }, select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } });
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    return { data: data.map(({ actorId, ...notification }) => ({ ...notification, actor: actorId ? actorById.get(actorId) ?? null : null })), nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, recipientId: userId, readAt: null }, data: { readAt: new Date() } });
    if (!result.count && !(await this.prisma.notification.findFirst({ where: { id, recipientId: userId }, select: { id: true } }))) throw new NotFoundException('Notification not found.');
    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } });
    return { markedRead: result.count };
  }
}
