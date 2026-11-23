import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { RolesGuard } from '../admin/roles.guard.js';
@Module({ controllers: [ActivityController], providers: [ActivityService, RolesGuard], exports: [ActivityService] })
export class ActivityModule {}
