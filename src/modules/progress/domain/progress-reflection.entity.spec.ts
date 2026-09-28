import { ProgressReflection } from './progress-reflection.entity';

describe('ProgressReflection', () => {
  const now = new Date('2026-09-28T02:00:00.000Z');
  const base = {
    id: '01K6A000000000000000000101',
    userId: '01K6A000000000000000000102',
    hobbyId: '01K6A000000000000000000103',
    activityId: '01K6A000000000000000000104',
    occurredAt: now,
  };

  it('accepts qualitative progress without requiring performance metrics', () => {
    const reflection = ProgressReflection.create(
      {
        ...base,
        rating: 4,
        tags: [' Proud I showed up ', 'Easier than expected'],
        note: 'First run back in months.',
      },
      now,
    );

    expect(reflection.rating).toBe(4);
    expect(reflection.tags).toEqual(['Proud I showed up', 'Easier than expected']);
    expect(reflection.note).toBe('First run back in months.');
  });

  it('deduplicates tags and preserves the original occurredAt when revised', () => {
    const reflection = ProgressReflection.create(
      { ...base, rating: null, tags: ['Connected'], note: null },
      now,
    );
    const revisedAt = new Date('2026-09-28T03:00:00.000Z');
    const revised = reflection.revise(
      { rating: 5, tags: ['Connected', 'Connected', 'Met someone new'], note: null },
      revisedAt,
    );

    expect(revised.tags).toEqual(['Connected', 'Met someone new']);
    expect(revised.occurredAt).toEqual(now);
    expect(revised.updatedAt).toEqual(revisedAt);
  });

  it('rejects an empty reflection', () => {
    expect(() =>
      ProgressReflection.create({ ...base, rating: null, tags: [], note: null }, now),
    ).toThrow(expect.objectContaining({ code: 'PROGRESS_EMPTY_REFLECTION' }));
  });

  it('rejects ratings outside 1 to 5', () => {
    expect(() =>
      ProgressReflection.create({ ...base, rating: 6, tags: [], note: null }, now),
    ).toThrow(expect.objectContaining({ code: 'PROGRESS_INVALID_RATING' }));
  });
});
