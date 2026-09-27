import type { ActivityView } from '@modules/activity';
import { Activity } from '@modules/activity/domain';
import { HobbyContext } from '@modules/profile/domain';
import { rankActivities } from './recommendation-policy';

const NOW = new Date('2026-09-27T12:00:00.000Z');
const HOBBY_ID = '01J00000000000000000000200';

function context(overrides: Partial<Parameters<typeof HobbyContext.create>[0]> = {}) {
  return HobbyContext.create({
    id: '01J00000000000000000000201',
    userId: '01J00000000000000000000202',
    hobbyId: HOBBY_ID,
    experienceLevel: 'returning',
    primaryIntent: 'start',
    secondaryIntents: [],
    goal: null,
    socialPreference: 'mixed',
    ...overrides,
  });
}

function activity(
  id: string,
  overrides: Partial<Parameters<typeof Activity.reconstitute>[0]> = {},
  availability: ActivityView['availability'] = 'available',
): ActivityView {
  const entity = Activity.reconstitute({
    id,
    hobbyId: HOBBY_ID,
    title: `Activity ${id.slice(-2)}`,
    description: null,
    activityType: 'easy_run',
    startsAt: new Date('2026-09-28T00:00:00.000Z'),
    endsAt: new Date('2026-09-28T01:00:00.000Z'),
    timezone: 'Asia/Jakarta',
    placeName: 'GBK',
    addressLabel: 'Jakarta',
    latitude: null,
    longitude: null,
    hostName: null,
    hostType: null,
    hostReferenceId: null,
    communityReferenceId: null,
    effortLevel: 'easy',
    capacity: null,
    status: 'published',
    preparation: 'Keep it comfortable.',
    expectations: 'Walking breaks are fine.',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });
  return { activity: entity, committedCount: 0, spotsRemaining: null, availability };
}

describe('rankActivities', () => {
  it('prefers a lower-pressure activity for a returning start context', () => {
    const easy = activity('01J00000000000000000000210');
    const hard = activity('01J00000000000000000000211', { effortLevel: 'challenging' });

    const ranked = rankActivities(context(), [hard, easy]);

    expect(ranked[0]?.view.activity.id).toBe(easy.activity.id);
    expect(ranked[0]?.fitSignals.length).toBeGreaterThan(0);
  });

  it('prefers visible host/community context for a social intent', () => {
    const solo = activity('01J00000000000000000000220');
    const social = activity('01J00000000000000000000221', {
      hostName: 'Rani',
      communityReferenceId: '01J00000000000000000000222',
    });

    const ranked = rankActivities(
      context({ primaryIntent: 'social', socialPreference: 'social', experienceLevel: 'regular' }),
      [solo, social],
    );

    expect(ranked[0]?.view.activity.id).toBe(social.activity.id);
  });

  it('prefers moderate structured activity for improve intent', () => {
    const easy = activity('01J00000000000000000000230');
    const structured = activity('01J00000000000000000000231', {
      effortLevel: 'moderate',
      activityType: 'pacing_session',
    });

    const ranked = rankActivities(
      context({ primaryIntent: 'improve', experienceLevel: 'regular' }),
      [easy, structured],
    );

    expect(ranked[0]?.view.activity.id).toBe(structured.activity.id);
  });

  it('recovery for too difficult prefers easier activity and excludes the rejected activity', () => {
    const rejected = activity('01J00000000000000000000240', { effortLevel: 'challenging' });
    const easier = activity('01J00000000000000000000241', { effortLevel: 'easy' });
    const moderate = activity('01J00000000000000000000242', { effortLevel: 'moderate' });

    const ranked = rankActivities(context(), [rejected, moderate, easier], {
      rejectionReason: 'too_difficult',
      excludeActivityIds: [rejected.activity.id],
    });

    expect(ranked.map((entry) => entry.view.activity.id)).not.toContain(rejected.activity.id);
    expect(ranked[0]?.view.activity.id).toBe(easier.activity.id);
  });

  it('recovery for prefer solo deprioritizes community-linked activities', () => {
    const community = activity('01J00000000000000000000250', {
      hostName: 'Rani',
      communityReferenceId: '01J00000000000000000000251',
    });
    const solo = activity('01J00000000000000000000252');

    const ranked = rankActivities(context(), [community, solo], {
      rejectionReason: 'prefer_solo',
    });

    expect(ranked[0]?.view.activity.id).toBe(solo.activity.id);
  });

  it('never returns unavailable candidates', () => {
    const full = activity('01J00000000000000000000260', {}, 'full');
    const available = activity('01J00000000000000000000261');

    const ranked = rankActivities(context(), [full, available]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.view.activity.id).toBe(available.activity.id);
  });
});
