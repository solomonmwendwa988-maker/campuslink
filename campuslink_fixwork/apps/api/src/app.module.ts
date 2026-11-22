import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { randomBytes } from 'node:crypto';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { PostsModule } from './posts/posts.module.js';
import { MarketplaceModule } from './marketplace/marketplace.module.js';
import { EventsModule } from './events/events.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { SafetyModule } from './safety/safety.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], validate: (env) => {
      const production = env.NODE_ENV === 'production';
      if (production) {
        for (const key of ['DATABASE_URL', 'DIRECT_URL', 'JWT_ACCESS_SECRET', 'CORS_ORIGINS']) {
          if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
        }
        if ((env.JWT_ACCESS_SECRET ?? '').length < 32 || env.JWT_ACCESS_SECRET.startsWith('replace-')) throw new Error('JWT_ACCESS_SECRET must be a real random secret of at least 32 characters.');
      }
      const accessSecret = env.JWT_ACCESS_SECRET && !env.JWT_ACCESS_SECRET.startsWith('replace-') ? env.JWT_ACCESS_SECRET : randomBytes(48).toString('base64url');
      if (accessSecret.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters.');
      return { ...env, JWT_ACCESS_SECRET: accessSecret };
    } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    ProfilesModule,
    PostsModule,
    MarketplaceModule,
    EventsModule,
    MessagingModule,
    NotificationsModule,
    SafetyModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
