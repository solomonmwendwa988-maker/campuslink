import { Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('notifications') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}
  @Get() list(@Req() req: RequestWithUser, @Query('cursor') cursor?: string) { return this.notifications.list(req.user!.id, cursor); }
  @Get('summary') summary(@Req() req: RequestWithUser) { return this.notifications.summary(req.user!.id); }
  @Patch('read-all') readAll(@Req() req: RequestWithUser) { return this.notifications.markAllRead(req.user!.id); }
  @Patch(':id/read') read(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.notifications.markRead(req.user!.id, id); }
}
