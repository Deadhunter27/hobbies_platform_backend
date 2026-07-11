import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/database';
import type { HobbyCategory } from '../domain';
import type { HobbyCategoryRepository } from '../application/ports/hobby-category.repository.port';
import { toDomainHobbyCategory } from './mappers/hobby-category.mapper';

@Injectable()
export class PrismaHobbyCategoryRepository implements HobbyCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllOrdered(): Promise<HobbyCategory[]> {
    const records = await this.prisma.catalogHobbyCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return records.map(toDomainHobbyCategory);
  }

  async findBySlug(slug: string): Promise<HobbyCategory | null> {
    const record = await this.prisma.catalogHobbyCategory.findUnique({ where: { slug } });
    return record ? toDomainHobbyCategory(record) : null;
  }
}
