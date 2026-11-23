import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { RolesGuard } from './roles.guard.js';
@Module({ controllers: [AdminController], providers: [AdminService, RolesGuard] })
export class AdminModule {}
