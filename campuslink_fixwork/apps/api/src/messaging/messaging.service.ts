import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
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

// Structural upload type keeps the voice endpoint independent of Express/Multer ambient typings.
type VoiceUploadFile = { buffer: Buffer; mimetype: string; originalname?: string; size?: number };

@Injectable()
export class MessagingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async heartbeatPresence(userId: string) {
    const now = new Date();
    await this.prisma.messagingPresence.upsert({ where: { userId }, create: { userId, lastSeenAt: now }, update: { lastSeenAt: now } });
    return { online: true as const };
  }

  async getPresence(userId: string, requestedIds: string[]) {
    const targets = [...new Set(requestedIds)].filter(id => id !== userId).slice(0, 50);
    if (!targets.length) return { data: [] as { userId: string; online: boolean; lastSeenAt: string | null }[] };
    const shared = await this.prisma.conversationParticipant.findMany({
      where: { userId, conversation: { participants: { some: { userId: { in: targets } } } } },
      select: { conversation: { select: { participants: { select: { userId: true } } } } },
    });
    const allowed = new Set(shared.flatMap(row => row.conversation.participants.map(p => p.userId)).filter(id => targets.includes(id)));
    if (!allowed.size) return { data: [] as { userId: string; online: boolean; lastSeenAt: string | null }[] };
    const blockedRows = await this.prisma.block.findMany({ where: { OR: [{ blockerId: userId, blockedId: { in: [...allowed] } }, { blockedId: userId, blockerId: { in: [...allowed] } }] }, select: { blockerId: true, blockedId: true } });
    const blocked = new Set(blockedRows.map(row => row.blockerId === userId ? row.blockedId : row.blockerId));
    const visible = [...allowed].filter(id => !blocked.has(id));
    const rows = visible.length ? await this.prisma.messagingPresence.findMany({ where: { userId: { in: visible }, lastSeenAt: { gt: new Date(Date.now() - 90_000) } }, select: { userId: true, lastSeenAt: true } }) : [];
    const active = new Map(rows.map(row => [row.userId, row.lastSeenAt]));
    return { data: visible.map(id => ({ userId: id, online: active.has(id), lastSeenAt: active.get(id)?.toISOString() ?? null })) };
  }

  async setTyping(userId: string, conversationId: string, typing: boolean) {
    await this.authorize(userId, conversationId);
    const now = new Date();
    await this.prisma.messagingPresence.upsert({ where: { userId }, create: { userId, lastSeenAt: now, typingConversationId: typing ? conversationId : null, typingUntil: typing ? new Date(now.getTime() + 6_000) : null }, update: { lastSeenAt: now, typingConversationId: typing ? conversationId : null, typingUntil: typing ? new Date(now.getTime() + 6_000) : null } });
    return { ok: true as const };
  }

  async getTyping(userId: string, conversationId: string) {
    await this.authorize(userId, conversationId);
    const participants = await this.prisma.conversationParticipant.findMany({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    const rows = await this.prisma.messagingPresence.findMany({ where: { userId: { in: participants.map(p => p.userId) }, typingConversationId: conversationId, typingUntil: { gt: new Date() } }, select: { userId: true } });
    return { userIds: rows.map(row => row.userId) };
  }

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
    const conversationIds = memberships.map((membership) => membership.conversationId);
    if (conversationIds.length) await this.prisma.message.updateMany({ where: { conversationId: { in: conversationIds }, senderId: { not: userId }, deliveredAt: null }, data: { deliveredAt: new Date() } });
    const unreadRows = conversationIds.length ? await this.prisma.message.groupBy({ by: ['conversationId'], where: { conversationId: { in: conversationIds }, senderId: { not: userId }, readAt: null }, _count: { _all: true } }) : [];
    const unreadByConversation = new Map(unreadRows.map((row) => [row.conversationId, row._count._all]));
    const blockedIds = new Set((await this.prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } })).flatMap((row) => row.blockerId === userId ? [row.blockedId] : [row.blockerId]));
    const muteRows = conversationIds.length ? await this.prisma.conversationMute.findMany({ where: { conversationId: { in: conversationIds }, userId }, select: { conversationId: true } }) : [];
    const mutedIds = new Set(muteRows.map(row => row.conversationId));
    const conversations = memberships.map(({ conversation }) => {
      const other = conversation.participants.find((member) => member.userId !== userId);
      if (!other || blockedIds.has(other.userId)) return null;
      return { id: conversation.id, participants: conversation.participants.filter((member) => member.userId !== userId).map((member) => member.user), lastMessage: conversation.messages[0] ?? null, unreadCount: unreadByConversation.get(conversation.id) ?? 0, muted: mutedIds.has(conversation.id), updatedAt: conversation.updatedAt };
    });
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
    // A recipient opening/polling the conversation is the durable delivery acknowledgement.
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, deliveredAt: null },
      data: { deliveredAt: new Date() },
    });
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

  async sendVoice(userId: string, conversationId: string, file: VoiceUploadFile, clientMessageId: string) {
    await this.authorize(userId, conversationId);
    if (!clientMessageId || clientMessageId.length < 8 || clientMessageId.length > 100) throw new ForbiddenException('Invalid voice message identifier.');
    const prior = await this.prisma.message.findUnique({ where: { senderId_clientMessageId: { senderId: userId, clientMessageId } }, include: messageInclude });
    if (prior) return { message: prior, duplicate: true };
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new ForbiddenException('Voice messages are not configured yet. Configure Cloudinary storage on the API.');
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'campuslink/voice';
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
    const form = new FormData();
    form.append('file', new Blob([Uint8Array.from(file.buffer).buffer], { type: file.mimetype }), file.originalname || 'voice-message');
    form.append('api_key', apiKey); form.append('timestamp', String(timestamp)); form.append('folder', folder); form.append('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: form });
    if (!response.ok) throw new ForbiddenException('Voice upload failed. Please try again.');
    const uploaded = await response.json() as { secure_url?: string; resource_type?: string; duration?: number };
    if (!uploaded.secure_url) throw new ForbiddenException('Voice upload did not return a media URL.');
    const other = await this.prisma.conversationParticipant.findFirst({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    if (!other) throw new NotFoundException('Conversation not found.');
    const message = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.message.create({ data: { conversationId, senderId: userId, content: 'Voice message', clientMessageId, attachments: { create: { url: uploaded.secure_url!, mediaType: file.mimetype } } }, include: messageInclude });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      await tx.notification.create({ data: { recipientId: other.userId, actorId: userId, type: 'MESSAGE', entityId: saved.id } });
      return saved;
    });
    return { message, duplicate: false };
  }


  async muteConversation(userId: string, conversationId: string) {
    await this.authorize(userId, conversationId);
    await this.prisma.conversationMute.upsert({ where: { conversationId_userId: { conversationId, userId } }, update: {}, create: { conversationId, userId } });
    return { muted: true };
  }

  async unmuteConversation(userId: string, conversationId: string) {
    await this.authorize(userId, conversationId);
    await this.prisma.conversationMute.deleteMany({ where: { conversationId, userId } });
    return { muted: false };
  }

  async markRead(userId: string, conversationId: string) {
    await this.authorize(userId, conversationId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const unread = await tx.message.findMany({
        where: { conversationId, senderId: { not: userId }, readAt: null },
        select: { id: true },
      });
      const messageIds = unread.map((message) => message.id);
      await tx.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: null }, data: { readAt: now, deliveredAt: now } });
      await tx.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: now } });
      if (messageIds.length) await tx.notification.updateMany({ where: { recipientId: userId, type: 'MESSAGE', entityId: { in: messageIds }, readAt: null }, data: { readAt: now } });
    });
    return { readAt: now.toISOString() };
  }
}

