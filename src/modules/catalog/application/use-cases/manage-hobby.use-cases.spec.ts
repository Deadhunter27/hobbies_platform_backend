import {
  HobbyCategoryNotFoundError,
  HobbySlugAlreadyExistsError,
  type HobbyCategoryProps,
  type HobbyProps,
} from '../../domain';
import { CreateHobbyUseCase, UpdateHobbyUseCase } from './manage-hobby.use-cases';
import { InMemoryHobbyCategoryRepository } from './test-support/in-memory-hobby-category.repository';
import { InMemoryHobbyRepository } from './test-support/in-memory-hobby.repository';

const now = new Date('2026-09-28T10:00:00.000Z');
const categoryId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

function categoryProps(): HobbyCategoryProps {
  return {
    id: categoryId,
    parentId: null,
    name: 'Sports',
    slug: 'sports',
    description: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function hobbyProps(overrides: Partial<HobbyProps> = {}): HobbyProps {
  return {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
    categoryId,
    name: 'Running',
    slug: 'running',
    description: null,
    difficulty: 'beginner_friendly',
    costLevel: 'low',
    setting: 'outdoor',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Catalog hobby management use cases', () => {
  function setup() {
    const hobbies = new InMemoryHobbyRepository();
    const categories = new InMemoryHobbyCategoryRepository();
    categories.seed([categoryProps()]);
    return {
      hobbies,
      categories,
      create: new CreateHobbyUseCase(hobbies, categories),
      update: new UpdateHobbyUseCase(hobbies, categories),
    };
  }

  it('creates hobbies as draft by default', async () => {
    const { create } = setup();

    const hobby = await create.execute(
      {
        categoryId,
        name: ' Running ',
        slug: 'running',
        description: 'Run outdoors',
        difficulty: 'beginner_friendly',
        costLevel: 'low',
        setting: 'outdoor',
      },
      now,
    );

    expect(hobby.name).toBe('Running');
    expect(hobby.status).toBe('draft');
  });

  it('requires an existing category', async () => {
    const { create } = setup();

    await expect(
      create.execute({
        categoryId: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
        name: 'Padel',
        slug: 'padel',
        description: null,
        difficulty: 'moderate',
        costLevel: 'medium',
        setting: 'outdoor',
      }),
    ).rejects.toBeInstanceOf(HobbyCategoryNotFoundError);
  });

  it('treats archived hobby slugs as reserved', async () => {
    const { hobbies, create } = setup();
    hobbies.seed([hobbyProps({ status: 'archived' })]);

    await expect(
      create.execute({
        categoryId,
        name: 'Running Again',
        slug: 'running',
        description: null,
        difficulty: 'beginner_friendly',
        costLevel: 'low',
        setting: 'outdoor',
      }),
    ).rejects.toBeInstanceOf(HobbySlugAlreadyExistsError);
  });

  it('can update an archived hobby because staff management uses the all-state seam', async () => {
    const { hobbies, update } = setup();
    const archived = hobbyProps({ status: 'archived' });
    hobbies.seed([archived]);

    const hobby = await update.execute(
      archived.id,
      {
        categoryId,
        name: 'Running',
        slug: 'running',
        description: 'Published again',
        difficulty: 'beginner_friendly',
        costLevel: 'low',
        setting: 'outdoor',
        status: 'active',
      },
      now,
    );

    expect(hobby.status).toBe('active');
    expect(hobby.description).toBe('Published again');
  });
});
