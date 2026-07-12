import { isValidUlid } from '@shared/utils';
import { Hobby, type HobbyProps } from '../../../domain';
import type {
  HobbyRepository,
  ListHobbiesQuery,
  ListHobbiesResult,
} from '../../ports/hobby.repository.port';

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
      // Same comparator as the sort above — mixing localeCompare ordering
      // with code-point > comparisons would skew pages for non-ASCII names.
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
}
