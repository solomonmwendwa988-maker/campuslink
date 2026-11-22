import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AdminRole } from './roles.decorator.js';

const ROLE_LEVEL: Record<string, number> = { USER: 0, MODERATOR: 1, ADMIN: 2, SUPER_ADMIN: 3 };
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    const userRole = request.user?.role ?? 'USER';
    const minimum = Math.min(...required.map((role) => ROLE_LEVEL[role] ?? 99));
    if ((ROLE_LEVEL[userRole] ?? 0) < minimum) throw new ForbiddenException('Administrator access is required.');
    return true;
  }
}
