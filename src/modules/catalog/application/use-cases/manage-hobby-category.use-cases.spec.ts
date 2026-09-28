import {
  HobbyCategoryHierarchyError,
  HobbyCategoryNotFoundError,
  HobbyCategorySlugAlreadyExistsError,
  type HobbyCategoryProps,
} from '../../domain';
import {
  CreateHobbyCategoryUseCase,
  UpdateHobbyCategoryUseCase,
} from './manage-hobby-category.use-cases';
import { InMemoryHobbyCategoryRepository } from './test-support/in-memory-hobby-category.repository';

const now = new Date('2026-09-28T10:00:00.000Z');

function categoryProps(overrides: Partial<HobbyCategoryProps> = {}): HobbyCategoryProps {
  return {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    parentId: null,
    name: 'Sports',
    slug: 'sports',
    description: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Catalog category management use cases', () => {
  it('creates a category through the Catalog-owned repository', async () => {
    const repository = new InMemoryHobbyCategoryRepository();
    const useCase = new CreateHobbyCategoryUseCase(repository);

    const category = await useCase.execute(
      {
        parentId: null,
        name: ' Outdoor ',
        slug: 'outdoor',
        description: null,
        sortOrder: 10,
      },
      now,
    );

    expect(category.name).toBe('Outdoor');
    expect(category.slug).toBe('outdoor');
    expect(await repository.findById(category.id)).not.toBeNull();
  });

  it('rejects duplicate category slugs', async () => {
    const repository = new InMemoryHobbyCategoryRepository();
    repository.seed([categoryProps()]);
    const useCase = new CreateHobbyCategoryUseCase(repository);

    await expect(
      useCase.execute({
        parentId: null,
        name: 'Other',
        slug: 'sports',
        description: null,
        sortOrder: 1,
      }),
    ).rejects.toBeInstanceOf(HobbyCategorySlugAlreadyExistsError);
  });

  it('requires an existing parent category', async () => {
    const repository = new InMemoryHobbyCategoryRepository();
    const useCase = new CreateHobbyCategoryUseCase(repository);

    await expect(
      useCase.execute({
        parentId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
        name: 'Road Running',
        slug: 'road-running',
        description: null,
        sortOrder: 1,
      }),
    ).rejects.toBeInstanceOf(HobbyCategoryNotFoundError);
  });

  it('rejects a hierarchy update that would create a cycle', async () => {
    const repository = new InMemoryHobbyCategoryRepository();
    const parentId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
    const childId = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
    repository.seed([
      categoryProps({ id: parentId }),
      categoryProps({
        id: childId,
        parentId,
        name: 'Running',
        slug: 'running',
        sortOrder: 1,
      }),
    ]);
    const useCase = new UpdateHobbyCategoryUseCase(repository);

    await expect(
      useCase.execute(parentId, {
        parentId: childId,
        name: 'Sports',
        slug: 'sports',
        description: null,
        sortOrder: 0,
      }),
    ).rejects.toBeInstanceOf(HobbyCategoryHierarchyError);
  });
});
