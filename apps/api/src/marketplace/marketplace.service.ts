import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListingAvailabilityDto, ListingDto, ListingQueryDto } from './marketplace.dto.js';

const safeSeller = { id: true, username: true, profile: { select: { fullName: true, photoUrl: true, campus: { select: { name: true } } } } } satisfies Prisma.UserSelect;
const listingInclude = { seller: { select: safeSeller }, campus: { select: { id: true, name: true, university: { select: { name: true } } } }, _count: { select: { favorites: true } } } satisfies Prisma.ListingInclude;

@Injectable()
export class MarketplaceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: ListingQueryDto, viewerId?: string) {
    const profile = viewerId ? await this.prisma.profile.findUnique({ where: { userId: viewerId }, select: { campusId: true } }) : null;
    const blocked = viewerId ? await this.prisma.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } }) : [];
    const excluded = blocked.map((row) => row.blockerId === viewerId ? row.blockedId : row.blockerId);
    const listings = await this.prisma.listing.findMany({
      where: { deletedAt: null, campus: { university: { slug: 'university-of-kabianga' } }, seller: { deletedAt: null, deactivatedAt: null }, ...(profile ? { campusId: profile.campusId } : {}), sellerId: { notIn: excluded }, available: true,
        ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}),
        ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
        ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { price: { ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}) } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: listingInclude,
    });
    const hasMore = listings.length > 20; const data = listings.slice(0, 20);
    return { data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null };
  }

  async get(id: string, viewerId?: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, deletedAt: null }, include: listingInclude });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (viewerId && viewerId !== listing.sellerId && await this.prisma.block.findFirst({ where: { OR: [{ blockerId: viewerId, blockedId: listing.sellerId }, { blockerId: listing.sellerId, blockedId: viewerId }] } })) throw new NotFoundException('Listing not found.');
    return listing;
  }

  async create(sellerId: string, dto: ListingDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: sellerId }, select: { campusId: true } });
    if (!profile) throw new NotFoundException('Complete your student profile before listing an item.');
    return this.prisma.listing.create({ data: { sellerId, campusId: profile.campusId, ...dto, price: new Prisma.Decimal(dto.price) }, include: listingInclude });
  }

  async update(sellerId: string, id: string, dto: ListingDto) {
    const owned = await this.prisma.listing.findFirst({ where: { id, sellerId, deletedAt: null }, select: { id: true } });
    if (!owned) throw new NotFoundException('Listing not found.');
    return this.prisma.listing.update({ where: { id }, data: { ...dto, price: new Prisma.Decimal(dto.price) }, include: listingInclude });
  }

  async remove(sellerId: string, id: string) {
    const owned = await this.prisma.listing.findFirst({ where: { id, sellerId, deletedAt: null }, select: { id: true } });
    if (!owned) throw new NotFoundException('Listing not found.');
    await this.prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } }); return { message: 'Listing removed.' };
  }

  async setAvailable(sellerId: string, id: string, dto: ListingAvailabilityDto) {
    const owned = await this.prisma.listing.findFirst({ where: { id, sellerId, deletedAt: null }, select: { id: true } });
    if (!owned) throw new NotFoundException('Listing not found.');
    return this.prisma.listing.update({ where: { id }, data: { available: dto.available } });
  }

  async favorite(userId: string, id: string, enabled: boolean) {
    const listing = await this.prisma.listing.findFirst({ where: { id, deletedAt: null }, select: { sellerId: true } });
    if (!listing) throw new NotFoundException('Listing not found.');
    if (listing.sellerId === userId) throw new ForbiddenException('You cannot favorite your own listing.');
    const blocked = await this.prisma.block.findFirst({ where: { OR: [{ blockerId: userId, blockedId: listing.sellerId }, { blockerId: listing.sellerId, blockedId: userId }] } });
    if (blocked) throw new NotFoundException('Listing not found.');
    if (enabled) await this.prisma.listingFavorite.upsert({ where: { userId_listingId: { userId, listingId: id } }, update: {}, create: { userId, listingId: id } });
    else await this.prisma.listingFavorite.deleteMany({ where: { userId, listingId: id } });
    return { favorited: enabled };
  }
}
