import { ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCommentDto, CreatePostDto } from './posts.dto.js';

const authorSelect = { id: true, username: true, profile: { select: { fullName: true, photoUrl: true, campus: { select: { name: true } } } } } satisfies Prisma.UserSelect;
const pageSize = 20;

@Injectable()
export class PostsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async feed(viewerId: string | undefined, cursor?: string, following = false) {
    if (following && !viewerId) throw new UnauthorizedException('Sign in to view your following feed.');
    const blockedByViewer = viewerId ? await this.prisma.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }) : [];
    const blockedViewer = viewerId ? await this.prisma.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }) : [];
    const excluded = [...blockedByViewer.map((entry) => entry.blockedId), ...blockedViewer.map((entry) => entry.blockerId)];
    const followingIds = following && viewerId ? [viewerId, ...(await this.prisma.follow.findMany({ where: { followerId: viewerId }, select: { followedId: true } })).map((entry) => entry.followedId)] : undefined;
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null, author: { deletedAt: null, deactivatedAt: null, profile: { university: { slug: 'university-of-kabianga' } } }, AND: [{ authorId: { notIn: excluded } }, ...(followingIds ? [{ authorId: { in: followingIds } }] : [])] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { author: { select: authorSelect }, _count: { select: { likes: true, comments: true, reposts: true, views: true } }, ...(viewerId ? { likes: { where: { userId: viewerId }, select: { userId: true } }, bookmarks: { where: { userId: viewerId }, select: { userId: true } }, views: { where: { userId: viewerId }, select: { userId: true } } } : {}) },
    });
    const hasMore = posts.length > pageSize;
    const data = posts.slice(0, pageSize).map(({ likes, bookmarks, views, ...post }) => ({ ...post, liked: Boolean(likes?.length), bookmarked: Boolean(bookmarks?.length), viewed: Boolean(views?.length) }));
    return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }

  async recordView(userId: string, postId: string) {
    await this.assertCanInteract(userId, postId);
    await this.prisma.postView.upsert({ where: { userId_postId: { userId, postId } }, update: {}, create: { userId, postId } });
    const views = await this.prisma.postView.count({ where: { postId } });
    return { viewed: true, views };
  }


  async create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({ data: { authorId, content: dto.content.trim() }, include: { author: { select: authorSelect }, _count: { select: { likes: true, comments: true } } } });
  }

  async edit(authorId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, deletedAt: true } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found.');
    if (post.authorId !== authorId) throw new ForbiddenException('You cannot edit this post.');
    return this.prisma.post.update({ where: { id: postId }, data: { content: content.trim() }, include: { author: { select: authorSelect } } });
  }

  async delete(authorId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, deletedAt: true } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found.');
    if (post.authorId !== authorId) throw new ForbiddenException('You cannot delete this post.');
    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    return { message: 'Post deleted.' };
  }

  async toggleLike(userId: string, postId: string, enabled: boolean) {
    const post = await this.assertCanInteract(userId, postId);
    if (enabled) {
      const created = await this.prisma.like.createMany({ data: [{ userId, postId }], skipDuplicates: true });
      if (created.count && post.authorId !== userId) await this.prisma.notification.create({ data: { recipientId: post.authorId, actorId: userId, type: 'LIKE', entityId: postId } });
    } else await this.prisma.like.deleteMany({ where: { userId, postId } });
    return { liked: enabled };
  }

  async toggleBookmark(userId: string, postId: string, enabled: boolean) {
    await this.assertCanInteract(userId, postId);
    if (enabled) await this.prisma.bookmark.upsert({ where: { userId_postId: { userId, postId } }, update: {}, create: { userId, postId } });
    else await this.prisma.bookmark.deleteMany({ where: { userId, postId } });
    return { bookmarked: enabled };
  }

  async toggleRepost(userId: string, postId: string, enabled: boolean) {
    const post = await this.assertCanInteract(userId, postId);
    if (enabled) {
      const created = await this.prisma.repost.createMany({ data: [{ userId, postId }], skipDuplicates: true });
      if (created.count && post.authorId !== userId) await this.prisma.notification.create({ data: { recipientId: post.authorId, actorId: userId, type: 'REPOST', entityId: postId } });
    } else await this.prisma.repost.deleteMany({ where: { userId, postId } });
    return { reposted: enabled };
  }

  async comment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.assertCanInteract(userId, postId);
    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({ where: { id: dto.parentId, postId, deletedAt: null }, select: { id: true } });
      if (!parent) throw new NotFoundException('Parent comment not found.');
    }
    const comment = await this.prisma.comment.create({ data: { postId, authorId: userId, content: dto.content.trim(), parentId: dto.parentId }, include: { author: { select: authorSelect } } });
    if (post.authorId !== userId) await this.prisma.notification.create({ data: { recipientId: post.authorId, actorId: userId, type: dto.parentId ? 'REPLY' : 'COMMENT', entityId: comment.id } });
    return comment;
  }

  async comments(postId: string, cursor?: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found.');
    const rows = await this.prisma.comment.findMany({ where: { postId, parentId: null, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { author: { select: authorSelect }, replies: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, take: 30, include: { author: { select: authorSelect } } } } });
    const hasMore = rows.length > pageSize;
    const data = rows.slice(0, pageSize);
    return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }

  private async assertCanInteract(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true, authorId: true } });
    if (!post) throw new NotFoundException('Post not found.');
    if (post.authorId !== userId && await this.prisma.block.findFirst({ where: { OR: [{ blockerId: userId, blockedId: post.authorId }, { blockerId: post.authorId, blockedId: userId }] }, select: { blockerId: true } })) throw new NotFoundException('Post not found.');
    return post;
  }
}
