import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './profiles.dto.js';

const profileSelect = { id: true, username: true, profile: { select: { fullName: true, university: { select: { name: true } }, campus: { select: { name: true } }, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true } }, _count: { select: { follows: true, followedBy: true, posts: true } } } satisfies Prisma.UserSelect;

@Injectable()
export class ProfilesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async own(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null }, select: { id: true, username: true, email: true, profile: { select: { fullName: true, university: { select: { name: true } }, campus: { select: { name: true } }, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true } } } });
    if (!user) throw new NotFoundException('Profile not found.');
    return { user };
  }

  async discover(viewerId: string, search?: string) {
    const blockedRows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excludedIds = blockedRows.map((row) => row.blockerId === viewerId ? row.blockedId : row.blockerId);
    const term = search?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: viewerId, notIn: excludedIds },
        deletedAt: null,
        deactivatedAt: null,
        profile: { isPrivate: false, ...(term ? { OR: [
          { fullName: { contains: term, mode: 'insensitive' as const } },
          { course: { contains: term, mode: 'insensitive' as const } },
          { user: { username: { contains: term, mode: 'insensitive' as const } } },
        ] } : {}) },
      },
      select: profileSelect,
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    return { data: users.map(({ profile, _count, ...user }) => ({ user: { ...user, profile, counts: _count } })) };
  }


  async byUsername(viewerId: string | undefined, username: string) {
    const user = await this.prisma.user.findUnique({ where: { username: username.toLowerCase(), deletedAt: null, deactivatedAt: null }, select: profileSelect });
    if (!user) throw new NotFoundException('Profile not found.');
    if (viewerId && viewerId !== user.id) {
      const blocked = await this.prisma.block.findFirst({ where: { OR: [{ blockerId: viewerId, blockedId: user.id }, { blockerId: user.id, blockedId: viewerId }] } });
      if (blocked) throw new NotFoundException('Profile not found.');
    }
    if (user.profile?.isPrivate && viewerId !== user.id) throw new ForbiddenException('This profile is private.');
    const { isPrivate: _private, ...profile } = user.profile ?? {};
    return { user: { id: user.id, username: user.username, profile, counts: user._count } };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const { username, ...profileData } = dto;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        if (username) await tx.user.update({ where: { id: userId }, data: { username: username.toLowerCase() } });
        const user = await tx.user.update({ where: { id: userId }, data: { profile: { update: profileData } }, select: { id: true, username: true, profile: { select: { fullName: true, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true } } } });
        return { user };
      });
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('That username is already in use.');
      throw error;
    }
  }

  async follow(viewerId: string, username: string, enabled: boolean) {
    const target = await this.prisma.user.findUnique({ where: { username: username.toLowerCase(), deletedAt: null }, select: { id: true, profile: { select: { isPrivate: true } } } });
    if (!target) throw new NotFoundException('Student not found.');
    if (target.id === viewerId) throw new ForbiddenException('You cannot follow yourself.');
    const block = await this.prisma.block.findFirst({ where: { OR: [{ blockerId: viewerId, blockedId: target.id }, { blockerId: target.id, blockedId: viewerId }] } });
    if (block) throw new NotFoundException('Student not found.');
    if (target.profile?.isPrivate && enabled) throw new ForbiddenException('Following private profiles is not available until follow requests are enabled.');
    if (enabled) {
      const created = await this.prisma.follow.createMany({ data: [{ followerId: viewerId, followedId: target.id }], skipDuplicates: true });
      if (created.count) await this.prisma.notification.create({ data: { recipientId: target.id, actorId: viewerId, type: 'FOLLOW', entityId: viewerId } });
    }
    else await this.prisma.follow.deleteMany({ where: { followerId: viewerId, followedId: target.id } });
    return { following: enabled };
  }

  async connections(viewerId: string | undefined, username: string, direction: 'followers' | 'following', cursor?: string) {
    const target = await this.prisma.user.findFirst({ where: { username: username.toLowerCase(), deletedAt: null, deactivatedAt: null }, select: { id: true, profile: { select: { isPrivate: true } } } });
    if (!target) throw new NotFoundException('Profile not found.');
    if (viewerId && viewerId !== target.id && await this.prisma.block.findFirst({ where: { OR: [{ blockerId: viewerId, blockedId: target.id }, { blockerId: target.id, blockedId: viewerId }] } })) throw new NotFoundException('Profile not found.');
    if (target.profile?.isPrivate && viewerId !== target.id) throw new ForbiddenException('This profile is private.');
    const relationWhere = direction === 'followers' ? { followedId: target.id } : { followerId: target.id };
    const blocked = await this.prisma.block.findMany({ where: { OR: [{ blockerId: target.id }, { blockedId: target.id }] }, select: { blockerId: true, blockedId: true } });
    const excluded = blocked.map((row) => row.blockerId === target.id ? row.blockedId : row.blockerId);
    const rows = await this.prisma.follow.findMany({
      where: { ...relationWhere, ...(direction === 'followers' ? { followerId: { notIn: excluded } } : { followedId: { notIn: excluded } }) },
      orderBy: [{ createdAt: 'desc' }, { followerId: 'desc' }], take: 21,
      ...(cursor ? { cursor: { followerId_followedId: direction === 'followers' ? { followerId: cursor, followedId: target.id } : { followerId: target.id, followedId: cursor } }, skip: 1 } : {}),
      include: { follower: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } }, followed: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } } },
    });
    const hasMore = rows.length > 20; const data = rows.slice(0, 20).map((row) => direction === 'followers' ? row.follower : row.followed);
    return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }
}
