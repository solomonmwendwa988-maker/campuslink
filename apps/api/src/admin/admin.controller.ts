import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { AdminService } from './admin.service.js';

type AdminRequest = Request & { user: { id: string; username: string; role: string } };
@ApiTags('admin') @ApiBearerAuth() @Controller({ path: 'admin', version: '1' }) @UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard') @Roles('ADMIN') dashboard() { return this.admin.dashboard(); }
  @Get('system-health') @Roles('ADMIN') systemHealth() { return this.admin.systemHealth(); }
  @Get('activity-summary') @Roles('ADMIN') activitySummary(@Query('hours') hours = '24') { return this.admin.activitySummary(Number(hours) || 24); }
  @Get('users') @Roles('ADMIN') users(@Query('q') q = '', @Query('page') page = '1', @Query('limit') limit = '25') { return this.admin.users(q, Number(page) || 1, Number(limit) || 25); }
  @Get('users/:id') @Roles('ADMIN') userDetails(@Param('id') id: string) { return this.admin.userDetails(id); }
  @Patch('users/:id/status') @Roles('ADMIN') status(@Req() req: AdminRequest, @Param('id') id: string, @Body() body: { disabled: boolean; reason?: string }) { if (typeof body?.disabled !== 'boolean') throw new BadRequestException('disabled must be a boolean.'); return this.admin.setAccountStatus(req.user.id, id, body.disabled, body.reason); }
  @Patch('users/:id/role') @Roles('SUPER_ADMIN') role(@Req() req: AdminRequest, @Param('id') id: string, @Body() body: { role: string }) { return this.admin.changeRole(req.user.id, req.user.role, id, body.role); }
  @Get('reports') @Roles('ADMIN') reports(@Query('status') status?: string) { return this.admin.reports(status); }
  @Patch('reports/:id') @Roles('ADMIN') reportStatus(@Req() req: AdminRequest, @Param('id') id: string, @Body() body: { status: string }) { return this.admin.updateReport(req.user.id, id, body.status); }
  @Get('verifications') @Roles('ADMIN') verifications(@Query('status') status?: string) { return this.admin.verifications(status); }
  @Patch('verifications/:id') @Roles('ADMIN') verificationReview(@Req() req: AdminRequest, @Param('id') id: string, @Body() body: { status: string; note?: string }) { return this.admin.reviewVerification(req.user.id, id, body.status, body.note); }
  @Get('audit-logs') @Roles('ADMIN') auditLogs() { return this.admin.auditLogs(); }
}
