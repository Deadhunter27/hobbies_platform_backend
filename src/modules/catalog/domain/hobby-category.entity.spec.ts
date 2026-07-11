import { HobbyCategory } from './hobby-category.entity';

function makeProps() {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    parentId: null,
    name: 'Sports & Movement',
    slug: 'sports-and-movement',
    description: 'Hobbies built around physical activity.',
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe('HobbyCategory', () => {
  it('reconstitutes with all persisted properties readable', () => {
    const props = makeProps();
    const category = HobbyCategory.reconstitute(props);

    expect(category.id).toBe(props.id);
    expect(category.name).toBe('Sports & Movement');
    expect(category.slug).toBe('sports-and-movement');
    expect(category.parentId).toBeNull();
    expect(category.sortOrder).toBe(1);
  });
});
