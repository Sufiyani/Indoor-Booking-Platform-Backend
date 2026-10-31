import { SportType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class CourtsService {
  async getAllCourts(sport?: SportType, activeOnly = true) {
    const where: any = {};
    if (activeOnly) where.isActive = true;
    if (sport) where.sport = sport;

    return prisma.court.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        amenities: {
          include: { amenity: true },
        },
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });
  }

  async getCourtBySlug(slug: string) {
    const court = await prisma.court.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        amenities: {
          include: { amenity: true },
        },
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        pricingRules: { where: { isActive: true } },
      },
    });

    if (!court) {
      throw new AppError('Court not found', 404);
    }

    return court;
  }

  async getCourtById(id: string) {
    const court = await prisma.court.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        amenities: {
          include: { amenity: true },
        },
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        pricingRules: true,
      },
    });

    if (!court) {
      throw new AppError('Court not found', 404);
    }

    return court;
  }

  async createCourt(data: {
    name: string;
    sport: SportType;
    description: string;
    basePricePerHour: number;
    capacity?: number;
    courtType?: string;
    slotDurationMinutes?: number;
    bufferMinutes?: number;
    isActive?: boolean;
    amenityIds?: string[];
    images?: Array<{ url: string; caption?: string | null; isPrimary?: boolean }>;
  }) {
    // Generate slug from name
    let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let existing = await prisma.court.findUnique({ where: { slug } });
    let counter = 1;
    while (existing) {
      slug = `${slug}-${counter}`;
      existing = await prisma.court.findUnique({ where: { slug } });
      counter++;
    }

    const court = await prisma.court.create({
      data: {
        name: data.name,
        slug,
        sport: data.sport,
        description: data.description,
        basePricePerHour: data.basePricePerHour,
        capacity: data.capacity ?? 10,
        courtType: data.courtType ?? 'Indoor Turf',
        slotDurationMinutes: data.slotDurationMinutes ?? 60,
        bufferMinutes: data.bufferMinutes ?? 0,
        isActive: data.isActive ?? true,
        amenities: data.amenityIds
          ? {
              create: data.amenityIds.map((amenityId) => ({ amenityId })),
            }
          : undefined,
        images: data.images
          ? {
              create: data.images.map((img, i) => ({
                url: img.url,
                caption: img.caption,
                isPrimary: img.isPrimary ?? (i === 0),
                displayOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        amenities: { include: { amenity: true } },
      },
    });

    // Create default operating hours (09:00 to 00:00 every day)
    for (let day = 0; day <= 6; day++) {
      await prisma.operatingHours.create({
        data: {
          courtId: court.id,
          dayOfWeek: day,
          openTime: '09:00',
          closeTime: '00:00',
          isClosed: false,
        },
      });
    }

    return court;
  }

  async updateCourt(id: string, data: any) {
    const existing = await prisma.court.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Court not found', 404);
    }

    const { amenityIds, images, ...courtData } = data;

    // Handle amenity updates if provided
    if (amenityIds) {
      await prisma.courtAmenity.deleteMany({ where: { courtId: id } });
      await prisma.courtAmenity.createMany({
        data: amenityIds.map((amenityId: string) => ({ courtId: id, amenityId })),
      });
    }

    // Handle image updates if provided
    if (images) {
      await prisma.courtImage.deleteMany({ where: { courtId: id } });
      await prisma.courtImage.createMany({
        data: images.map((img: any, i: number) => ({
          courtId: id,
          url: img.url,
          caption: img.caption,
          isPrimary: img.isPrimary ?? (i === 0),
          displayOrder: i,
        })),
      });
    }

    return prisma.court.update({
      where: { id },
      data: courtData,
      include: {
        images: true,
        amenities: { include: { amenity: true } },
        operatingHours: true,
      },
    });
  }

  async toggleActive(id: string) {
    const court = await prisma.court.findUnique({ where: { id } });
    if (!court) {
      throw new AppError('Court not found', 404);
    }
    return prisma.court.update({
      where: { id },
      data: { isActive: !court.isActive },
    });
  }

  async getAmenities() {
    return prisma.amenity.findMany({ orderBy: { name: 'asc' } });
  }
}

export const courtsService = new CourtsService();

