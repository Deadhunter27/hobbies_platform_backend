import { HobbyCategory, type HobbyCategoryProps } from '../../../domain';
import type { HobbyCategoryRepository } from '../../ports/hobby-category.repository.port';

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
}
