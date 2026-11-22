import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

type AdminRequest = Request & { user: { id: string; username: string; role: string } };

@ApiTags('admin-auth')
@Controller({ path: 'admin/auth', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AdminAuthController {
  @Get('me')
  @Roles('ADMIN')
  me(@Req() req: AdminRequest) {
    return { admin: { id: req.user.id, username: req.user.username, role: req.user.role }, permissions: this.permissions(req.user.role) };
  }
  private permissions(role: string) {
    return role === 'SUPER_ADMIN' ? ['admin:*'] : role === 'ADMIN' ? ['admin:read', 'admin:users:manage', 'admin:reports:manage', 'admin:content:manage'] : ['admin:read', 'admin:reports:review'];
  }
}
