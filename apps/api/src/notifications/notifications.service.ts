import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, cursor?: string) {
    const rows = await this.prisma.notification.findMany({ where: { recipientId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 31, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const hasMore = rows.length > 30; const pageRows = rows.slice(0, 30);
    const messageEntityIds = pageRows.filter(row => row.type === 'MESSAGE' && row.entityId).map(row => row.entityId!).slice(0, 30);
    const messageConversations = messageEntityIds.length ? await this.prisma.message.findMany({ where: { id: { in: messageEntityIds } }, select: { id: true, conversationId: true } }) : [];
    const mutedConversationIds = messageConversations.length ? new Set((await this.prisma.conversationMute.findMany({ where: { userId, conversationId: { in: [...new Set(messageConversations.map(message => message.conversationId))] } }, select: { conversationId: true } })).map(row => row.conversationId)) : new Set<string>();
    const mutedMessageIds = new Set(messageConversations.filter(message => mutedConversationIds.has(message.conversationId)).map(message => message.id));
    const data = pageRows.filter(row => !(row.type === 'MESSAGE' && row.entityId && mutedMessageIds.has(row.entityId)));
    const actorIds = [...new Set(data.map((row) => row.actorId).filter((id): id is string => Boolean(id)))];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds }, deletedAt: null }, select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } });
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    return { data: data.map(({ actorId, ...notification }) => ({ ...notification, actor: actorId ? actorById.get(actorId) ?? null : null })), nextCursor: hasMore ? pageRows.at(-1)?.id ?? null : null };
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
