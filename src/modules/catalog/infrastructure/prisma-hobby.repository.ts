import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxContext } from '@shared/application';
import { PrismaService, prismaClientOf } from '@infra/database';
import { isValidUlid } from '@shared/utils';
import type { Hobby } from '../domain';
import type {
  HobbyRepository,
  ListHobbiesQuery,
  ListHobbiesResult,
} from '../application/ports/hobby.repository.port';
import { toDomainHobby } from './mappers/hobby.mapper';

/** Sentinel categoryId that matches no row — an unknown category slug must
 * yield an empty page, not "no category filter applied". */
const NO_SUCH_CATEGORY = '00000000000000000000000000';

/** Prisma's `contains` passes % and _ through to LIKE unescaped, so a query
 * of "%" would match every row instead of names containing a literal "%". */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class PrismaHobbyRepository implements HobbyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListHobbiesQuery, tx?: TxContext): Promise<ListHobbiesResult> {
    const client = prismaClientOf(this.prisma, tx);
    const where: Prisma.CatalogHobbyWhereInput = { status: 'active' };

    if (query.filter.categorySlug) {
      const category = await client.catalogHobbyCategory.findUnique({
        where: { slug: query.filter.categorySlug },
        select: { id: true },
      });
      where.categoryId = category ? category.id : NO_SUCH_CATEGORY;
    }

    if (query.filter.difficulty && query.filter.difficulty.length > 0) {
      where.difficulty = { in: query.filter.difficulty };
    }

    if (query.filter.q) {
      where.name = { contains: escapeLikeWildcards(query.filter.q), mode: 'insensitive' };
    }

    if (query.cursor) {
      const { name, id } = query.cursor;
      where.OR = [{ name: { gt: name } }, { name, id: { gt: id } }];
    }

    const records = await client.catalogHobby.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const hasMore = records.length > query.limit;
    const page = records.slice(0, query.limit);

    return { items: page.map(toDomainHobby), hasMore };
  }

  async findBySlugOrId(slugOrId: string, tx?: TxContext): Promise<Hobby | null> {
    const client = prismaClientOf(this.prisma, tx);
    const record = isValidUlid(slugOrId)
      ? await client.catalogHobby.findFirst({ where: { id: slugOrId, status: 'active' } })
      : await client.catalogHobby.findFirst({
          where: { slug: slugOrId, status: 'active' },
        });

    return record ? toDomainHobby(record) : null;
  }

  async findAnyById(id: string, tx?: TxContext): Promise<Hobby | null> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobby.findUnique({ where: { id } });
    return record ? toDomainHobby(record) : null;
  }

  async findAnyBySlug(slug: string, tx?: TxContext): Promise<Hobby | null> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobby.findUnique({
      where: { slug },
    });
    return record ? toDomainHobby(record) : null;
  }

  async create(hobby: Hobby, tx?: TxContext): Promise<Hobby> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobby.create({
      data: {
        id: hobby.id,
        categoryId: hobby.categoryId,
        name: hobby.name,
        slug: hobby.slug,
        description: hobby.description,
        difficulty: hobby.difficulty,
        costLevel: hobby.costLevel,
        setting: hobby.setting,
        status: hobby.status,
      },
    });
    return toDomainHobby(record);
  }

  async update(hobby: Hobby, tx?: TxContext): Promise<Hobby> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobby.update({
      where: { id: hobby.id },
      data: {
        categoryId: hobby.categoryId,
        name: hobby.name,
        slug: hobby.slug,
        description: hobby.description,
        difficulty: hobby.difficulty,
        costLevel: hobby.costLevel,
        setting: hobby.setting,
        status: hobby.status,
      },
    });
    return toDomainHobby(record);
  }
}
