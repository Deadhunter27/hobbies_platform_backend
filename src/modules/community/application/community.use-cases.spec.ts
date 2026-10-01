import type { Actor } from '@modules/access';
import type { CommunityContext, CommunityMembership } from '../domain';
import { CommunityMembershipNotFoundError, CommunityNotFoundError } from '../domain';
import { CommunityAuthorization } from './authorization';
import {
  GetCommunityContextUseCase,
  UpsertMyCommunityMembershipUseCase,
} from './community.use-cases';
import type { CommunityRepository } from './ports/community.repository.port';

const actor: Actor = {
  id: '01K6U000000000000000000001',
  email: 'runner@example.com',
  displayName: 'Runner One',
  status: 'active',
  globalRole: 'user',
  sessionId: '01K6S000000000000000000001',
};

const community = {
  id: '01K6C000000000000000000001',
  hobbyId: '01K6H000000000000000000001',
  name: 'Jakarta Runners',
  slug: 'jakarta-runners',
  description: 'A welcoming running community.',
  city: 'Jakarta',
  countryCode: 'ID',
  status: 'published' as const,
  createdAt: new Date('2026-09-28T00:00:00Z'),
  updatedAt: new Date('2026-09-28T00:00:00Z'),
};

function repository(overrides: Partial<CommunityRepository> = {}): CommunityRepository {
  return {
    findPublishedBySlugOrId: jest.fn().mockResolvedValue(community),
    getContext: jest.fn().mockResolvedValue({
      community,
      people: { memberCount: 1, hosts: [], membersPreview: [] },
    } satisfies CommunityContext),
    findMembership: jest.fn().mockResolvedValue(null),
    listMembershipsByUser: jest.fn().mockResolvedValue([]),
    saveMembership: jest.fn(async (input) => input satisfies CommunityMembership),
    ...overrides,
  };
}

const authorization = {
  assertCanReadOwnMemberships: jest.fn().mockResolvedValue(undefined),
  assertCanUpdateOwnMemberships: jest.fn().mockResolvedValue(undefined),
} as unknown as CommunityAuthorization;

describe('W7 community use cases', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns published community context with people/trust data', async () => {
    const repo = repository();
    const useCase = new GetCommunityContextUseCase(repo);

    const result = await useCase.execute('jakarta-runners');

    expect(result.community.id).toBe(community.id);
    expect(result.people.memberCount).toBe(1);
    expect(result.people.membersPreview).toEqual([]);
    expect(repo.getContext).toHaveBeenCalledWith(community.id);
  });

  it('does not fabricate context for an unknown community', async () => {
    const repo = repository({ findPublishedBySlugOrId: jest.fn().mockResolvedValue(null) });
    const useCase = new GetCommunityContextUseCase(repo);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(CommunityNotFoundError);
  });

  it('creates a self membership as member using the actor display-name snapshot', async () => {
    const repo = repository();
    const useCase = new UpsertMyCommunityMembershipUseCase(authorization, repo);
    const now = new Date('2026-09-28T03:00:00Z');

    const result = await useCase.execute(actor, community.id, { state: 'active' }, now);

    expect(result.role).toBe('member');
    expect(result.displayNameSnapshot).toBe(actor.displayName);
    expect(result.joinedAt).toEqual(now);
    expect(repo.saveMembership).toHaveBeenCalled();
  });

  it('requires an existing membership before leaving', async () => {
    const repo = repository({ findMembership: jest.fn().mockResolvedValue(null) });
    const useCase = new UpsertMyCommunityMembershipUseCase(authorization, repo);

    await expect(
      useCase.execute(actor, community.id, { state: 'left' }, new Date()),
    ).rejects.toBeInstanceOf(CommunityMembershipNotFoundError);
  });
});
