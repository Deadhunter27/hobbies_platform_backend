import { ListHobbiesUseCase } from './list-hobbies.use-case';
import { InMemoryHobbyRepository } from './test-support/in-memory-hobby.repository';
import { makeHobbyProps } from './test-support/hobby-props.factory';

function setup() {
  const repository = new InMemoryHobbyRepository();
  repository.seed([
    makeHobbyProps({ name: 'Birdwatching', slug: 'birdwatching', difficulty: 'beginner_friendly' }),
    makeHobbyProps({ name: 'Hiking', slug: 'hiking', difficulty: 'beginner_friendly' }),
    makeHobbyProps({ name: 'Padel', slug: 'padel', difficulty: 'moderate' }),
    makeHobbyProps({ name: 'Pottery', slug: 'pottery', difficulty: 'moderate' }),
  ]);
  return { repository, useCase: new ListHobbiesUseCase(repository) };
}

describe('ListHobbiesUseCase', () => {
  it('paginates with a stable, resumable cursor', async () => {
    const { useCase } = setup();

    const first = await useCase.execute({ limit: 2 });
    expect(first.data.map((hobby) => hobby.name)).toEqual(['Birdwatching', 'Hiking']);
    expect(first.page.hasMore).toBe(true);
    expect(first.page.nextCursor).not.toBeNull();

    const second = await useCase.execute({ limit: 2, cursor: first.page.nextCursor! });
    expect(second.data.map((hobby) => hobby.name)).toEqual(['Padel', 'Pottery']);
    expect(second.page.hasMore).toBe(false);
    expect(second.page.nextCursor).toBeNull();
  });

  it('filters by repeatable difficulty', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ limit: 10, difficulty: ['moderate'] });

    expect(result.data.map((hobby) => hobby.name).sort()).toEqual(['Padel', 'Pottery']);
  });

  it('filters by free-text q on name', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ limit: 10, q: 'pot' });

    expect(result.data.map((hobby) => hobby.name)).toEqual(['Pottery']);
  });

  it('returns an empty page with hasMore false when nothing matches', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ limit: 10, q: 'no-such-hobby' });

    expect(result.data).toEqual([]);
    expect(result.page.hasMore).toBe(false);
    expect(result.page.nextCursor).toBeNull();
  });
});
