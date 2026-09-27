import { Activity } from './activity.entity';

const base = {
  id: '01K6A000000000000000000001',
  hobbyId: '01K6A000000000000000000099',
  title: 'Sunday Social 5K',
  description: null,
  activityType: 'group_run',
  startsAt: new Date('2026-10-04T00:00:00.000Z'),
  endsAt: new Date('2026-10-04T01:00:00.000Z'),
  timezone: 'Asia/Jakarta',
  placeName: 'GBK Main Gate',
  addressLabel: null,
  latitude: -6.218,
  longitude: 106.802,
  hostName: 'Jakarta Runners',
  hostType: 'community',
  hostReferenceId: null,
  communityReferenceId: null,
  effortLevel: 'easy' as const,
  capacity: 30,
  status: 'published' as const,
  preparation: 'Bring water.',
  expectations: 'Relaxed social run.',
  createdAt: new Date('2026-09-27T00:00:00.000Z'),
  updatedAt: new Date('2026-09-27T00:00:00.000Z'),
};

describe('Activity', () => {
  it('accepts commitment only while published and ahead of the user', () => {
    const activity = Activity.reconstitute(base);
    expect(activity.canAcceptCommitment(new Date('2026-10-03T00:00:00.000Z'))).toBe(true);
    expect(activity.canAcceptCommitment(new Date('2026-10-05T00:00:00.000Z'))).toBe(false);
  });

  it('rejects an invalid time window', () => {
    expect(() => Activity.reconstitute({ ...base, endsAt: base.startsAt })).toThrow(
      'Activity end time must be after the start time.',
    );
  });
});
