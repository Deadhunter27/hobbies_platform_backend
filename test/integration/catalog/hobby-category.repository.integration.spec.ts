import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '@infra/database';
import { PrismaHobbyCategoryRepository } from '@modules/catalog/infrastructure/prisma-hobby-category.repository';
import { newId } from '@shared/utils';
import { describeIfDb } from '../../support/db-test.helper';

describeIfDb('PrismaHobbyCategoryRepository (integration)', () => {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const repository = new PrismaHobbyCategoryRepository(prisma as unknown as PrismaService);

  beforeEach(async () => {
    await prisma.catalogHobby.deleteMany();
    await prisma.catalogHobbyCategory.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('findAllOrdered returns categories ordered by sortOrder then id', async () => {
    await prisma.catalogHobbyCategory.createMany({
      data: [
        { id: newId(), slug: 'b', name: 'B', sortOrder: 2 },
        { id: newId(), slug: 'a', name: 'A', sortOrder: 1 },
      ],
    });

    const result = await repository.findAllOrdered();

    expect(result.map((category) => category.slug)).toEqual(['a', 'b']);
  });

  it('findBySlug returns null for an unknown slug', async () => {
    const result = await repository.findBySlug('does-not-exist');
    expect(result).toBeNull();
  });

  it('findBySlug returns the matching category', async () => {
    const id = newId();
    await prisma.catalogHobbyCategory.create({
      data: { id, slug: 'sports', name: 'Sports', sortOrder: 0 },
    });

    const result = await repository.findBySlug('sports');

    expect(result?.id).toBe(id);
  });
});
