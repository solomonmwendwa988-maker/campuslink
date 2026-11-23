import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto, VerificationRequestDto } from './profiles.dto.js';

const profileSelect = { id: true, username: true, profile: { select: { fullName: true, university: { select: { name: true } }, campus: { select: { name: true } }, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true, verifiedAt: true } }, _count: { select: { follows: true, followedBy: true, posts: true } } } satisfies Prisma.UserSelect;

@Injectable()
export class ProfilesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async own(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null, deactivatedAt: null }, select: { id: true, username: true, email: true, profile: { select: { fullName: true, university: { select: { name: true } }, campus: { select: { name: true } }, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true, verifiedAt: true } }, _count: { select: { follows: true, followedBy: true, posts: true } } } });
    if (!user) throw new NotFoundException('Profile not found.');
    const { _count, ...publicUser } = user;
    return { user: { ...publicUser, counts: _count } };
  }

  async myVerification(userId: string) {
    const request = await this.prisma.verificationRequest.findFirst({ where: { userId }, orderBy: { submittedAt: 'desc' }, select: { id: true, status: true, submittedAt: true, reviewedAt: true, reviewNote: true } });
    return { request };
  }

  async requestVerification(userId: string, dto: VerificationRequestDto) {
    if (!dto.attestationsAccepted) throw new ForbiddenException('You must confirm that your verification information is accurate.');
    const existing = await this.prisma.verificationRequest.findFirst({ where: { userId, status: 'PENDING' }, select: { id: true } });
    if (existing) throw new ConflictException('You already have a verification request awaiting review.');
    const email = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!email) throw new NotFoundException('Account not found.');
    const studentIdHash = createHash('sha256').update(dto.studentId.trim().toUpperCase()).digest('hex');
    const request = await this.prisma.verificationRequest.create({ data: { userId, email: email.email, phone: dto.phone.trim(), fullName: dto.fullName.trim(), course: dto.course.trim(), campus: dto.campus.trim(), reason: dto.reason.trim(), studentIdHash, status: 'PENDING' }, select: { id: true, status: true, submittedAt: true } });
    // Sensitive ID value is hashed and never stored in the request table. Manual review will be enabled in the admin workspace later.
    return { request, message: 'Verification request submitted. It remains pending until the review process is available.' };
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
        role: { not: 'SUPER_ADMIN' },
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


  async recommended(viewerId: string) {
    const viewer = await this.prisma.profile.findUnique({ where: { userId: viewerId }, select: { campus: { select: { name: true } }, course: true, interests: true } });
    const [blockedRows, mutedRows, followedRows] = await Promise.all([
      this.prisma.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } }),
      this.prisma.accountMute.findMany({ where: { userId: viewerId }, select: { mutedUserId: true } }),
      this.prisma.follow.findMany({ where: { followerId: viewerId }, select: { followedId: true } }),
    ]);
    const excluded = [...blockedRows.map(row => row.blockerId === viewerId ? row.blockedId : row.blockerId), ...mutedRows.map(row => row.mutedUserId), ...followedRows.map(row => row.followedId), viewerId];
    const candidates = await this.prisma.user.findMany({ where: { id: { notIn: excluded }, deletedAt: null, deactivatedAt: null, role: { not: 'SUPER_ADMIN' }, profile: { isPrivate: false, university: { slug: 'university-of-kabianga' } } }, select: profileSelect, orderBy: { createdAt: 'desc' }, take: 100 });
    const viewerInterests = new Set((viewer?.interests ?? []).map(value => value.toLowerCase()));
    const ranked = candidates.map(user => {
      const candidateInterests = (user.profile?.interests ?? []).map(value => value.toLowerCase());
      const shared = candidateInterests.filter(value => viewerInterests.has(value)).length;
      const campusMatch = Boolean(viewer?.campus?.name && user.profile?.campus?.name && viewer.campus.name.toLowerCase() === user.profile.campus.name.toLowerCase());
      const courseMatch = Boolean(viewer?.course && user.profile?.course && viewer.course.toLowerCase() === user.profile.course.toLowerCase());
      return { user, score: shared * 5 + (courseMatch ? 2 : 0) + (campusMatch ? 3 : 0), sharedInterests: shared };
    }).sort((a, b) => b.score - a.score || (b.user._count.followedBy - a.user._count.followedBy)).slice(0, 40);
    return { data: ranked.map(({ user, sharedInterests }) => ({ user: { ...user, profile: user.profile }, sharedInterests })) };
  }


  async byUsername(viewerId: string | undefined, username: string) {
    const user = await this.prisma.user.findFirst({ where: { username: username.toLowerCase(), deletedAt: null, deactivatedAt: null, role: { not: 'SUPER_ADMIN' } }, select: profileSelect });
    if (!user) throw new NotFoundException('Profile not found.');
    if (viewerId && viewerId !== user.id) {
      const blocked = await this.prisma.block.findFirst({ where: { OR: [{ blockerId: viewerId, blockedId: user.id }, { blockerId: user.id, blockedId: viewerId }] } });
      if (blocked) throw new NotFoundException('Profile not found.');
    }
    if (user.profile?.isPrivate && viewerId !== user.id) throw new ForbiddenException('This profile is private.');
    const { isPrivate: _private, ...profile } = user.profile ?? {};
    const isFollowing = viewerId && viewerId !== user.id
      ? Boolean(await this.prisma.follow.findUnique({
          where: { followerId_followedId: { followerId: viewerId, followedId: user.id } },
          select: { followerId: true },
        }))
      : false;
    return { user: { id: user.id, username: user.username, profile, counts: user._count, isFollowing } };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const { username, email, campus, ...profileFields } = dto;
    const profileData: Prisma.ProfileUpdateInput = profileFields;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        if (username) await tx.user.update({ where: { id: userId }, data: { username: username.toLowerCase() } });
        if (email?.trim()) {
          const normalizedEmail = email.trim().toLowerCase();
          const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
          if (!currentUser) throw new NotFoundException('Account not found.');
          if (normalizedEmail !== currentUser.email) await tx.user.update({ where: { id: userId }, data: { email: normalizedEmail, emailVerifiedAt: null } });
        }
        if (campus?.trim()) {
          const currentProfile = await tx.profile.findUnique({ where: { userId }, select: { universityId: true } });
          if (!currentProfile) throw new NotFoundException('Profile not found.');
          const targetCampus = await tx.campus.findFirst({ where: { universityId: currentProfile.universityId, name: { equals: campus.trim(), mode: 'insensitive' } }, select: { id: true } });
          if (!targetCampus) throw new NotFoundException('Campus is not available at your university.');
          profileData.campus = { connect: { id: targetCampus.id } };
        }
        const user = await tx.user.update({ where: { id: userId }, data: { profile: { update: profileData } }, select: { id: true, username: true, email: true, profile: { select: { fullName: true, course: true, yearOfStudy: true, bio: true, photoUrl: true, coverUrl: true, interests: true, skills: true, isPrivate: true, verifiedAt: true } } } });
        return { user };
      });
      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('That username or email address is already in use.');
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
      orderBy: direction === 'followers' ? [{ createdAt: 'desc' }, { followerId: 'desc' }] : [{ createdAt: 'desc' }, { followedId: 'desc' }], take: 21,
      ...(cursor ? { cursor: { followerId_followedId: direction === 'followers' ? { followerId: cursor, followedId: target.id } : { followerId: target.id, followedId: cursor } }, skip: 1 } : {}),
      include: { follower: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } }, followed: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } } },
    });
    const hasMore = rows.length > 20; const data = rows.slice(0, 20).map((row) => direction === 'followers' ? row.follower : row.followed);
    return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }
}
