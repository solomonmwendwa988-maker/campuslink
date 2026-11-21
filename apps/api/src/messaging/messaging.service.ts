import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const conversationInclude = {
  participants: { include: { user: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } } } },
} satisfies Prisma.ConversationInclude;
const conversationListInclude = {
  participants: { include: { user: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } } } },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.ConversationInclude;
const messageInclude = {
  sender: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } },
  attachments: true,
  reactions: { select: { userId: true, reaction: true } },
} satisfies Prisma.MessageInclude;
const pageSize = 40;

@Injectable()
export class MessagingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async isSessionActive(userId: string, sessionId: string) {
    const session = await this.prisma.refreshSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null, deactivatedAt: null },
      },
      select: { id: true },
    });
    return Boolean(session);
  }

  async list(userId: string) {
    const memberships = await this.prisma.conversationParticipant.findMany({ where: { userId }, include: { conversation: { include: conversationListInclude } }, orderBy: { conversation: { updatedAt: 'desc' } } });
    const conversations = await Promise.all(memberships.map(async ({ conversation, lastReadAt }) => {
      const other = conversation.participants.find((member) => member.userId !== userId);
      if (!other || await this.prisma.block.findFirst({ where: { OR: [{ blockerId: userId, blockedId: other.userId }, { blockerId: other.userId, blockedId: userId }] } })) return null;
      const unreadCount = await this.prisma.message.count({ where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null, ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}) } });
      return { id: conversation.id, participants: conversation.participants.filter((member) => member.userId !== userId).map((member) => member.user), lastMessage: conversation.messages[0] ?? null, unreadCount, updatedAt: conversation.updatedAt };
    }));
    return { data: conversations.filter((conversation): conversation is NonNullable<typeof conversation> => conversation !== null) };
  }

  async start(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username: username.toLowerCase(), deletedAt: null, deactivatedAt: null }, select: { id: true, profile: { select: { universityId: true } } } });
    if (!target) throw new NotFoundException('Student not found.');
    if (target.id === userId) throw new ForbiddenException('You cannot message yourself.');
    const [ownProfile, block] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId }, select: { universityId: true } }),
      this.prisma.block.findFirst({ where: { OR: [{ blockerId: userId, blockedId: target.id }, { blockerId: target.id, blockedId: userId }] } }),
    ]);
    if (!ownProfile || ownProfile.universityId !== target.profile?.universityId || block) throw new NotFoundException('Student not found.');
    const directKey = [userId, target.id].sort().join(':');
    const conversation = await this.prisma.conversation.upsert({ where: { directKey }, update: {}, create: { directKey, participants: { create: [{ userId }, { userId: target.id }] } }, include: conversationInclude });
    return { conversation };
  }

  async authorize(userId: string, conversationId: string) {
    const membership = await this.prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } }, select: { conversationId: true } });
    if (!membership) throw new NotFoundException('Conversation not found.');
    const other = await this.prisma.conversationParticipant.findFirst({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    if (!other || await this.prisma.block.findFirst({ where: { OR: [{ blockerId: userId, blockedId: other.userId }, { blockerId: other.userId, blockedId: userId }] }, select: { blockerId: true } })) throw new NotFoundException('Conversation not found.');
    return membership;
  }

  async history(userId: string, conversationId: string, cursor?: string) {
    await this.authorize(userId, conversationId);
    const rows = await this.prisma.message.findMany({ where: { conversationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: messageInclude });
    const hasMore = rows.length > pageSize; const data = rows.slice(0, pageSize).reverse();
    return { data, nextCursor: hasMore ? rows[pageSize]?.id ?? null : null };
  }

  async send(userId: string, conversationId: string, content: string, clientMessageId: string) {
    await this.authorize(userId, conversationId);
    const other = await this.prisma.conversationParticipant.findFirst({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    if (!other) throw new NotFoundException('Conversation not found.');
    if (await this.prisma.block.findFirst({ where: { OR: [{ blockerId: userId, blockedId: other.userId }, { blockerId: other.userId, blockedId: userId }] } })) throw new ForbiddenException('Messaging is unavailable for this conversation.');
    const prior = await this.prisma.message.findUnique({ where: { senderId_clientMessageId: { senderId: userId, clientMessageId } } });
    if (prior) return { message: prior, duplicate: true, recipientId: other.userId };
    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const saved = await tx.message.create({ data: { conversationId, senderId: userId, content: content.trim(), clientMessageId } });
        await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        await tx.notification.create({ data: { recipientId: other.userId, actorId: userId, type: 'MESSAGE', entityId: saved.id } });
        return saved;
      });
      return { message, duplicate: false, recipientId: other.userId };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const message = await this.prisma.message.findUniqueOrThrow({ where: { senderId_clientMessageId: { senderId: userId, clientMessageId } } });
        return { message, duplicate: true, recipientId: other.userId };
      }
      throw error;
    }
  }

  async markRead(userId: string, conversationId: string) {
    await this.authorize(userId, conversationId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: null }, data: { readAt: now } }),
      this.prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: now } }),
    ]);
    return { readAt: now.toISOString() };
  }
}
