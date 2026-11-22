import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { MessagingService } from './messaging.service.js';

type AuthSocket = Socket & { data: { userId?: string; sessionId?: string } };
const idSchema = z.string().uuid();
const sendSchema = z.object({ conversationId: z.string().uuid(), clientMessageId: z.string().min(8).max(100), content: z.string().trim().min(1).max(5000) });
const typingSchema = z.object({ conversationId: z.string().uuid(), typing: z.boolean() });

@WebSocketGateway({ namespace: '/messages', cors: { origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((value) => value.trim()), credentials: true } })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  constructor(@Inject(JwtService) private readonly jwt: JwtService, @Inject(ConfigService) private readonly config: ConfigService, @Inject(MessagingService) private readonly messages: MessagingService) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token = client.handshake.auth?.accessToken as string | undefined;
      if (!token) throw new Error('missing token');
      const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
      const claims = await this.jwt.verifyAsync<{ sub: string; sid: string }>(token, { secret });
      if (!claims.sub || !claims.sid || !(await this.messages.isSessionActive(claims.sub, claims.sid))) throw new Error('inactive session');
      client.data.userId = claims.sub;
      client.data.sessionId = claims.sid;
      await client.join(`user:${claims.sub}`);
    } catch { client.disconnect(true); }
  }

  private async requireUser(client: AuthSocket) {
    const { userId, sessionId } = client.data;
    if (!userId || !sessionId) {
      client.disconnect(true);
      throw new WsException('Session is no longer active.');
    }
    let active = false;
    try { active = await this.messages.isSessionActive(userId, sessionId); }
    catch {
      client.disconnect(true);
      throw new WsException('Unable to authenticate socket session.');
    }
    if (!active) {
      client.disconnect(true);
      throw new WsException('Session is no longer active.');
    }
    return userId;
  }

  handleDisconnect(_client: AuthSocket) { /* Socket.IO presence is ephemeral; persisted chat state is in PostgreSQL. */ }

  @SubscribeMessage('conversation:join')
  async join(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: unknown) {
    const userId = await this.requireUser(client);
    const parsed = idSchema.safeParse(payload); if (!parsed.success) throw new WsException('Invalid conversation id.');
    try { await this.messages.authorize(userId, parsed.data); await client.join(`conversation:${parsed.data}`); return { joined: true }; }
    catch { throw new WsException('Conversation not found.'); }
  }

  @SubscribeMessage('message:send')
  async send(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: unknown) {
    const userId = await this.requireUser(client);
    const parsed = sendSchema.safeParse(payload); if (!parsed.success) throw new WsException('Invalid message payload.');
    try {
      const result = await this.messages.send(userId, parsed.data.conversationId, parsed.data.content, parsed.data.clientMessageId);
      if (!result.duplicate) {
        client.to(`conversation:${parsed.data.conversationId}`).emit('message:new', result.message);
        this.server.to(`user:${result.recipientId}`).emit('notification:new', { type: 'MESSAGE', entityId: result.message.id, conversationId: parsed.data.conversationId, createdAt: result.message.createdAt });
      }
      return { ok: true, message: result.message, duplicate: result.duplicate };
    } catch { throw new WsException('Message could not be sent to this conversation.'); }
  }

  @SubscribeMessage('message:read')
  async read(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: unknown) {
    const userId = await this.requireUser(client);
    const parsed = idSchema.safeParse(payload); if (!parsed.success) throw new WsException('Invalid conversation id.');
    try {
      const result = await this.messages.markRead(userId, parsed.data);
      client.to(`conversation:${parsed.data}`).emit('message:read', { conversationId: parsed.data, userId, ...result });
      return result;
    } catch { throw new WsException('Conversation not found.'); }
  }

  @SubscribeMessage('message:typing')
  async typing(@ConnectedSocket() client: AuthSocket, @MessageBody() payload: unknown) {
    const userId = await this.requireUser(client);
    const parsed = typingSchema.safeParse(payload); if (!parsed.success) throw new WsException('Invalid typing payload.');
    try { await this.messages.authorize(userId, parsed.data.conversationId); client.to(`conversation:${parsed.data.conversationId}`).emit('message:typing', { userId, typing: parsed.data.typing }); return { ok: true }; }
    catch { throw new WsException('Conversation not found.'); }
  }
}
