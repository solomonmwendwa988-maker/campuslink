import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ListingAvailabilityDto, ListingDto, ListingQueryDto } from './marketplace.dto.js';
import { MarketplaceService } from './marketplace.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('marketplace') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'marketplace/listings', version: '1' })
export class MarketplaceController {
  constructor(@Inject(MarketplaceService) private readonly marketplace: MarketplaceService) {}
  @Get() list(@Query() query: ListingQueryDto, @Req() req: RequestWithUser) { return this.marketplace.list(query, req.user?.id); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.marketplace.get(id, req.user?.id); }
  @Post() @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  create(@Req() req: RequestWithUser, @Body() dto: ListingDto) { return this.marketplace.create(req.user!.id, dto); }
  @Patch(':id') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  update(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser, @Body() dto: ListingDto) { return this.marketplace.update(req.user!.id, id, dto); }
  @Delete(':id') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.marketplace.remove(req.user!.id, id); }
  @Patch(':id/availability') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  availability(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser, @Body() dto: ListingAvailabilityDto) { return this.marketplace.setAvailable(req.user!.id, id, dto); }
  @Post(':id/favorite') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  favorite(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.marketplace.favorite(req.user!.id, id, true); }
  @Delete(':id/favorite') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  unfavorite(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser) { return this.marketplace.favorite(req.user!.id, id, false); }
}
