import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service.js';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API process is alive (database independent)' })
  live() {
    return { ok: true, service: 'campuslink-api', status: 'live', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether the API can serve requests using PostgreSQL' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, service: 'campuslink-api', status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({
        ok: false,
        service: 'campuslink-api',
        status: 'not_ready',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Check API and database readiness' })
  health() {
    return this.ready();
  }
}
