import { Recommendation } from './recommendation.entity';

const NOW = new Date('2026-09-27T12:00:00.000Z');

function createRecommendation() {
  return Recommendation.create(
    {
      id: '01J00000000000000000000100',
      userId: '01J00000000000000000000101',
      hobbyId: '01J00000000000000000000102',
      activityId: '01J00000000000000000000103',
      title: '20-minute easy run/walk',
      rationale: 'A smaller step fits your returning context.',
      fitSignals: ['Lower-pressure effort matches your current intent.'],
      intent: 'start',
    },
    NOW,
  );
}

describe('Recommendation', () => {
  it('creates an active explainable recommendation', () => {
    const recommendation = createRecommendation();

    expect(recommendation.status).toBe('active');
    expect(recommendation.fitSignals).toEqual([
      'Lower-pressure effort matches your current intent.',
    ]);
    expect(recommendation.selectedActivityId).toBeNull();
  });

  it('requires at least one fit signal', () => {
    expect(() =>
      Recommendation.create({
        id: '01J00000000000000000000110',
        userId: '01J00000000000000000000111',
        hobbyId: '01J00000000000000000000112',
        activityId: '01J00000000000000000000113',
        title: 'Unexplained suggestion',
        rationale: 'No signal.',
        fitSignals: [],
        intent: 'start',
      }),
    ).toThrow(expect.objectContaining({ code: 'RECOMMENDATION_MISSING_FIT_SIGNAL' }));
  });

  it('records rejection without mutating the original instance', () => {
    const original = createRecommendation();
    const rejected = original.reject('too_difficult', 'Not ready for 5K yet.', NOW);

    expect(original.status).toBe('active');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('too_difficult');
    expect(rejected.rejectionNote).toBe('Not ready for 5K yet.');
  });

  it('records the activity actually selected', () => {
    const selected = createRecommendation().select('01J00000000000000000000103', NOW);

    expect(selected.status).toBe('selected');
    expect(selected.selectedActivityId).toBe('01J00000000000000000000103');
  });

  it('does not allow an already-rejected recommendation to be selected', () => {
    const rejected = createRecommendation().reject('prefer_solo', null, NOW);

    expect(() => rejected.select('01J00000000000000000000103', NOW)).toThrow(
      expect.objectContaining({ code: 'RECOMMENDATION_NOT_ACTIVE' }),
    );
  });
});
