import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'campuslink_roles';
export type AdminRole = 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
