import { isValidUlid } from '@shared/utils';
import { Hobby, type HobbyProps } from '../../../domain';
import type {
  HobbyRepository,
  ListHobbiesQuery,
  ListHobbiesResult,
} from '../../ports/hobby.repository.port';

function propsOf(hobby: Hobby): HobbyProps {
  return {
    id: hobby.id,
    categoryId: hobby.categoryId,
    name: hobby.name,
    slug: hobby.slug,
    description: hobby.description,
    difficulty: hobby.difficulty,
    costLevel: hobby.costLevel,
    setting: hobby.setting,
    status: hobby.status,
    createdAt: hobby.createdAt,
    updatedAt: hobby.updatedAt,
  };
}

export class InMemoryHobbyRepository implements HobbyRepository {
  private readonly records: HobbyProps[] = [];

  seed(records: HobbyProps[]): void {
    this.records.push(...records);
  }

  async list(query: ListHobbiesQuery): Promise<ListHobbiesResult> {
    let filtered = this.records.filter((record) => record.status === 'active');

    if (query.filter.categorySlug) {
      filtered = filtered.filter((record) => record.categoryId === query.filter.categorySlug);
    }

    if (query.filter.difficulty && query.filter.difficulty.length > 0) {
      filtered = filtered.filter((record) => query.filter.difficulty!.includes(record.difficulty));
    }

    if (query.filter.q) {
      const needle = query.filter.q.toLowerCase();
      filtered = filtered.filter((record) => record.name.toLowerCase().includes(needle));
    }

    filtered = [...filtered].sort(
      (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    );

    if (query.cursor) {
      const { name, id } = query.cursor;
      filtered = filtered.filter(
        (record) =>
          record.name.localeCompare(name) > 0 ||
          (record.name === name && record.id.localeCompare(id) > 0),
      );
    }

    const withLookahead = filtered.slice(0, query.limit + 1);
    const hasMore = withLookahead.length > query.limit;
    const items = withLookahead.slice(0, query.limit).map((props) => Hobby.reconstitute(props));

    return { items, hasMore };
  }

  async findBySlugOrId(slugOrId: string): Promise<Hobby | null> {
    const found = this.records.find((record) => {
      if (record.status !== 'active') return false;
      return isValidUlid(slugOrId) ? record.id === slugOrId : record.slug === slugOrId;
    });
    return found ? Hobby.reconstitute(found) : null;
  }

  async findAnyById(id: string): Promise<Hobby | null> {
    const found = this.records.find((record) => record.id === id);
    return found ? Hobby.reconstitute(found) : null;
  }

  async findAnyBySlug(slug: string): Promise<Hobby | null> {
    const found = this.records.find((record) => record.slug === slug);
    return found ? Hobby.reconstitute(found) : null;
  }

  async create(hobby: Hobby): Promise<Hobby> {
    this.records.push(propsOf(hobby));
    return hobby;
  }

  async update(hobby: Hobby): Promise<Hobby> {
    const index = this.records.findIndex((record) => record.id === hobby.id);
    if (index >= 0) this.records[index] = propsOf(hobby);
    return hobby;
  }
}
