import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { MessagePageDto, StartConversationDto } from './messages.dto.js';
import { MessagingService } from './messaging.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('messaging') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'messages/conversations', version: '1' })
export class MessagingController {
  constructor(@Inject(MessagingService) private readonly messages: MessagingService) {}
  @Get() list(@Req() req: RequestWithUser) { return this.messages.list(req.user!.id); }
  @Post() start(@Req() req: RequestWithUser, @Body() dto: StartConversationDto) { return this.messages.start(req.user!.id, dto.username); }
  @Get(':id/messages') history(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: MessagePageDto) { return this.messages.history(req.user!.id, id, query.cursor); }
  @Post(':id/read') read(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.messages.markRead(req.user!.id, id); }
}
