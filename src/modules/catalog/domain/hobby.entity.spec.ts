import { Hobby } from './hobby.entity';

function makeProps() {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    categoryId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
    name: 'Padel',
    slug: 'padel',
    description: null,
    difficulty: 'moderate' as const,
    costLevel: 'medium' as const,
    setting: 'outdoor' as const,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };
}

describe('Hobby', () => {
  it('reconstitutes with all persisted properties readable', () => {
    const props = makeProps();
    const hobby = Hobby.reconstitute(props);

    expect(hobby.id).toBe(props.id);
    expect(hobby.name).toBe('Padel');
    expect(hobby.slug).toBe('padel');
    expect(hobby.difficulty).toBe('moderate');
    expect(hobby.isActive).toBe(true);
  });

  it('isActive is false for non-active statuses', () => {
    const hobby = Hobby.reconstitute({ ...makeProps(), status: 'draft' });
    expect(hobby.isActive).toBe(false);
  });

  it('two entities with the same id are equal', () => {
    const props = makeProps();
    const a = Hobby.reconstitute(props);
    const b = Hobby.reconstitute({ ...props, name: 'Different name' });
    expect(a.equals(b)).toBe(true);
  });
});
