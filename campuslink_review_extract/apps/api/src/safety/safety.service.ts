import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportDto } from './safety.dto.js';

@Injectable()
export class SafetyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new NotFoundException('Student not found.');
    const target = await this.prisma.user.findFirst({ where: { id: blockedId, deletedAt: null }, select: { id: true } });
    if (!target) throw new NotFoundException('Student not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.block.upsert({ where: { blockerId_blockedId: { blockerId, blockedId } }, update: {}, create: { blockerId, blockedId } });
      await tx.follow.deleteMany({ where: { OR: [{ followerId: blockerId, followedId: blockedId }, { followerId: blockedId, followedId: blockerId }] } });
    });
    return { blocked: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } }); return { blocked: false };
  }

  async blockedUsers(blockerId: string) {
    const rows = await this.prisma.block.findMany({ where: { blockerId }, orderBy: { createdAt: 'desc' }, include: { blocked: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } } } });
    return { data: rows.map(({ blocked, createdAt }) => ({ ...blocked, blockedAt: createdAt })) };
  }

  private async targetExists(dto: ReportDto) {
    const where = { id: dto.targetId, deletedAt: null };
    switch (dto.targetType) {
      case 'USER': return Boolean(await this.prisma.user.findFirst({ where, select: { id: true } }));
      case 'POST': return Boolean(await this.prisma.post.findFirst({ where, select: { id: true } }));
      case 'LISTING': return Boolean(await this.prisma.listing.findFirst({ where, select: { id: true } }));
      case 'EVENT': return Boolean(await this.prisma.event.findFirst({ where, select: { id: true } }));
      default: return false;
    }
  }

  async report(reporterId: string, dto: ReportDto) {
    if (dto.targetType === 'USER' && dto.targetId === reporterId) throw new NotFoundException('Report target not found.');
    if (!(await this.targetExists(dto))) throw new NotFoundException('Report target not found.');
    const report = await this.prisma.report.upsert({
      where: { reporterId_targetType_targetId: { reporterId, targetType: dto.targetType, targetId: dto.targetId } },
      update: { reason: dto.reason, details: dto.details?.trim() || null, status: ReportStatus.OPEN },
      create: { reporterId, targetType: dto.targetType, targetId: dto.targetId, reason: dto.reason, details: dto.details?.trim() || null },
      select: { id: true, targetType: true, status: true, createdAt: true },
    });
    return { report };
  }
}
