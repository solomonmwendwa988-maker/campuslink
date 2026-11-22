import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ProfilesService } from './profiles.service.js';
import { ConnectionPageDto, DiscoverStudentsDto, UpdateProfileDto } from './profiles.dto.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('profiles') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'profiles', version: '1' })
export class ProfilesController {
  constructor(@Inject(ProfilesService) private readonly profiles: ProfilesService) {}

  @Get('me') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  me(@Req() req: RequestWithUser) { return this.profiles.own(req.user!.id); }

  @Patch('me') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  update(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) { return this.profiles.update(req.user!.id, dto); }

  @Get('discover')
  discover(@Req() req: RequestWithUser, @Query() query: DiscoverStudentsDto) { return this.profiles.discover(req.user!.id, query.search); }

  @Get(':username')
  publicProfile(@Param('username') username: string, @Req() req: RequestWithUser) { return this.profiles.byUsername(req.user?.id, username); }

  @Post(':username/follow') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  follow(@Param('username') username: string, @Req() req: RequestWithUser) { return this.profiles.follow(req.user!.id, username, true); }

  @Post(':username/unfollow') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  unfollow(@Param('username') username: string, @Req() req: RequestWithUser) { return this.profiles.follow(req.user!.id, username, false); }

  @Get(':username/followers')
  followers(@Param('username') username: string, @Req() req: RequestWithUser, @Query() query: ConnectionPageDto) { return this.profiles.connections(req.user?.id, username, 'followers', query.cursor); }

  @Get(':username/following')
  following(@Param('username') username: string, @Req() req: RequestWithUser, @Query() query: ConnectionPageDto) { return this.profiles.connections(req.user?.id, username, 'following', query.cursor); }
}
