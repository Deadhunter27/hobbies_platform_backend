import { PrismaClient, type HobbyDifficulty, type HobbyStatus } from '@prisma/client';
import type { PrismaService } from '@infra/database';
import { PrismaHobbyRepository } from '@modules/catalog/infrastructure/prisma-hobby.repository';
import { newId } from '@shared/utils';
import { describeIfDb } from '../../support/db-test.helper';

describeIfDb('PrismaHobbyRepository (integration)', () => {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const repository = new PrismaHobbyRepository(prisma as unknown as PrismaService);

  let categoryId: string;

  beforeEach(async () => {
    await prisma.catalogHobby.deleteMany();
    await prisma.catalogHobbyCategory.deleteMany();

    categoryId = newId();
    await prisma.catalogHobbyCategory.create({
      data: { id: categoryId, slug: 'test-category', name: 'Test Category', sortOrder: 0 },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createHobby(
    overrides: {
      name?: string;
      slug?: string;
      difficulty?: HobbyDifficulty;
      status?: HobbyStatus;
    } = {},
  ): Promise<string> {
    const id = newId();
    await prisma.catalogHobby.create({
      data: {
        id,
        categoryId,
        name: overrides.name ?? 'Hobby',
        slug: overrides.slug ?? `hobby-${id}`,
        difficulty: overrides.difficulty ?? 'beginner_friendly',
        costLevel: 'free',
        setting: 'outdoor',
        status: overrides.status ?? 'active',
      },
    });
    return id;
  }

  it('list is stable across a concurrent insert between pages', async () => {
    await createHobby({ name: 'Alpha', slug: 'alpha' });
    await createHobby({ name: 'Charlie', slug: 'charlie' });
    await createHobby({ name: 'Echo', slug: 'echo' });

    const page1 = await repository.list({ filter: {}, limit: 2 });
    expect(page1.items.map((hobby) => hobby.name)).toEqual(['Alpha', 'Charlie']);
    expect(page1.hasMore).toBe(true);

    // Insert a row that sorts between the two already-handed-out pages.
    await createHobby({ name: 'Bravo', slug: 'bravo' });

    const last = page1.items.at(-1)!;
    const page2 = await repository.list({
      filter: {},
      limit: 2,
      cursor: { name: last.name, id: last.id },
    });

    expect(page2.items.map((hobby) => hobby.name)).toEqual(['Echo']);
    expect(page2.hasMore).toBe(false);
  });

  it('findBySlugOrId resolves by slug and by id, and excludes non-active hobbies', async () => {
    const id = await createHobby({ name: 'Padel', slug: 'padel' });
    await createHobby({ name: 'Draft Hobby', slug: 'draft-hobby', status: 'draft' });

    const bySlug = await repository.findBySlugOrId('padel');
    const byId = await repository.findBySlugOrId(id);
    const draft = await repository.findBySlugOrId('draft-hobby');

    expect(bySlug?.id).toBe(id);
    expect(byId?.id).toBe(id);
    expect(draft).toBeNull();
  });

  it('an unknown category slug yields an empty page, not an unfiltered one', async () => {
    await createHobby();

    const result = await repository.list({
      filter: { categorySlug: 'no-such-category' },
      limit: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('treats LIKE wildcards in q as literal characters', async () => {
    await createHobby({ name: 'Alpha', slug: 'alpha' });
    await createHobby({ name: '100% Cotton Crafts', slug: 'cotton-crafts' });

    const wildcardOnly = await repository.list({ filter: { q: '%' }, limit: 10 });
    const literalMatch = await repository.list({ filter: { q: '100%' }, limit: 10 });

    expect(wildcardOnly.items.map((hobby) => hobby.name)).toEqual(['100% Cotton Crafts']);
    expect(literalMatch.items.map((hobby) => hobby.name)).toEqual(['100% Cotton Crafts']);
  });

  it('rejects a duplicate slug at the database level', async () => {
    await createHobby({ slug: 'duplicate-slug' });

    await expect(
      prisma.catalogHobby.create({
        data: {
          id: newId(),
          categoryId,
          name: 'Another',
          slug: 'duplicate-slug',
          difficulty: 'beginner_friendly',
          costLevel: 'free',
          setting: 'outdoor',
          status: 'active',
        },
      }),
    ).rejects.toThrow();
  });
});
