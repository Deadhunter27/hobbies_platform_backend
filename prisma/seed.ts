import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { newId } from '../src/shared/utils/id';
import { categorySeeds } from './seed-data/categories';
import { hobbySeeds } from './seed-data/hobbies';

const prisma = new PrismaClient();
const logger = pino({ name: 'prisma-seed' });

/**
 * Idempotent starter taxonomy (ADR-0016): upserts by slug, so re-running
 * this script never duplicates rows or clobbers unrelated fields.
 */
async function main(): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();

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

    await prisma.catalogHobby.upsert({
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
    logger.info({ slug: hobby.slug }, 'Seeded hobby');
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
