import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infra/database';
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

@Injectable()
export class PrismaHobbyRepository implements HobbyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListHobbiesQuery): Promise<ListHobbiesResult> {
    const where: Prisma.CatalogHobbyWhereInput = { status: 'active' };

    if (query.filter.categorySlug) {
      const category = await this.prisma.catalogHobbyCategory.findUnique({
        where: { slug: query.filter.categorySlug },
        select: { id: true },
      });
      where.categoryId = category ? category.id : NO_SUCH_CATEGORY;
    }

    if (query.filter.difficulty && query.filter.difficulty.length > 0) {
      where.difficulty = { in: query.filter.difficulty };
    }

    if (query.filter.q) {
      where.name = { contains: query.filter.q, mode: 'insensitive' };
    }

    if (query.cursor) {
      const { name, id } = query.cursor;
      where.OR = [{ name: { gt: name } }, { name, id: { gt: id } }];
    }

    const records = await this.prisma.catalogHobby.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const hasMore = records.length > query.limit;
    const page = records.slice(0, query.limit);

    return { items: page.map(toDomainHobby), hasMore };
  }

  async findBySlugOrId(slugOrId: string): Promise<Hobby | null> {
    const record = isValidUlid(slugOrId)
      ? await this.prisma.catalogHobby.findFirst({ where: { id: slugOrId, status: 'active' } })
      : await this.prisma.catalogHobby.findFirst({
          where: { slug: slugOrId, status: 'active' },
        });

    return record ? toDomainHobby(record) : null;
  }
}
