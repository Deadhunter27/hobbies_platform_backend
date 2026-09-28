import { Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { PrismaService, prismaClientOf } from '@infra/database';
import type { HobbyCategory } from '../domain';
import type { HobbyCategoryRepository } from '../application/ports/hobby-category.repository.port';
import { toDomainHobbyCategory } from './mappers/hobby-category.mapper';

@Injectable()
export class PrismaHobbyCategoryRepository implements HobbyCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllOrdered(tx?: TxContext): Promise<HobbyCategory[]> {
    const records = await prismaClientOf(this.prisma, tx).catalogHobbyCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return records.map(toDomainHobbyCategory);
  }

  async findBySlug(slug: string, tx?: TxContext): Promise<HobbyCategory | null> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobbyCategory.findUnique({
      where: { slug },
    });
    return record ? toDomainHobbyCategory(record) : null;
  }

  async findById(id: string, tx?: TxContext): Promise<HobbyCategory | null> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobbyCategory.findUnique({
      where: { id },
    });
    return record ? toDomainHobbyCategory(record) : null;
  }

  async create(category: HobbyCategory, tx?: TxContext): Promise<HobbyCategory> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobbyCategory.create({
      data: {
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
      },
    });
    return toDomainHobbyCategory(record);
  }

  async update(category: HobbyCategory, tx?: TxContext): Promise<HobbyCategory> {
    const record = await prismaClientOf(this.prisma, tx).catalogHobbyCategory.update({
      where: { id: category.id },
      data: {
        parentId: category.parentId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
      },
    });
    return toDomainHobbyCategory(record);
  }
}
