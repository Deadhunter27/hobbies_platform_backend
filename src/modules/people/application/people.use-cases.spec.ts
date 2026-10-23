import type { Actor, PolicyService } from '@modules/access';
import type { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import type { PublicProfileService } from '@modules/profile';
import {
  FollowUseCase,
  GetPersonUseCase,
  ListFollowsUseCase,
  PersonCards,
  SearchPeopleUseCase,
  SuggestPeopleUseCase,
} from './people.use-cases';
import type { FollowEdge, FollowRepository, PersonDirectory } from './ports/people.ports';

const A = '01HZZZZZZZZZZZZZZZZZZZZZA1';
const B = '01HZZZZZZZZZZZZZZZZZZZZZB1';
const C = '01HZZZZZZZZZZZZZZZZZZZZZC1';
const SUSPENDED = '01HZZZZZZZZZZZZZZZZZZZZZS1';
const HOBBY = '01HZZZZZZZZZZZZZZZZZZZZZH1';
const actor = (id: string) => ({ id, displayName: id }) as Actor;

class MemoryFollows implements FollowRepository {
  edges: Array<{ from: string; to: string; at: Date }> = [];
  async follow(from: string, to: string) {
    if (!this.edges.some((e) => e.from === from && e.to === to)) {
      this.edges.push({ from, to, at: new Date(Date.now() + this.edges.length) });
    }
  }
  async unfollow(from: string, to: string) {
    this.edges = this.edges.filter((e) => !(e.from === from && e.to === to));
  }
  async counts(id: string) {
    return {
      followers: this.edges.filter((e) => e.to === id).length,
      following: this.edges.filter((e) => e.from === id).length,
    };
  }
  async followedAmong(from: string, ids: string[]) {
    return new Set(
      this.edges.filter((e) => e.from === from && ids.includes(e.to)).map((e) => e.to),
    );
  }
  async followeeIds(from: string) {
    return this.edges.filter((e) => e.from === from).map((e) => e.to);
  }
  async list(
    id: string,
    direction: 'followers' | 'following',
    limit: number,
  ): Promise<FollowEdge[]> {
    return this.edges
      .filter((e) => (direction === 'followers' ? e.to === id : e.from === id))
      .sort((x, y) => y.at.getTime() - x.at.getTime())
      .slice(0, limit)
      .map((e) => ({ userId: direction === 'followers' ? e.from : e.to, createdAt: e.at }));
  }
}

function setup() {
  const names: Record<string, string> = { [A]: 'Alice', [B]: 'Bob', [C]: 'Cici' };
  const directory: PersonDirectory = {
    findActive: async (ids) =>
      ids.filter((id) => names[id]).map((id) => ({ id, displayName: names[id]! })),
    searchActive: async (q) =>
      Object.entries(names)
        .filter(([, name]) => name.toLowerCase().includes(q.toLowerCase()))
        .map(([id, displayName]) => ({ id, displayName })),
  };
  const handles: Record<string, string> = { [A]: 'alice.runs' };
  const profiles = {
    summaries: async (ids: string[]) =>
      new Map(ids.map((id) => [id, { userId: id, handle: handles[id] ?? null, avatarUrl: null }])),
    details: async (id: string) => ({
      userId: id,
      handle: handles[id] ?? null,
      avatarUrl: null,
      instagramHandle: 'alice.ig',
      tiktokHandle: null,
      hobbyIds: [HOBBY],
    }),
    userIdForHandle: async (h: string) =>
      Object.entries(handles).find(([, v]) => v === h.replace(/^@/, ''))?.[0] ?? null,
    searchHandles: async (q: string) =>
      Object.entries(handles)
        .filter(([, v]) => v.includes(q.replace(/^@/, '')))
        .map(([id]) => id),
    usersInHobby: async (_h: string, _l: number, exclude: string[]) =>
      [A, B, C, SUSPENDED].filter((id) => !exclude.includes(id)),
  } as unknown as PublicProfileService;
  const getHobby = {
    execute: async () => ({ id: HOBBY, name: 'Running', slug: 'running' }),
  } as unknown as GetHobbyUseCase;
  const policy = { can: async () => ({ allow: true }) } as unknown as PolicyService;
  const follows = new MemoryFollows();
  const cards = new PersonCards(directory, follows, profiles);
  return {
    follows,
    getPerson: new GetPersonUseCase(cards, profiles, getHobby, follows),
    search: new SearchPeopleUseCase(cards, profiles, directory),
    suggest: new SuggestPeopleUseCase(cards, profiles, follows),
    follow: new FollowUseCase(policy, directory, follows),
    list: new ListFollowsUseCase(cards, follows),
  };
}

describe('People', () => {
  it('opens a profile by @handle with public fields, hobbies and follow state', async () => {
    const { getPerson, follow } = setup();
    await follow.execute(actor(B), A, true);
    await follow.execute(actor(A), B, true);
    const profile = await getPerson.execute(actor(B), '@alice.runs');
    expect(profile).toMatchObject({
      id: A,
      displayName: 'Alice',
      handle: 'alice.runs',
      instagramHandle: 'alice.ig',
      hobbies: [{ name: 'Running' }],
      followerCount: 1,
      followingCount: 1,
      isFollowing: true,
      followsYou: true,
      isMe: false,
    });
  });

  it('returns 404 for unknown handles and inactive accounts', async () => {
    const { getPerson } = setup();
    await expect(getPerson.execute(null, 'nobody')).rejects.toMatchObject({
      code: 'PERSON_NOT_FOUND',
    });
    await expect(getPerson.execute(null, SUSPENDED)).rejects.toMatchObject({
      code: 'PERSON_NOT_FOUND',
    });
  });

  it('follows idempotently, refuses self-follow and unknown people, and unfollows', async () => {
    const { follow, follows } = setup();
    await follow.execute(actor(A), B, true);
    await follow.execute(actor(A), B, true);
    expect(follows.edges).toHaveLength(1);
    await expect(follow.execute(actor(A), A, true)).rejects.toMatchObject({
      code: 'CANNOT_FOLLOW_SELF',
    });
    await expect(follow.execute(actor(A), SUSPENDED, true)).rejects.toMatchObject({
      code: 'PERSON_NOT_FOUND',
    });
    await follow.execute(actor(A), B, false);
    expect(follows.edges).toHaveLength(0);
  });

  it('searches by handle and by name, without duplicates', async () => {
    const { search } = setup();
    const result = await search.execute(actor(B), 'ali', 10);
    expect(result.map((card) => card.id)).toEqual([A]);
    expect((await search.execute(null, 'b', 10)).map((card) => card.displayName)).toEqual(['Bob']);
  });

  it('suggests people in the hobby you do not follow yet, skipping yourself and inactive accounts', async () => {
    const { suggest, follow } = setup();
    await follow.execute(actor(A), B, true);
    const cards = await suggest.execute(actor(A), HOBBY, 10);
    expect(cards.map((card) => card.id)).toEqual([C]);
  });

  it('lists followers newest first', async () => {
    const { follow, list } = setup();
    await follow.execute(actor(B), A, true);
    await follow.execute(actor(C), A, true);
    const page = await list.execute(actor(B), A, 'followers', 10);
    expect(page.data.map((card) => card.id)).toEqual([C, B]);
    expect(page.data.find((card) => card.id === B)?.isMe).toBe(true);
  });
});
