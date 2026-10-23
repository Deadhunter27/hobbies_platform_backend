import type { Actor } from '@modules/access';
import type { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import type { GetCommunityRoleUseCase } from '@modules/community';
import type { CreatorEligibilityService } from '@modules/profile';
import type { Activity } from '../domain';
import { SetActivityStatusUseCase } from './activity-status.use-case';
import { GetActivityUseCase } from './activity.use-cases';
import {
  CancelEventUseCase,
  CreateEventUseCase,
  type CreateEventInput,
} from './event-creation.use-cases';
import type { ActivityLifecycleRepository } from './ports/activity-lifecycle.repository.port';
import type { ActivityRepository } from './ports/activity.repository.port';

const HOBBY = '01HZZZZZZZZZZZZZZZZZZZZZH1';
const COMMUNITY = '01HZZZZZZZZZZZZZZZZZZZZZC1';
const host = { id: '01HZZZZZZZZZZZZZZZZZZZZZA1', displayName: 'Ayu' } as Actor;
const other = { id: '01HZZZZZZZZZZZZZZZZZZZZZB1', displayName: 'Budi' } as Actor;
const now = new Date('2026-10-24T00:00:00Z');

function setup(role: 'organizer' | 'host' | 'member' | null = null) {
  const store = new Map<string, Activity>();
  const repository = {
    create: async (activity: Activity) => {
      store.set(activity.id, activity);
    },
    findVisibleById: async (id: string) => {
      const activity = store.get(id);
      return activity && activity.status !== 'draft' ? { activity, committedCount: 0 } : null;
    },
  } as unknown as ActivityRepository;
  const lifecycle: ActivityLifecycleRepository = {
    findById: async (id) => store.get(id) ?? null,
    updateStatus: async ({ id, status }) => {
      const current = store.get(id)!;
      const { reconstitute } = (await import('../domain')).Activity;
      const next = reconstitute({ ...current.toProps(), status });
      store.set(id, next);
      return next;
    },
  };
  const getActivity = new GetActivityUseCase(repository);
  const eligibility = {
    assertCanCreate: async () => undefined,
  } as unknown as CreatorEligibilityService;
  const getHobby = { execute: async () => ({ id: HOBBY }) } as unknown as GetHobbyUseCase;
  const getRole = { execute: async () => role } as unknown as GetCommunityRoleUseCase;
  return {
    create: new CreateEventUseCase(eligibility, getHobby, getRole, repository, getActivity),
    cancel: new CancelEventUseCase(getActivity, new SetActivityStatusUseCase(lifecycle)),
  };
}

const input = (overrides: Partial<CreateEventInput> = {}): CreateEventInput => ({
  hobbyId: HOBBY,
  communityId: null,
  title: 'Sunday easy run',
  description: null,
  activityType: 'meetup',
  startsAt: new Date('2026-11-01T23:00:00Z'),
  endsAt: null,
  timezone: 'Asia/Jakarta',
  placeName: 'GBK',
  addressLabel: null,
  latitude: null,
  longitude: null,
  effortLevel: 'easy',
  capacity: 20,
  preparation: '',
  expectations: '',
  ...overrides,
});

describe('Person-created events', () => {
  it('publishes an event hosted by its creator', async () => {
    const view = await setup().create.execute(host, input(), now);
    expect(view.activity).toMatchObject({
      status: 'published',
      hostType: 'person',
      hostReferenceId: host.id,
      hostName: 'Ayu',
    });
    expect(view.availability).toBe('available');
  });

  it('refuses events that start in the past', async () => {
    await expect(
      setup().create.execute(host, input({ startsAt: new Date('2026-10-01T00:00:00Z') }), now),
    ).rejects.toMatchObject({ code: 'ACTIVITY_START_IN_PAST' });
  });

  it('needs an organizer or host to create an event inside a community', async () => {
    await expect(
      setup('member').create.execute(host, input({ communityId: COMMUNITY }), now),
    ).rejects.toMatchObject({ code: 'COMMUNITY_HOST_REQUIRED' });
    const view = await setup('organizer').create.execute(
      host,
      input({ communityId: COMMUNITY }),
      now,
    );
    expect(view.activity.communityReferenceId).toBe(COMMUNITY);
  });

  it('lets only the host cancel', async () => {
    const { create, cancel } = setup();
    const view = await create.execute(host, input(), now);
    await expect(cancel.execute(other, view.activity.id, now)).rejects.toMatchObject({
      code: 'NOT_ACTIVITY_HOST',
    });
    const cancelled = await cancel.execute(host, view.activity.id, now);
    expect(cancelled.availability).toBe('cancelled');
  });
});
