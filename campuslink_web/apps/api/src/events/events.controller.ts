import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { EventDto, EventQueryDto } from './events.dto.js';
import { EventsService } from './events.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('events') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}
  @Get() list(@Query() query: EventQueryDto, @Req() req: RequestWithUser) { return this.events.list(query, req.user?.id); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.events.get(id); }
  @Post() @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  create(@Req() req: RequestWithUser, @Body() dto: EventDto) { return this.events.create(req.user!.id, dto); }
  @Patch(':id') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  update(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser, @Body() dto: EventDto) { return this.events.update(req.user!.id, id, dto); }
  @Delete(':id') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.events.remove(req.user!.id, id); }
  @Post(':id/interest') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  interest(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.events.interest(req.user!.id, id, true); }
  @Delete(':id/interest') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  uninterested(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.events.interest(req.user!.id, id, false); }
}
