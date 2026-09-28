import { HobbyCategory, type HobbyCategoryProps } from '../../../domain';
import type { HobbyCategoryRepository } from '../../ports/hobby-category.repository.port';

function propsOf(category: HobbyCategory): HobbyCategoryProps {
  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export class InMemoryHobbyCategoryRepository implements HobbyCategoryRepository {
  private readonly records: HobbyCategoryProps[] = [];

  seed(records: HobbyCategoryProps[]): void {
    this.records.push(...records);
  }

  async findAllOrdered(): Promise<HobbyCategory[]> {
    return [...this.records]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((props) => HobbyCategory.reconstitute(props));
  }

  async findBySlug(slug: string): Promise<HobbyCategory | null> {
    const found = this.records.find((record) => record.slug === slug);
    return found ? HobbyCategory.reconstitute(found) : null;
  }

  async findById(id: string): Promise<HobbyCategory | null> {
    const found = this.records.find((record) => record.id === id);
    return found ? HobbyCategory.reconstitute(found) : null;
  }

  async create(category: HobbyCategory): Promise<HobbyCategory> {
    this.records.push(propsOf(category));
    return category;
  }

  async update(category: HobbyCategory): Promise<HobbyCategory> {
    const index = this.records.findIndex((record) => record.id === category.id);
    if (index >= 0) this.records[index] = propsOf(category);
    return category;
  }
}
