import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { newId } from '../src/shared/utils/id';
import { activitySeeds } from './seed-data/activities';
import { categorySeeds } from './seed-data/categories';
import { communitySeeds } from './seed-data/communities';
import { hobbySeeds } from './seed-data/hobbies';

const prisma = new PrismaClient();
const logger = pino({ name: 'prisma-seed' });

function futureStart(offsetDays: number): Date {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

/**
 * Idempotent starter taxonomy + Running real-world loop supply. Catalog rows
 * upsert by slug; W4/W7 fixtures use stable ULIDs so development seeds can rerun.
 */
async function main(): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();
  const hobbyIdBySlug = new Map<string, string>();

  for (const category of categorySeeds) {
    const record = await prisma.catalogHobbyCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
      create: {
        id: newId(),
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
    });
    categoryIdBySlug.set(category.slug, record.id);
    logger.info({ slug: category.slug }, 'Seeded hobby category');
  }

  for (const hobby of hobbySeeds) {
    const categoryId = categoryIdBySlug.get(hobby.categorySlug);
    if (!categoryId) {
      throw new Error(
        `Seed data error: unknown category slug "${hobby.categorySlug}" for hobby "${hobby.slug}".`,
      );
    }

    const record = await prisma.catalogHobby.upsert({
      where: { slug: hobby.slug },
      update: {
        name: hobby.name,
        description: hobby.description,
        categoryId,
        difficulty: hobby.difficulty,
        costLevel: hobby.costLevel,
        setting: hobby.setting,
        status: 'active',
      },
      create: {
        id: newId(),
        slug: hobby.slug,
        name: hobby.name,
        description: hobby.description,
        categoryId,
        difficulty: hobby.difficulty,
        costLevel: hobby.costLevel,
        setting: hobby.setting,
        status: 'active',
      },
    });
    hobbyIdBySlug.set(hobby.slug, record.id);
    logger.info({ slug: hobby.slug }, 'Seeded hobby');
  }

  for (const community of communitySeeds) {
    const hobbyId = hobbyIdBySlug.get(community.hobbySlug);
    if (!hobbyId) {
      throw new Error(
        `Seed data error: unknown hobby slug "${community.hobbySlug}" for community "${community.name}".`,
      );
    }

    const record = await prisma.community.upsert({
      where: { slug: community.slug },
      update: {
        hobbyId,
        name: community.name,
        description: community.description,
        city: community.city,
        countryCode: community.countryCode,
        status: 'published',
      },
      create: {
        id: community.id,
        hobbyId,
        name: community.name,
        slug: community.slug,
        description: community.description,
        city: community.city,
        countryCode: community.countryCode,
        status: 'published',
      },
    });

    for (const member of community.members) {
      await prisma.communityMembership.upsert({
        where: {
          communityId_userId: {
            communityId: record.id,
            userId: member.userId,
          },
        },
        update: {
          displayNameSnapshot: member.displayNameSnapshot,
          role: member.role,
          state: 'active',
          leftAt: null,
        },
        create: {
          id: member.id,
          communityId: record.id,
          userId: member.userId,
          displayNameSnapshot: member.displayNameSnapshot,
          role: member.role,
          state: 'active',
          joinedAt: new Date(),
        },
      });
    }
    logger.info({ communityId: record.id, slug: community.slug }, 'Seeded community context');
  }

  for (const activity of activitySeeds) {
    const hobbyId = hobbyIdBySlug.get(activity.hobbySlug);
    if (!hobbyId) {
      throw new Error(
        `Seed data error: unknown hobby slug "${activity.hobbySlug}" for activity "${activity.title}".`,
      );
    }
    const startsAt = futureStart(activity.startOffsetDays);
    const endsAt = new Date(startsAt.getTime() + activity.durationMinutes * 60 * 1000);
    await prisma.activity.upsert({
      where: { id: activity.id },
      update: {
        hobbyId,
        title: activity.title,
        description: activity.description,
        activityType: activity.activityType,
        startsAt,
        endsAt,
        timezone: activity.timezone,
        placeName: activity.placeName,
        addressLabel: activity.addressLabel,
        latitude: activity.latitude,
        longitude: activity.longitude,
        hostName: activity.hostName,
        hostType: activity.hostType,
        hostReferenceId: activity.hostReferenceId,
        communityReferenceId: activity.communityReferenceId,
        effortLevel: activity.effortLevel,
        capacity: activity.capacity,
        status: 'published',
        preparation: activity.preparation,
        expectations: activity.expectations,
      },
      create: {
        id: activity.id,
        hobbyId,
        title: activity.title,
        description: activity.description,
        activityType: activity.activityType,
        startsAt,
        endsAt,
        timezone: activity.timezone,
        placeName: activity.placeName,
        addressLabel: activity.addressLabel,
        latitude: activity.latitude,
        longitude: activity.longitude,
        hostName: activity.hostName,
        hostType: activity.hostType,
        hostReferenceId: activity.hostReferenceId,
        communityReferenceId: activity.communityReferenceId,
        effortLevel: activity.effortLevel,
        capacity: activity.capacity,
        status: 'published',
        preparation: activity.preparation,
        expectations: activity.expectations,
      },
    });
    logger.info({ activityId: activity.id, title: activity.title }, 'Seeded activity');
  }
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
