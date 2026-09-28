import { ActivityCommitment } from './activity-commitment.entity';

describe('ActivityCommitment', () => {
  const now = new Date('2026-09-27T00:00:00.000Z');

  it('keeps commitment separate from completion and can later be marked missed', () => {
    const commitment = ActivityCommitment.start(
      {
        id: '01K6A000000000000000000011',
        userId: '01K6A000000000000000000012',
        activityId: '01K6A000000000000000000013',
        state: 'committed',
        note: null,
      },
      now,
    );
    expect(commitment.state).toBe('committed');
    expect(commitment.committedAt).toEqual(now);
    expect(commitment.completedAt).toBeNull();

    const missed = commitment.transition('missed', null, new Date('2026-10-05T00:00:00.000Z'));
    expect(missed.state).toBe('missed');
    expect(missed.missedAt).not.toBeNull();
    expect(missed.completedAt).toBeNull();
  });

  it('can mark a committed real-world activity completed without rewriting the commitment time', () => {
    const commitment = ActivityCommitment.start(
      {
        id: '01K6A000000000000000000021',
        userId: '01K6A000000000000000000022',
        activityId: '01K6A000000000000000000023',
        state: 'committed',
        note: null,
      },
      now,
    );
    const completedAt = new Date('2026-09-28T02:00:00.000Z');
    const completed = commitment.transition('completed', 'Felt good.', completedAt);

    expect(completed.state).toBe('completed');
    expect(completed.committedAt).toEqual(now);
    expect(completed.completedAt).toEqual(completedAt);
    expect(completed.note).toBe('Felt good.');
  });

  it('does not allow an interested record to be marked missed directly', () => {
    const commitment = ActivityCommitment.start(
      {
        id: '01K6A000000000000000000011',
        userId: '01K6A000000000000000000012',
        activityId: '01K6A000000000000000000013',
        state: 'interested',
        note: null,
      },
      now,
    );
    expect(() => commitment.transition('missed', null)).toThrow(
      'Only a committed activity can be marked missed.',
    );
    expect(() => commitment.transition('completed', null)).toThrow(
      'Only a committed activity can be marked completed.',
    );
  });
});
