import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { BlockDto, ReportDto } from './safety.dto.js';
import { SafetyService } from './safety.service.js';

type RequestWithUser = Request & { user?: { id: string } };

@ApiTags('safety') @ApiBearerAuth() @UseGuards(AuthGuard('jwt'))
@Controller({ path: 'safety', version: '1' })
export class SafetyController {
  constructor(@Inject(SafetyService) private readonly safety: SafetyService) {}
  @Get('blocked') blocked(@Req() req: RequestWithUser) { return this.safety.blockedUsers(req.user!.id); }
  @Post('block') block(@Req() req: RequestWithUser, @Body() dto: BlockDto) { return this.safety.block(req.user!.id, dto.userId); }
  @Delete('block/:userId') unblock(@Req() req: RequestWithUser, @Param('userId', ParseUUIDPipe) userId: string) { return this.safety.unblock(req.user!.id, userId); }
  @Post('reports') report(@Req() req: RequestWithUser, @Body() dto: ReportDto) { return this.safety.report(req.user!.id, dto); }
}
