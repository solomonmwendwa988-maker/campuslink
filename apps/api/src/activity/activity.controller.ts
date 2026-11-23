import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../admin/roles.decorator.js';
import { RolesGuard } from '../admin/roles.guard.js';
import { ActivityService } from './activity.service.js';
@ApiTags('admin-activity') @ApiBearerAuth() @Controller({ path: 'admin/activity', version: '1' }) @UseGuards(AuthGuard('jwt'), RolesGuard)
export class ActivityController {
 constructor(private readonly activity: ActivityService) {}
 @Get() @Roles('ADMIN') list(@Query('page') page='1', @Query('limit') limit='25', @Query('category') category='', @Query('q') q='') { return this.activity.list(Number(page), Number(limit), category, q); }
 @Get('summary') @Roles('ADMIN') summary(@Query('days') days='14') { return this.activity.summary(Number(days)); }
}
