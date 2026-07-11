import { ListHobbyCategoriesUseCase } from './list-hobby-categories.use-case';
import { InMemoryHobbyCategoryRepository } from './test-support/in-memory-hobby-category.repository';
import { makeCategoryProps } from './test-support/hobby-props.factory';

describe('ListHobbyCategoriesUseCase', () => {
  it('returns categories ordered by sortOrder then id', async () => {
    const repository = new InMemoryHobbyCategoryRepository();
    repository.seed([
      makeCategoryProps({ id: '01AAAAAAAAAAAAAAAAAAAAAAAB', slug: 'b', sortOrder: 2 }),
      makeCategoryProps({ id: '01AAAAAAAAAAAAAAAAAAAAAAAA', slug: 'a', sortOrder: 1 }),
    ]);
    const useCase = new ListHobbyCategoriesUseCase(repository);

    const result = await useCase.execute();

    expect(result.map((category) => category.slug)).toEqual(['a', 'b']);
  });

  it('returns an empty list when there are no categories', async () => {
    const repository = new InMemoryHobbyCategoryRepository();
    const useCase = new ListHobbyCategoriesUseCase(repository);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
