import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CreateCommentDto, CreatePostDto, PostPageDto } from './posts.dto.js';
import { PostsService } from './posts.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('posts') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'posts', version: '1' })
export class PostsController {
  constructor(@Inject(PostsService) private readonly posts: PostsService) {}

  @Get() feed(@Query() query: PostPageDto) { return this.posts.feed(undefined, query.cursor); }

  @Get('following') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  following(@Req() req: RequestWithUser, @Query() query: PostPageDto) { return this.posts.feed(req.user!.id, query.cursor, true); }
  @Post() @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  create(@Req() req: RequestWithUser, @Body() dto: CreatePostDto) { return this.posts.create(req.user!.id, dto); }

  @Patch(':id') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  edit(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePostDto) { return this.posts.edit(req.user!.id, id, dto.content); }

  @Delete(':id') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  delete(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.delete(req.user!.id, id); }

  @Post(':id/like') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  like(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.toggleLike(req.user!.id, id, true); }

  @Delete(':id/like') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  unlike(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.toggleLike(req.user!.id, id, false); }

  @Post(':id/bookmark') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  bookmark(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.toggleBookmark(req.user!.id, id, true); }

  @Delete(':id/bookmark') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  unbookmark(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.toggleBookmark(req.user!.id, id, false); }

  @Post(':id/repost') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  repost(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.toggleRepost(req.user!.id, id, true); }

  @Delete(':id/repost') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  unrepost(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string) { return this.posts.toggleRepost(req.user!.id, id, false); }

  @Get(':id/comments') comments(@Param('id', ParseUUIDPipe) id: string, @Query() query: PostPageDto) { return this.posts.comments(id, query.cursor); }

  @Post(':id/comments') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  comment(@Req() req: RequestWithUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCommentDto) { return this.posts.comment(req.user!.id, id, dto); }
}
