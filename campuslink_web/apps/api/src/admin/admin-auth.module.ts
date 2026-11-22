import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller.js';
import { RolesGuard } from './roles.guard.js';
@Module({ controllers: [AdminAuthController], providers: [RolesGuard] })
export class AdminAuthModule {}
