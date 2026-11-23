import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventDto, EventQueryDto } from './events.dto.js';

const eventInclude = { owner: { select: { id: true, username: true, profile: { select: { fullName: true, photoUrl: true } } } }, campus: { select: { id: true, name: true, university: { select: { name: true } } } }, _count: { select: { interests: true } } } satisfies Prisma.EventInclude;

@Injectable()
export class EventsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: EventQueryDto, viewerId?: string) {
    const profile = viewerId ? await this.prisma.profile.findUnique({ where: { userId: viewerId }, select: { campusId: true } }) : null;
    const blocked = viewerId ? await this.prisma.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } }) : [];
    const excluded = blocked.map((row) => row.blockerId === viewerId ? row.blockedId : row.blockerId);
    const where: Prisma.EventWhereInput = { deletedAt: null, startsAt: { ...(query.from ? { gte: new Date(query.from) } : { gte: new Date() }), ...(query.to ? { lte: new Date(query.to) } : {}) }, campus: { university: { slug: 'university-of-kabianga' } }, owner: { deletedAt: null, deactivatedAt: null }, ...(profile ? { campusId: profile.campusId } : {}), ownerId: { notIn: excluded }, ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}), ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }, { venue: { contains: query.search, mode: 'insensitive' } }] } : {}) };
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) throw new BadRequestException('The event date range is invalid.');
    const rows = await this.prisma.event.findMany({ where, orderBy: query.sort === 'NEWEST' ? [{ createdAt: 'desc' }, { id: 'desc' }] : [{ startsAt: 'asc' }, { id: 'asc' }], take: 21, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: eventInclude });
    const hasMore = rows.length > 20; const data = rows.slice(0, 20);
    return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }

  async get(id: string) {
    const event = await this.prisma.event.findFirst({ where: { id, deletedAt: null }, include: eventInclude });
    if (!event) throw new NotFoundException('Event not found.'); return event;
  }

  private async ownerCampus(ownerId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: ownerId }, select: { campusId: true } });
    if (!profile) throw new NotFoundException('Complete your student profile before creating an event.'); return profile.campusId;
  }

  private validateDates(dto: EventDto) {
    const startsAt = new Date(dto.startsAt); const endsAt = new Date(dto.endsAt);
    if (startsAt <= new Date() || endsAt <= startsAt) throw new BadRequestException('Event end must be after its future start time.');
    return { startsAt, endsAt };
  }

  async create(ownerId: string, dto: EventDto) {
    const campusId = await this.ownerCampus(ownerId); const { startsAt, endsAt } = this.validateDates(dto);
    return this.prisma.event.create({ data: { ownerId, campusId, title: dto.title.trim(), description: dto.description.trim(), category: dto.category.trim(), venue: dto.venue.trim(), startsAt, endsAt, imageUrl: dto.imageUrl }, include: eventInclude });
  }

  async update(ownerId: string, id: string, dto: EventDto) {
    const existing = await this.prisma.event.findFirst({ where: { id, deletedAt: null }, select: { ownerId: true } });
    if (!existing) throw new NotFoundException('Event not found.'); if (existing.ownerId !== ownerId) throw new ForbiddenException('You cannot edit this event.');
    const { startsAt, endsAt } = this.validateDates(dto);
    return this.prisma.event.update({ where: { id }, data: { title: dto.title.trim(), description: dto.description.trim(), category: dto.category.trim(), venue: dto.venue.trim(), startsAt, endsAt, imageUrl: dto.imageUrl }, include: eventInclude });
  }

  async remove(ownerId: string, id: string) {
    const existing = await this.prisma.event.findFirst({ where: { id, deletedAt: null }, select: { ownerId: true } });
    if (!existing) throw new NotFoundException('Event not found.'); if (existing.ownerId !== ownerId) throw new ForbiddenException('You cannot delete this event.');
    await this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } }); return { message: 'Event removed.' };
  }

  async interest(userId: string, id: string, interested: boolean) {
    const event = await this.prisma.event.findFirst({ where: { id, deletedAt: null }, select: { id: true } }); if (!event) throw new NotFoundException('Event not found.');
    if (interested) await this.prisma.eventInterest.upsert({ where: { userId_eventId: { userId, eventId: id } }, update: {}, create: { userId, eventId: id } });
    else await this.prisma.eventInterest.deleteMany({ where: { userId, eventId: id } });
    return { interested };
  }
}
