import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, Body, BadRequestException, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { MessagePageDto, SendMessageDto, StartConversationDto } from './messages.dto.js';
import { MessagingService } from './messaging.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('messaging') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'messages/conversations', version: '1' })
export class MessagingController {
  constructor(@Inject(MessagingService) private readonly messages: MessagingService) {}
  @Get() list(@Req() req: RequestWithUser) { return this.messages.list(req.user!.id); }
  @Post('presence/heartbeat') heartbeat(@Req() req: RequestWithUser) { return this.messages.heartbeatPresence(req.user!.id); }
  @Get('presence') presence(@Req() req: RequestWithUser, @Query('userIds') userIds = '') { const ids = userIds.split(',').filter(Boolean); if (ids.length > 50) throw new BadRequestException('Too many presence IDs.'); if (ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw new BadRequestException('Invalid presence user ID.'); return this.messages.getPresence(req.user!.id, ids); }
  @Post(':id/typing') typing(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: { typing?: unknown }) { if (typeof body?.typing !== 'boolean') throw new BadRequestException('Typing state must be a boolean.'); return this.messages.setTyping(req.user!.id, id, body.typing); }
  @Get(':id/typing') typingStatus(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.messages.getTyping(req.user!.id, id); }
  @Post() start(@Req() req: RequestWithUser, @Body() dto: StartConversationDto) { return this.messages.start(req.user!.id, dto.username); }
  @Post(':id/messages') send(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto) { return this.messages.send(req.user!.id, id, dto.content, dto.clientMessageId); }
  @Get(':id/messages') history(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: MessagePageDto) { return this.messages.history(req.user!.id, id, query.cursor); }
  @Post(':id/voice') voice(@Req() req: RequestWithUser & { body: Buffer }, @Param('id', ParseUUIDPipe) id: string, @Query('clientMessageId') clientMessageId?: string) { const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase(); const allowed = ['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-m4a']; if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > 8 * 1024 * 1024) throw new BadRequestException('Audio data is empty or exceeds the 8 MB limit.'); if (!clientMessageId || clientMessageId.length < 8 || clientMessageId.length > 100) throw new BadRequestException('A valid client message id is required.'); if (!allowed.includes(contentType)) throw new BadRequestException('Unsupported audio format.'); return this.messages.sendVoice(req.user!.id, id, { buffer: req.body, mimetype: contentType, originalname: 'voice-message', size: req.body.length }, clientMessageId); }
  @Post(':id/mute') mute(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.messages.muteConversation(req.user!.id, id); }
  @Delete(':id/mute') unmute(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.messages.unmuteConversation(req.user!.id, id); }
  @Post(':id/read') read(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.messages.markRead(req.user!.id, id); }
}
